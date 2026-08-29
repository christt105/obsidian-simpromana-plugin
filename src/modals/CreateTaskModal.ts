import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import {
	activeProjectFile,
	ensureFolder,
	generateId,
	getAllProjects,
	projectWikilink,
	tasksPath,
} from "../lib/vault";

const TSTATUS_OPTIONS: Record<string, string> = {
	Todo: "Todo",
	Doing: "Doing",
	Review: "Review",
	Done: "Done",
};

const PRIORITY_OPTIONS: Record<string, string> = {
	high: "High",
	medium: "Medium",
	low: "Low",
};

const NO_PROJECT = "__none__";

export class CreateTaskModal extends Modal {
	private taskName = "";
	private tstatus = "Todo";
	private priority = "medium";
	private milestone = "";
	private selectedProject: TFile | null = null;
	private projects: TFile[] = [];
	private lockedProject = false;

	constructor(app: App, private settings: SimpromanaSettings, private presetProject?: TFile) {
		super(app);
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
				.addOptions(TSTATUS_OPTIONS)
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
						this.selectedProject =
							v === NO_PROJECT
								? null
								: (this.app.vault.getAbstractFileByPath(v) as TFile);
					});
			});
		}

		new Setting(contentEl)
			.setName("Milestone")
			.setDesc("Optional version or milestone label.")
			.addText((text) =>
				text.setPlaceholder("v1.0").onChange((v) => (this.milestone = v))
			);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Create")
				.setCta()
				.onClick(() => this.submit())
		);

		contentEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) this.submit();
		});

		setTimeout(() => nameInput?.focus(), 50);
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

		const projectLine = this.selectedProject
			? `project: ${projectWikilink(this.settings, this.selectedProject.basename)}`
			: "project:";

		const milestoneLine = this.milestone.trim()
			? `milestone: "${this.milestone.trim()}"`
			: "";

		const frontmatterLines = [
			`tstatus: ${this.tstatus}`,
			"type: task",
			`priority: ${this.priority}`,
			milestoneLine,
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
