import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import type SimpromanaPlugin from "./main";

export interface SimpromanaSettings {
	rootFolder: string;
	projectsFolder: string;
	tasksFolder: string;
	referencesFolder: string;
	archiveFolder: string;
}

export const DEFAULT_SETTINGS: SimpromanaSettings = {
	rootFolder: "Project Management",
	projectsFolder: "Projects",
	tasksFolder: "Tasks",
	referencesFolder: "Reference",
	archiveFolder: "Archive",
};

type SettingKey = keyof SimpromanaSettings;

export class SimpromanaSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: SimpromanaPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			{
				name: "Root folder",
				desc: "Folder that contains Projects, Tasks, and Reference subfolders.",
				control: { type: "text", key: "rootFolder", placeholder: "Atlas/Project Management" },
			},
			{ name: "Projects subfolder", control: { type: "text", key: "projectsFolder" } },
			{ name: "Tasks subfolder", control: { type: "text", key: "tasksFolder" } },
			{ name: "References subfolder", control: { type: "text", key: "referencesFolder" } },
			{ name: "Archive subfolder", control: { type: "text", key: "archiveFolder" } },
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as SettingKey];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (typeof value !== "string") return;
		this.plugin.settings[key as SettingKey] = value.trim();
		await this.plugin.saveSettings();
	}
}
