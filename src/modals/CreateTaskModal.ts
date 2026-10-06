import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import { taskStatusList } from "../defaults";
import {
	activeProjectFile,
	ensureFolder,
	generateId,
	getAllProjects,
	projectWikilink,
	tasksPath,
} from "../lib/vault";

const PRIORITY_OPTIONS: Record<string, string> = {
	high: "High",
	medium: "Medium",
	low: "Low",
};

const NO_PROJECT = "__none__";

export class CreateTaskModal extends Modal {
	private taskName = "";
	private tstatus = "";
	private priority = "medium";
	private milestone = "";
	private epic = "";
	private dueDate = "";
	private selectedProject: TFile | null = null;
	private projects: TFile[] = [];
	private lockedProject = false;

	constructor(app: App, private settings: SimpromanaSettings, private presetProject: TFile | null = null) {
		super(app);
		this.tstatus = taskStatusList(settings)[0];
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "New task" });

		this.projects = await getAllProjects(this.app, this.settings);
		const contextProject = this.presetProject ?? activeProjectFile(this.app, this.settings);

		if (contextProject) {
			this.selectedProject = contextProject;
			this.lockedProject = true;
		}

		let nameInput: HTMLInputElement;

		new Setting(contentEl).setName("Name").addText((text) => {
			nameInput = text.inputEl;
			text.setPlaceholder("Task name").onChange((v) => (this.taskName = v));
		});

		new Setting(contentEl).setName("Status").addDropdown((dd) =>
			dd
				.addOptions(Object.fromEntries(taskStatusList(this.settings).map((status) => [status, status])))
				.setValue(this.tstatus)
				.onChange((v) => (this.tstatus = v))
		);

		new Setting(contentEl).setName("Priority").addDropdown((dd) =>
			dd
				.addOptions(PRIORITY_OPTIONS)
				.setValue(this.priority)
				.onChange((v) => (this.priority = v))
		);

		if (this.lockedProject) {
			new Setting(contentEl)
				.setName("Project")
				.setDesc(this.selectedProject!.basename)
				.setDisabled(true);
		} else {
			const projectOptions: Record<string, string> = {
				[NO_PROJECT]: "— No project —",
			};
			for (const p of this.projects) {
				projectOptions[p.path] = p.basename;
			}

			new Setting(contentEl).setName("Project").addDropdown((dd) => {
				dd.addOptions(projectOptions)
					.setValue(NO_PROJECT)
					.onChange((v) => {
						const file = v === NO_PROJECT ? null : this.app.vault.getAbstractFileByPath(v);
						this.selectedProject = file instanceof TFile ? file : null;
					});
			});
		}

		new Setting(contentEl)
			.setName("Milestone")
			.setDesc("Optional version or milestone label.")
			.addText((text) =>
				text.setPlaceholder("v1.0").onChange((v) => (this.milestone = v))
			);

		new Setting(contentEl)
			.setName("Epic")
			.setDesc("Optional label to group this task with others in the flow view.")
			.addText((text) =>
				text.setPlaceholder("Onboarding rework").onChange((v) => (this.epic = v))
			);

		new Setting(contentEl)
			.setName("Due date")
			.setDesc("Optional.")
			.addText((text) => {
				text.inputEl.type = "date";
				text.onChange((v) => (this.dueDate = v));
			});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Create")
				.setCta()
				.onClick(() => this.submit())
		);

		contentEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) void this.submit();
		});

		window.setTimeout(() => nameInput?.focus(), 50);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async submit(): Promise<void> {
		const name = this.taskName.trim();
		if (!name) {
			new Notice("Task name cannot be empty.");
			return;
		}

		const id = generateId(6);
		const fileName = `${name} - ${id}.md`;
		const folder = tasksPath(this.settings);
		const filePath = normalizePath(`${folder}/${fileName}`);

		const p = this.settings;
		const projectLine = this.selectedProject
			? `${p.projectProperty}: ${projectWikilink(this.settings, this.selectedProject.basename)}`
			: `${p.projectProperty}:`;

		const milestoneLine = this.milestone.trim()
			? `${p.milestoneProperty}: "${this.milestone.trim()}"`
			: "";

		const epicLine = this.epic.trim() ? `${p.epicProperty}: "${this.epic.trim()}"` : "";
		const dueDateLine = this.dueDate.trim() ? `${p.dueDateProperty}: "${this.dueDate.trim()}"` : "";

		const frontmatterLines = [
			`${p.taskStatusProperty}: ${this.tstatus}`,
			`${p.typeProperty}: task`,
			`${p.priorityProperty}: ${this.priority}`,
			milestoneLine,
			epicLine,
			dueDateLine,
			projectLine,
		].filter(Boolean);

		const content = `---\n${frontmatterLines.join("\n")}\n---\n# ${name}\n`;

		try {
			await ensureFolder(this.app, folder);
			const file = await this.app.vault.create(filePath, content);
			this.close();
			await this.app.workspace.getLeaf().openFile(file);
			new Notice(
				this.selectedProject
					? `✅ Task linked to "${this.selectedProject.basename}" created.`
					: "✅ Task created."
			);
		} catch (err) {
			console.error("[Simpromana] CreateTask error:", err);
			new Notice("❌ Failed to create task.");
		}
	}
}
