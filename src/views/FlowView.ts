import {
	ItemView,
	Keymap,
	TFile,
	ViewStateResult,
	WorkspaceLeaf,
	debounce,
	setIcon,
} from "obsidian";
import type { SimpromanaSettings } from "../settings";
import type { NoteRecord, RelationKind } from "../graph/model";
import { buildNoteGraph, connectedPaths, dropNodes, selectSubgraph } from "../graph/build";
import { DEFAULT_LAYOUT_OPTIONS, layoutGraph } from "../graph/layout";
import { GROUPING_LABELS } from "../graph/grouping";
import type { GroupingMode } from "../graph/grouping";
import { RELATION_LABELS } from "../graph/relations";
import { collectNotes, createNoteResolver, projectFiles } from "../lib/notes";
import { projectsPath, referencesPath, tasksPath } from "../lib/vault";
import { FlowCanvas } from "./FlowCanvas";

export const FLOW_VIEW_TYPE = "simpromana-flow";

const LEGEND: { kind: RelationKind; label: string }[] = [
	{ kind: "dependency", label: RELATION_LABELS.dependency },
	{ kind: "continuation", label: RELATION_LABELS.continuation },
	{ kind: "related", label: RELATION_LABELS.related },
	{ kind: "mention", label: RELATION_LABELS.mention },
];

export interface FlowViewState extends Record<string, unknown> {
	projectPath?: string;
	hideDone?: boolean;
	showUnlinked?: boolean;
	mentions?: boolean;
	references?: boolean;
	grouping?: GroupingMode;
}

export class FlowView extends ItemView {
	private projectPath: string | null = null;
	private hideDone = false;
	private showUnlinked = false;
	private mentions = true;
	private references = false;
	private grouping: GroupingMode = "status";
	private projectSelect: HTMLSelectElement;
	private groupingSelect: HTMLSelectElement;
	private toggles = new Map<string, HTMLButtonElement>();
	private warningEl: HTMLElement;
	private canvasEl: HTMLElement;
	private emptyEl: HTMLElement;
	private canvas: FlowCanvas | null = null;

	constructor(leaf: WorkspaceLeaf, private settings: SimpromanaSettings) {
		super(leaf);
	}

	getViewType(): string {
		return FLOW_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Task flow";
	}

	getIcon(): string {
		return "git-fork";
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("spm-flow");

		this.buildToolbar(root.createDiv({ cls: "spm-flow-toolbar" }));
		this.canvasEl = root.createDiv({ cls: "spm-flow-canvas" });
		this.emptyEl = this.canvasEl.createDiv({ cls: "spm-flow-empty" });
		this.canvas = new FlowCanvas(this.canvasEl, {
			onOpenTask: (path, event) => this.openTask(path, event),
		});

		const refresh = debounce(() => this.render(false), 400, true);
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

		this.render(true);
	}

	async onClose(): Promise<void> {
		this.canvas?.destroy();
		this.canvas = null;
	}

	getState(): Record<string, unknown> {
		return {
			projectPath: this.projectPath ?? undefined,
			hideDone: this.hideDone,
			showUnlinked: this.showUnlinked,
			mentions: this.mentions,
			references: this.references,
			grouping: this.grouping,
		};
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const next = (state ?? {}) as FlowViewState;
		if (typeof next.projectPath === "string") this.projectPath = next.projectPath;
		if (typeof next.hideDone === "boolean") this.hideDone = next.hideDone;
		if (typeof next.showUnlinked === "boolean") this.showUnlinked = next.showUnlinked;
		if (typeof next.mentions === "boolean") this.mentions = next.mentions;
		if (typeof next.references === "boolean") this.references = next.references;
		if (typeof next.grouping === "string") this.grouping = next.grouping;
		await super.setState(state, result);
		if (this.canvas) this.render(true);
	}

	private isRelevant(path: string): boolean {
		return (
			path.startsWith(`${tasksPath(this.settings)}/`) ||
			path.startsWith(`${referencesPath(this.settings)}/`) ||
			path.startsWith(`${projectsPath(this.settings)}/`)
		);
	}

	private addToggle(
		toolbar: HTMLElement,
		key: string,
		label: string,
		get: () => boolean,
		set: (value: boolean) => void
	): void {
		const button = toolbar.createEl("button", { cls: "spm-flow-toggle", text: label });
		button.addEventListener("click", () => {
			set(!get());
			this.app.workspace.requestSaveLayout();
			this.render(true);
		});
		this.toggles.set(key, button);
	}

