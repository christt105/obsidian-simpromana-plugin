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
			{
				type: "group",
				heading: "Status values",
				items: [
					{
						name: "Task statuses",
						desc: "Comma-separated, in board column order. The first is used for new tasks, the last counts as done.",
						control: { type: "text", key: "taskStatuses", placeholder: DEFAULT_SETTINGS.taskStatuses },
					},
					{
						name: "Archived task status",
						desc: "Set by the Archive current task command.",
						control: { type: "text", key: "archivedStatus", placeholder: DEFAULT_SETTINGS.archivedStatus },
					},
					{
						name: "Project statuses",
						desc: "Comma-separated. The first is used for new projects.",
						control: { type: "text", key: "projectStatuses", placeholder: DEFAULT_SETTINGS.projectStatuses },
					},
				],
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
			trimmed || (key.endsWith("Folder") ? trimmed : DEFAULT_SETTINGS[key as SettingKey]);
		await this.plugin.saveSettings();
	}
}
