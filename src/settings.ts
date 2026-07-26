import { App, PluginSettingTab, Setting } from "obsidian";
import type SimpromanaPlugin from "./main";

export interface SimpromanaSettings {
	rootFolder: string;
	projectsFolder: string;
	tasksFolder: string;
	referencesFolder: string;
	archiveFolder: string;
}

export const DEFAULT_SETTINGS: SimpromanaSettings = {
	rootFolder: "Atlas/Project Management",
	projectsFolder: "Projects",
	tasksFolder: "Tasks",
	referencesFolder: "Reference",
	archiveFolder: "Archive",
};

export class SimpromanaSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: SimpromanaPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Root folder")
			.setDesc("Folder that contains Projects, Tasks, and Reference subfolders.")
			.addText((text) =>
				text
					.setPlaceholder("Atlas/Project Management")
					.setValue(this.plugin.settings.rootFolder)
					.onChange(async (value) => {
						this.plugin.settings.rootFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Projects subfolder")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.projectsFolder)
					.onChange(async (value) => {
						this.plugin.settings.projectsFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Tasks subfolder")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.tasksFolder)
					.onChange(async (value) => {
						this.plugin.settings.tasksFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("References subfolder")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.referencesFolder)
					.onChange(async (value) => {
						this.plugin.settings.referencesFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Archive subfolder")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.archiveFolder)
					.onChange(async (value) => {
						this.plugin.settings.archiveFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);
	}
}