	private buildToolbar(toolbar: HTMLElement): void {
		this.projectSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-project" });
		this.projectSelect.addEventListener("change", () => {
			this.projectPath = this.projectSelect.value || null;
			this.app.workspace.requestSaveLayout();
			this.render(true);
		});

		this.addToggle(toolbar, "done", "Hide done", () => this.hideDone, (value) => (this.hideDone = value));
		this.addToggle(toolbar, "mentions", "Mentions", () => this.mentions, (value) => (this.mentions = value));
		this.addToggle(toolbar, "references", "References", () => this.references, (value) => (this.references = value));
		this.addToggle(toolbar, "unlinked", "Unlinked", () => this.showUnlinked, (value) => (this.showUnlinked = value));

		this.groupingSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-grouping" });
		for (const [mode, label] of Object.entries(GROUPING_LABELS)) {
			this.groupingSelect.createEl("option", { value: mode, text: `Group by ${label.toLowerCase()}` });
		}
		this.groupingSelect.value = this.grouping;
		this.groupingSelect.addEventListener("change", () => {
			this.grouping = this.groupingSelect.value as GroupingMode;
			this.app.workspace.requestSaveLayout();
			this.render(true);
		});

		const zoomOut = toolbar.createEl("button", { cls: "clickable-icon" });
		setIcon(zoomOut, "zoom-out");
		zoomOut.addEventListener("click", () => this.canvas?.zoomBy(0.8));

		const zoomIn = toolbar.createEl("button", { cls: "clickable-icon" });
		setIcon(zoomIn, "zoom-in");
		zoomIn.addEventListener("click", () => this.canvas?.zoomBy(1.25));

		const fit = toolbar.createEl("button", { cls: "clickable-icon" });
		setIcon(fit, "maximize");
		fit.addEventListener("click", () => this.canvas?.fit());

		const legend = toolbar.createDiv({ cls: "spm-flow-legend" });
		for (const entry of LEGEND) {
			const item = legend.createDiv({ cls: "spm-flow-legend-item" });
			item.createSpan({ cls: `spm-flow-legend-line is-${entry.kind}` });
			item.createSpan({ text: entry.label });
		}

		this.warningEl = toolbar.createDiv({ cls: "spm-flow-warning" });
	}

	private syncProjectOptions(files: TFile[]): void {
		const current = this.projectPath;
		this.projectSelect.empty();
		for (const file of files) {
			this.projectSelect.createEl("option", { value: file.path, text: file.basename });
		}
		if (current && files.some((file) => file.path === current)) {
			this.projectSelect.value = current;
		} else if (files.length > 0) {
			this.projectPath = files[0].path;
			this.projectSelect.value = files[0].path;
		} else {
			this.projectPath = null;
		}
	}

	private render(fit: boolean): void {
		if (!this.canvas) return;

		const projects = projectFiles(this.app, this.settings);
		this.syncProjectOptions(projects);

		const records = collectNotes(this.app, this.settings, { references: this.references });
		const graph = buildNoteGraph(records, createNoteResolver(this.app, records), {
			mentions: this.mentions,
		});

		const projectPath = this.projectPath;
		let scoped = selectSubgraph(
			graph,
			(record: NoteRecord) => projectPath !== null && record.projectPath === projectPath
		);
		for (const record of scoped.nodes) {
			record.external = scoped.external.has(record.path);
		}

		if (this.hideDone) {
			scoped = dropNodes(scoped, (record) => record.status.toLowerCase() === "done");
		}

		const connected = connectedPaths(scoped);
		const unlinkedCount = scoped.nodes.filter((record) => !connected.has(record.path)).length;
		if (!this.showUnlinked) {
			scoped = dropNodes(scoped, (record) => !connected.has(record.path));
		}

		this.toggles.get("done")?.toggleClass("is-active", this.hideDone);
		this.toggles.get("mentions")?.toggleClass("is-active", this.mentions);
		this.toggles.get("references")?.toggleClass("is-active", this.references);
		this.toggles.get("unlinked")?.toggleClass("is-active", this.showUnlinked);
		this.toggles.get("unlinked")?.setText(`Unlinked (${unlinkedCount})`);
		this.groupingSelect.toggleClass("is-disabled", !this.showUnlinked);

		this.warningEl.empty();
		const unresolved = scoped.unresolved.filter((entry) => entry.kind !== "mention");
		if (unresolved.length > 0) {
			const targets = [...new Set(unresolved.map((entry) => entry.target))];
			this.warningEl.setText(`${targets.length} unresolved link(s)`);
			this.warningEl.setAttribute("title", targets.join("\n"));
		}

		this.canvas.render(
			layoutGraph(scoped, { ...DEFAULT_LAYOUT_OPTIONS, grouping: this.grouping }),
			{ fit }
		);
		this.updateEmptyState(projects.length, scoped.nodes.length, unlinkedCount);
	}

	private updateEmptyState(projectCount: number, nodeCount: number, unlinkedCount: number): void {
		this.emptyEl.empty();
		if (nodeCount > 0) {
			this.emptyEl.hide();
			return;
		}

		this.emptyEl.show();
		if (projectCount === 0) {
			this.emptyEl.setText("No projects found in the projects folder.");
		} else if (unlinkedCount > 0) {
			this.emptyEl.setText(
				`No related tasks in this project. Enable "Unlinked (${unlinkedCount})" to see the rest.`
			);
		} else {
			this.emptyEl.setText("No tasks in this project yet.");
		}
	}

	private openTask(path: string, event: MouseEvent): void {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;
		const leaf = this.app.workspace.getLeaf(Keymap.isModEvent(event));
		leaf.openFile(file);
	}
}
