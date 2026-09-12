import { ItemView, Keymap, Notice, TFile, ViewStateResult, WorkspaceLeaf, debounce } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import type { NoteRecord } from "../graph/model";
import { collectNotes, projectFiles } from "../lib/notes";
import { relationKeyOf, toTargetList } from "../graph/relations";
import { projectsPath, tasksPath } from "../lib/vault";

export const BOARD_VIEW_TYPE = "simpromana-board";

const COLUMNS = ["Todo", "Doing", "Review", "Done"] as const;
type Column = (typeof COLUMNS)[number];

export interface BoardViewState extends Record<string, unknown> {
	projectPath?: string;
}

export class BoardView extends ItemView {
	private records: NoteRecord[] = [];
	private blockersByPath = new Map<string, { path: string; title: string }[]>();
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
		this.computeBlockers();
		this.syncProjectSelect();
		this.renderBoard();
	}

	private computeBlockers(): void {
		const byPath = new Map(this.records.map((record) => [record.path, record] as const));
		const map = new Map<string, Map<string, { path: string; title: string }>>();

		const addBlocker = (blockedPath: string, blockerPath: string) => {
			if (blockedPath === blockerPath) return;
			let entry = map.get(blockedPath);
			if (!entry) {
				entry = new Map();
				map.set(blockedPath, entry);
			}
			if (!entry.has(blockerPath)) {
				const title = byPath.get(blockerPath)?.title ?? blockerPath;
				entry.set(blockerPath, { path: blockerPath, title });
			}
		};

		for (const record of this.records) {
			for (const [key, value] of Object.entries(record.frontmatter)) {
				const relationKey = relationKeyOf(key);
				if (!relationKey || relationKey.kind !== "dependency") continue;

				for (const target of toTargetList(value)) {
					const file = this.app.metadataCache.getFirstLinkpathDest(target, record.path);
					if (!(file instanceof TFile)) continue;
					if (relationKey.inverted) {
						addBlocker(record.path, file.path);
					} else {
						addBlocker(file.path, record.path);
					}
				}
			}
		}

		this.blockersByPath = new Map(
			[...map.entries()].map(([path, blockers]) => [path, [...blockers.values()]])
		);
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

		const dueState = this.dueDateState(record);
		if (dueState) {
			meta.createSpan({
				cls: `spm-board-chip is-due-date is-${dueState.urgency}`,
				text: dueState.label,
			});
		}

		const blockers = this.blockedBy(record);
		if (blockers.length > 0) {
			this.renderBlockedBadge(card, blockers);
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

	private dueDateState(record: NoteRecord): { label: string; urgency: "overdue" | "soon" | "normal" } | null {
		const raw = record.frontmatter.due_date;
		if (typeof raw !== "string" || !raw.trim()) return null;

		const due = new Date(`${raw.trim()}T00:00:00`);
		if (Number.isNaN(due.getTime())) return null;

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const daysLeft = Math.round((due.getTime() - today.getTime()) / 86_400_000);

		const urgency = daysLeft < 0 ? "overdue" : daysLeft <= 3 ? "soon" : "normal";
		return { label: raw.trim(), urgency };
	}

	private blockedBy(record: NoteRecord): { path: string; title: string }[] {
		return this.blockersByPath.get(record.path) ?? [];
	}

	private renderBlockedBadge(card: HTMLElement, blockers: { path: string; title: string }[]): void {
		const details = card.createEl("details", { cls: "spm-board-blocked" });
		const summary = details.createEl("summary", {
			cls: "spm-board-blocked-badge",
			text: `Blocked (${blockers.length})`,
			attr: { title: blockers.map((dep) => dep.title).join(", ") },
		});
		summary.addEventListener("click", (event) => event.stopPropagation());

		const list = details.createEl("ul", { cls: "spm-board-blocked-list" });
		for (const dep of blockers) {
			const item = list.createEl("li");
			const link = item.createEl("a", { cls: "spm-board-blocked-link", text: dep.title });
			link.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.openTask(dep.path, event);
			});
		}
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
