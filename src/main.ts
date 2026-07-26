import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, SimpromanaSettingTab, SimpromanaSettings } from "./settings";
import { CreateProjectModal } from "./modals/CreateProjectModal";
import { CreateTaskModal } from "./modals/CreateTaskModal";

export default class SimpromanaPlugin extends Plugin {
	settings: SimpromanaSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new SimpromanaSettingTab(this.app, this));

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
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
