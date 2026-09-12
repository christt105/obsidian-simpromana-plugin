import { ConfirmationModal, Notice, Plugin, TFile, WorkspaceLeaf, normalizePath } from "obsidian";
import { DEFAULT_SETTINGS, SimpromanaSettingTab, SimpromanaSettings } from "./settings";
import { CreateProjectModal } from "./modals/CreateProjectModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { CreateReferenceModal } from "./modals/CreateReferenceModal";
import { setupBases } from "./lib/bases";
import { activeProjectFile, archivePath, ensureFolder } from "./lib/vault";
import { registerRelationPropertyWidget } from "./lib/relationPropertyWidget";
import { FLOW_VIEW_TYPE, FlowView, FlowViewState } from "./views/FlowView";
import { BOARD_VIEW_TYPE, BoardView } from "./views/BoardView";
import { PROJECT_PANEL_VIEW_TYPE, ProjectPanelView } from "./views/ProjectPanelView";

export default class SimpromanaPlugin extends Plugin {
	settings: SimpromanaSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new SimpromanaSettingTab(this.app, this));

		this.registerView(
			FLOW_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new FlowView(leaf, this.settings)
		);
		this.registerView(
			BOARD_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new BoardView(leaf, this.settings)
		);
		this.registerView(
			PROJECT_PANEL_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new ProjectPanelView(leaf, this.settings)
		);

		this.addCommand({
			id: "open-task-flow",
			name: "Open task flow",
			callback: () => this.openFlowView(),
		});

		this.addCommand({
			id: "open-board",
			name: "Open Board",
			callback: () => this.openBoardView(),
		});

		this.addCommand({
			id: "open-project-panel",
			name: "Open project panel",
			callback: () => this.openProjectPanel(),
		});

		this.addCommand({
			id: "create-project",
			name: "New project",
			callback: () => new CreateProjectModal(this.app, this.settings).open(),
		});

		this.addCommand({
			id: "create-task",
			name: "New task",
			callback: () => new CreateTaskModal(this.app, this.settings).open(),
		});

		this.addCommand({
			id: "create-reference",
			name: "New reference",
			callback: () => new CreateReferenceModal(this.app, this.settings).open(),
		});

		this.addCommand({
			id: "setup-bases",
			name: "Setup bases",
			callback: async () => {
				try {
					await setupBases(this.app, this.settings);
					new Notice("✅ Tasks.base updated.");
				} catch (err) {
					console.error("[Simpromana] Setup bases error:", err);
					new Notice("❌ Failed to update Tasks.base.");
				}
			},
		});

		try {
			registerRelationPropertyWidget(this.app, this.settings);
		} catch (err) {
			console.error("[Simpromana] Relation property widget registration error:", err);
		}

		this.addCommand({
			id: "archive-task",
			name: "Archive current task",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (frontmatter?.type !== "task") return false;
				if (!checking) this.confirmArchiveTask(file);
				return true;
			},
		});
	}

	private confirmArchiveTask(file: TFile): void {
		const modal = new ConfirmationModal(this.app);
		modal.setTitle("Archive task");
		modal.setContent(
			`Set "${file.basename}" to tstatus: Archive and move it into "${this.settings.archiveFolder}"?`
		);
		modal.addButton((btn) =>
			btn
				.setButtonText("Archive")
				.setCta()
				.setInitialFocus()
				.onClick(() => this.archiveTask(file))
		);
		modal.addCancelButton();
		modal.open();
	}

	private async archiveTask(file: TFile): Promise<void> {
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter.tstatus = "Archive";
			});
			const folder = archivePath(this.settings);
			await ensureFolder(this.app, folder);
			const newPath = normalizePath(`${folder}/${file.name}`);
			await this.app.fileManager.renameFile(file, newPath);
			new Notice(`✅ Task "${file.basename}" archived.`);
		} catch (err) {
			console.error("[Simpromana] Archive task error:", err);
			new Notice("❌ Failed to archive task.");
		}
	}

	async openFlowView(): Promise<void> {
		const { workspace } = this.app;
		const leaf = workspace.getLeavesOfType(FLOW_VIEW_TYPE)[0] ?? workspace.getLeaf("tab");
		const project = activeProjectFile(this.app, this.settings);
		const state: FlowViewState = project ? { projectPath: project.path } : {};

		await leaf.setViewState({ type: FLOW_VIEW_TYPE, active: true, state });
		await workspace.revealLeaf(leaf);
	}

	async openBoardView(): Promise<void> {
		const { workspace } = this.app;
		const leaf = workspace.getLeavesOfType(BOARD_VIEW_TYPE)[0] ?? workspace.getLeaf("tab");
		await leaf.setViewState({ type: BOARD_VIEW_TYPE, active: true });
		await workspace.revealLeaf(leaf);
	}

	async openProjectPanel(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(PROJECT_PANEL_VIEW_TYPE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) return;
			leaf = rightLeaf;
			await leaf.setViewState({ type: PROJECT_PANEL_VIEW_TYPE, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
