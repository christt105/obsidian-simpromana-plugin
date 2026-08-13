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
import type { RelationKind, TaskRecord } from "../graph/model";
import { buildTaskGraph, connectedPaths, dropNodes, selectSubgraph } from "../graph/build";
import { layoutGraph } from "../graph/layout";
import { RELATION_LABELS } from "../graph/relations";
import { collectTaskRecords, createTaskResolver, projectFiles } from "../lib/tasks";
import { projectsPath, tasksPath } from "../lib/vault";
import { FlowCanvas } from "./FlowCanvas";

export const FLOW_VIEW_TYPE = "simpromana-flow";

const LEGEND: { kind: RelationKind; label: string }[] = [
	{ kind: "dependency", label: RELATION_LABELS.dependency },
	{ kind: "continuation", label: RELATION_LABELS.continuation },
	{ kind: "related", label: RELATION_LABELS.related },
];

export interface FlowViewState extends Record<string, unknown> {
	projectPath?: string;
	hideDone?: boolean;
	showUnlinked?: boolean;
}

export class FlowView extends ItemView {
	private projectPath: string | null = null;
	private hideDone = false;
	private showUnlinked = false;
	private projectSelect: HTMLSelectElement;
	private unlinkedButton: HTMLButtonElement;
	private doneButton: HTMLButtonElement;
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
		};
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const next = (state ?? {}) as FlowViewState;
		if (typeof next.projectPath === "string") this.projectPath = next.projectPath;
		if (typeof next.hideDone === "boolean") this.hideDone = next.hideDone;
		if (typeof next.showUnlinked === "boolean") this.showUnlinked = next.showUnlinked;
		await super.setState(state, result);
		if (this.canvas) this.render(true);
	}

	private isRelevant(path: string): boolean {
		return (
			path.startsWith(`${tasksPath(this.settings)}/`) ||
			path.startsWith(`${projectsPath(this.settings)}/`)
		);
	}

	private buildToolbar(toolbar: HTMLElement): void {
		this.projectSelect = toolbar.createEl("select", { cls: "dropdown spm-flow-project" });
		this.projectSelect.addEventListener("change", () => {
			this.projectPath = this.projectSelect.value || null;
			this.app.workspace.requestSaveLayout();
			this.render(true);
		});

		this.doneButton = toolbar.createEl("button", {
			cls: "spm-flow-toggle",
			text: "Hide done",
		});
		this.doneButton.addEventListener("click", () => {
			this.hideDone = !this.hideDone;
			this.app.workspace.requestSaveLayout();
			this.render(true);
		});

		this.unlinkedButton = toolbar.createEl("button", {
			cls: "spm-flow-toggle",
			text: "Unlinked",
		});
		this.unlinkedButton.addEventListener("click", () => {
			this.showUnlinked = !this.showUnlinked;
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

		const records = collectTaskRecords(this.app, this.settings);
		const graph = buildTaskGraph(records, createTaskResolver(this.app, records));
		const projectPath = this.projectPath;
		let scoped = selectSubgraph(
			graph,
			(record: TaskRecord) => projectPath !== null && record.projectPath === projectPath
		);

		if (this.hideDone) {
			scoped = dropNodes(scoped, (record) => record.status.toLowerCase() === "done");
		}

		const connected = connectedPaths(scoped);
		const unlinkedCount = scoped.nodes.filter((record) => !connected.has(record.path)).length;
		if (!this.showUnlinked) {
			scoped = dropNodes(scoped, (record) => !connected.has(record.path));
		}

		this.doneButton.toggleClass("is-active", this.hideDone);
		this.unlinkedButton.toggleClass("is-active", this.showUnlinked);
		this.unlinkedButton.setText(`Unlinked (${unlinkedCount})`);

		this.warningEl.empty();
		if (scoped.unresolved.length > 0) {
			const targets = [...new Set(scoped.unresolved.map((entry) => entry.target))];
			this.warningEl.setText(`${targets.length} unresolved link(s)`);
			this.warningEl.setAttribute("title", targets.join("\n"));
		}

		this.canvas.render(layoutGraph(scoped), { fit });
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
