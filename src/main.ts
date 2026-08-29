import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, SimpromanaSettingTab, SimpromanaSettings } from "./settings";
import { CreateProjectModal } from "./modals/CreateProjectModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";
import { setupBases } from "./lib/bases";
import { activeProjectFile } from "./lib/vault";
import { FLOW_VIEW_TYPE, FlowView, FlowViewState } from "./views/FlowView";
import { BOARD_VIEW_TYPE, BoardView } from "./views/BoardView";

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

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
