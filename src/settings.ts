import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import type SimpromanaPlugin from "./main";
import { DEFAULT_SETTINGS, type SimpromanaSettings } from "./defaults";

export { DEFAULT_SETTINGS, type SimpromanaSettings };

const PROPERTY_SETTINGS: { key: SettingKey; name: string; desc: string }[] = [
	{ key: "typeProperty", name: "Note type", desc: "Holds project, task, or reference." },
	{ key: "projectProperty", name: "Project link", desc: "Links a task or reference to its project." },
	{ key: "taskStatusProperty", name: "Task status", desc: "Status of a task; drives the board columns." },
	{ key: "projectStatusProperty", name: "Project status", desc: "Status of a project." },
	{ key: "priorityProperty", name: "Priority", desc: "Priority of a task or project." },
	{ key: "milestoneProperty", name: "Milestone", desc: "Optional milestone label of a task." },
	{ key: "epicProperty", name: "Epic", desc: "Optional epic label grouping tasks in the flow view." },
	{ key: "dueDateProperty", name: "Due date", desc: "Optional due date of a task." },
	{ key: "blockedByProperty", name: "Blocked by", desc: "Lists the tasks that block this one." },
	{ key: "continuesProperty", name: "Continues", desc: "Lists the tasks this one continues." },
	{ key: "relatedProperty", name: "Related", desc: "Lists related tasks." },
];

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
			{
				type: "group",
				heading: "Frontmatter properties",
				items: PROPERTY_SETTINGS.map(({ key, name, desc }) => ({
					name,
					desc: `${desc} Renaming does not update existing notes.`,
					control: { type: "text", key, placeholder: DEFAULT_SETTINGS[key] },
				})),
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as SettingKey];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (typeof value !== "string") return;
		const trimmed = value.trim();
		this.plugin.settings[key as SettingKey] =
			trimmed || (key.endsWith("Property") ? DEFAULT_SETTINGS[key as SettingKey] : trimmed);
		await this.plugin.saveSettings();
	}
}
