import { ItemView, Keymap, TFile, WorkspaceLeaf, debounce } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import type { NoteRecord } from "../graph/model";
import { collectNotes } from "../lib/notes";
import { activeProjectFile, projectsPath, referencesPath, tasksPath } from "../lib/vault";
import { CreateTaskModal } from "../modals/CreateTaskModal";

export const PROJECT_PANEL_VIEW_TYPE = "simpromana-project-panel";

const STATUS_ORDER = ["Doing", "Review", "Todo", "Done", "Archive", "Archived"];

function statusRank(status: string): number {
	const index = STATUS_ORDER.indexOf(status);
	return index === -1 ? STATUS_ORDER.length : index;
}

export class ProjectPanelView extends ItemView {
	private projectFile: TFile | null = null;
	private headerEl: HTMLElement;
	private bodyEl: HTMLElement;

	constructor(leaf: WorkspaceLeaf, private settings: SimpromanaSettings) {
		super(leaf);
	}

	getViewType(): string {
		return PROJECT_PANEL_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Project panel";
	}

	getIcon(): string {
		return "layout-list";
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("spm-panel");

		this.headerEl = root.createDiv({ cls: "spm-panel-header" });
		this.bodyEl = root.createDiv({ cls: "spm-panel-body" });

		const refresh = debounce(() => this.render(), 200, true);
		this.registerEvent(this.app.workspace.on("active-leaf-change", refresh));
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				if (this.isRelevant(file.path)) refresh();
			})
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (this.isRelevant(file.path) || this.isRelevant(oldPath)) refresh();
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (this.isRelevant(file.path)) refresh();
			})
		);

		this.render();
	}

	async onClose(): Promise<void> {}

	private isRelevant(path: string): boolean {
		return (
			path.startsWith(`${tasksPath(this.settings)}/`) ||
			path.startsWith(`${referencesPath(this.settings)}/`) ||
			path.startsWith(`${projectsPath(this.settings)}/`)
		);
	}

	private render(): void {
		this.projectFile = activeProjectFile(this.app, this.settings);
		this.headerEl.empty();
		this.bodyEl.empty();

		if (!this.projectFile) {
			this.bodyEl.createDiv({
				cls: "spm-panel-empty",
				text: "Open a project note to see its panel.",
			});
			return;
		}

		const projectFile = this.projectFile;
		this.headerEl.createEl("h3", { text: projectFile.basename });
		this.renderNewTaskButton(projectFile);

		const records = collectNotes(this.app, this.settings, { references: true });
		const tasks = records.filter(
			(record) => record.kind === "task" && record.projectPath === projectFile.path
		);
		const references = records.filter(
			(record) => record.kind === "reference" && record.projectPath === projectFile.path
		);

		this.renderProgress(tasks);

		if (tasks.length === 0) {
			this.bodyEl.createDiv({ cls: "spm-panel-empty", text: "No tasks in this project yet." });
		} else {
			this.renderTaskGroups(tasks);
		}

		this.renderReferences(references);
	}

	private renderProgress(tasks: NoteRecord[]): void {
		const counted = tasks.filter((task) => task.status !== "Archive" && task.status !== "Archived");
		if (counted.length === 0) return;

		const done = counted.filter((task) => task.status === "Done").length;
		const percent = Math.round((done / counted.length) * 100);

		const wrap = this.bodyEl.createDiv({ cls: "spm-panel-progress" });
		wrap.createDiv({
			cls: "spm-panel-progress-label",
			text: `${done} / ${counted.length} done`,
		});
		const track = wrap.createDiv({ cls: "spm-panel-progress-track" });
		const fill = track.createDiv({ cls: "spm-panel-progress-fill" });
		fill.style.width = `${percent}%`;
	}

	private renderReferences(references: NoteRecord[]): void {
		if (references.length === 0) return;

		const section = this.bodyEl.createDiv({ cls: "spm-panel-group" });
		section.createEl("h4", { text: `References (${references.length})` });
		const list = section.createEl("ul", { cls: "spm-panel-list" });
		for (const reference of references.sort((a, b) => a.title.localeCompare(b.title))) {
			this.renderNoteItem(list, reference);
		}
	}

	private renderNewTaskButton(projectFile: TFile): void {
		const button = this.headerEl.createEl("button", {
			cls: "spm-panel-new-task",
			text: "+ New task",
		});
		button.addEventListener("click", () => {
			new CreateTaskModal(this.app, this.settings, projectFile).open();
		});
	}

	private renderTaskGroups(tasks: NoteRecord[]): void {
		const groups = new Map<string, NoteRecord[]>();
		for (const task of tasks) {
			const key = task.status || "Todo";
			const bucket = groups.get(key) ?? [];
			bucket.push(task);
			groups.set(key, bucket);
		}

		const orderedKeys = [...groups.keys()].sort((a, b) => {
			const rank = statusRank(a) - statusRank(b);
			return rank !== 0 ? rank : a.localeCompare(b);
		});

		for (const status of orderedKeys) {
			const items = groups.get(status)!.sort((a, b) => a.title.localeCompare(b.title));
			const section = this.bodyEl.createDiv({ cls: "spm-panel-group" });
			section.createEl("h4", { text: `${status} (${items.length})` });
			const list = section.createEl("ul", { cls: "spm-panel-list" });
			for (const task of items) {
				this.renderNoteItem(list, task);
			}
		}
	}

	private renderNoteItem(list: HTMLElement, record: NoteRecord): void {
		const item = list.createEl("li", { cls: "spm-panel-item" });
		const link = item.createEl("a", { cls: "spm-panel-link", text: record.title, href: "#" });
		link.addEventListener("click", (event) => {
			event.preventDefault();
			this.openNote(record.path, event);
		});
	}

	private openNote(path: string, event: MouseEvent): void {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;
		const leaf = this.app.workspace.getLeaf(Keymap.isModEvent(event));
		leaf.openFile(file);
	}
}
