import { ItemView, Keymap, Notice, TFile, ViewStateResult, WorkspaceLeaf, debounce } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import type { NoteRecord } from "../graph/model";
import { collectNotes, projectFiles } from "../lib/notes";
import { projectsPath, tasksPath } from "../lib/vault";

export const BOARD_VIEW_TYPE = "simpromana-board";

const COLUMNS = ["Todo", "Doing", "Review", "Done"] as const;
type Column = (typeof COLUMNS)[number];

export interface BoardViewState extends Record<string, unknown> {
	projectPath?: string;
}

export class BoardView extends ItemView {
	private records: NoteRecord[] = [];
	private projectPath: string | null = null;
	private projectSelect: HTMLSelectElement;
	private columnsEl: HTMLElement;
	private emptyEl: HTMLElement;

	constructor(leaf: WorkspaceLeaf, private settings: SimpromanaSettings) {
		super(leaf);
	}

	getViewType(): string {
		return BOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Board";
	}

	getIcon(): string {
		return "layout-list";
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("spm-board");

		this.buildToolbar(root.createDiv({ cls: "spm-board-toolbar" }));
		this.columnsEl = root.createDiv({ cls: "spm-board-columns" });
		this.emptyEl = root.createDiv({ cls: "spm-board-empty" });

		const refresh = debounce(() => this.refresh(), 400, true);
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

		this.refresh();
	}

	async onClose(): Promise<void> {}

	getState(): Record<string, unknown> {
		return { projectPath: this.projectPath ?? undefined };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const next = (state ?? {}) as BoardViewState;
		if (typeof next.projectPath === "string") this.projectPath = next.projectPath;
		await super.setState(state, result);
		if (this.columnsEl) {
			this.syncProjectSelect();
			this.renderBoard();
		}
	}

	private isRelevant(path: string): boolean {
		return (
			path.startsWith(`${tasksPath(this.settings)}/`) ||
			path.startsWith(`${projectsPath(this.settings)}/`)
		);
	}

	private buildToolbar(toolbar: HTMLElement): void {
		this.projectSelect = toolbar.createEl("select", {
			cls: "dropdown spm-board-project",
			attr: { "aria-label": "Filter by project" },
		});
		this.projectSelect.addEventListener("change", () => {
			this.projectPath = this.projectSelect.value || null;
			this.app.workspace.requestSaveLayout();
			this.renderBoard();
		});
	}

	private syncProjectSelect(): void {
		const projects = projectFiles(this.app, this.settings);
		const current = this.projectPath;
		this.projectSelect.empty();
		this.projectSelect.createEl("option", { value: "", text: "Todos" });
		for (const file of projects) {
			this.projectSelect.createEl("option", { value: file.path, text: file.basename });
		}
		this.projectPath = current && projects.some((file) => file.path === current) ? current : null;
		this.projectSelect.value = this.projectPath ?? "";
	}

	private refresh(): void {
		this.records = collectNotes(this.app, this.settings, { references: false });
		this.syncProjectSelect();
		this.renderBoard();
	}

	private renderBoard(): void {
		this.columnsEl.empty();
		const filtered = this.projectPath
			? this.records.filter((record) => record.projectPath === this.projectPath)
			: this.records;

		for (const column of COLUMNS) {
			this.columnsEl.appendChild(this.renderColumn(column, filtered));
		}

		this.emptyEl.toggle(filtered.length === 0);
		if (filtered.length === 0) this.emptyEl.setText("No tasks found.");
	}

	private renderColumn(column: Column, filtered: NoteRecord[]): HTMLElement {
		const cards = filtered.filter((record) => record.status.toLowerCase() === column.toLowerCase());

		const columnEl = createDiv({ cls: "spm-board-column" });
		const header = columnEl.createDiv({ cls: "spm-board-column-header" });
		header.createSpan({ cls: "spm-board-column-title", text: column });
		header.createSpan({ cls: "spm-board-column-count", text: String(cards.length) });

		const list = columnEl.createDiv({ cls: "spm-board-column-list" });
		list.addEventListener("dragover", (event) => {
			event.preventDefault();
			list.addClass("is-drag-over");
		});
		list.addEventListener("dragleave", () => list.removeClass("is-drag-over"));
		list.addEventListener("drop", (event) => {
			event.preventDefault();
			list.removeClass("is-drag-over");
			const path = event.dataTransfer?.getData("text/plain");
			if (path) void this.moveTask(path, column);
		});

		for (const record of cards) {
			list.appendChild(this.renderCard(record));
		}
		return columnEl;
	}

	private renderCard(record: NoteRecord): HTMLElement {
		const card = createDiv({ cls: "spm-board-card" });
		card.dataset.path = record.path;
		card.draggable = true;

		card.createDiv({ cls: "spm-board-card-title", text: record.title });

		const meta = card.createDiv({ cls: "spm-board-card-meta" });
		if (record.projectName) {
			meta.createSpan({ cls: "spm-board-chip", text: record.projectName });
		}
		if (record.priority) {
			meta.createSpan({
				cls: `spm-board-chip is-priority is-${record.priority}`,
				text: record.priority,
			});
		}

		card.addEventListener("dragstart", (event) => {
			event.dataTransfer?.setData("text/plain", record.path);
			if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
			card.addClass("is-dragging");
		});
		card.addEventListener("dragend", () => card.removeClass("is-dragging"));
		card.addEventListener("click", (event) => this.openTask(record.path, event));
		return card;
	}

	private async moveTask(path: string, column: Column): Promise<void> {
		const record = this.records.find((entry) => entry.path === path);
		if (record && record.status.toLowerCase() === column.toLowerCase()) return;

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;

		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter.tstatus = column;
			});
			if (record) record.status = column;
			this.renderBoard();
		} catch (error) {
			console.error("[Simpromana] Board status update error:", error);
			new Notice("❌ Could not update the task status.");
		}
	}

	private openTask(path: string, event: MouseEvent): void {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;
		const leaf = this.app.workspace.getLeaf(Keymap.isModEvent(event));
		leaf.openFile(file);
	}
}
