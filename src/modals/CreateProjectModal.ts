import { App, Modal, Notice, Setting, normalizePath } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import { ensureFolder, projectsPath } from "../lib/vault";

const PSTATUS_OPTIONS: Record<string, string> = {
	Backlog: "Backlog",
	Planning: "Planning",
	"In progress": "In progress",
	Paused: "Paused",
	Done: "Done",
	Canceled: "Canceled",
};

const PRIORITY_OPTIONS: Record<string, string> = {
	high: "High",
	medium: "Medium",
	low: "Low",
};

export class CreateProjectModal extends Modal {
	private name = "";
	private pstatus = "Backlog";
	private priority = "medium";
	private tags = "";
	private github = "";

	constructor(app: App, private settings: SimpromanaSettings) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "New project" });

		let nameInput: HTMLInputElement;

		new Setting(contentEl).setName("Name").addText((text) => {
			nameInput = text.inputEl;
			text.setPlaceholder("My project").onChange((v) => (this.name = v));
		});

		new Setting(contentEl).setName("Status").addDropdown((dd) =>
			dd
				.addOptions(PSTATUS_OPTIONS)
				.setValue(this.pstatus)
				.onChange((v) => (this.pstatus = v))
		);

		new Setting(contentEl).setName("Priority").addDropdown((dd) =>
			dd
				.addOptions(PRIORITY_OPTIONS)
				.setValue(this.priority)
				.onChange((v) => (this.priority = v))
		);

		new Setting(contentEl)
			.setName("Tags")
			.setDesc("Comma-separated.")
			.addText((text) =>
				text.setPlaceholder("godot, tool, web").onChange((v) => (this.tags = v))
			);

		new Setting(contentEl)
			.setName("GitHub")
			.addText((text) =>
				text
					.setPlaceholder("https://github.com/...")
					.onChange((v) => (this.github = v))
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
		const name = this.name.trim();
		if (!name) {
			new Notice("Project name cannot be empty.");
			return;
		}

		const folder = projectsPath(this.settings);
		const filePath = normalizePath(`${folder}/${name}.md`);

		if (this.app.vault.getAbstractFileByPath(filePath)) {
			new Notice(`Project "${name}" already exists.`);
			return;
		}

		const tags = this.tags
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		const tagsYaml =
			tags.length > 0
				? `\n${tags.map((t) => `  - ${t}`).join("\n")}`
				: " []";

		const root = this.settings.rootFolder;
		const content = `---
pstatus: ${this.pstatus}
type: project
priority: ${this.priority}
tags:${tagsYaml}
github: ${this.github.trim()}
banner:
---
# ${name}

## Descripción

## Tareas
![[${root}/Tasks.base#Current|Tareas]]

## Referencia

![[${root}/References.base#Current|Referencias]]
`;

		try {
			await ensureFolder(this.app, folder);
			const file = await this.app.vault.create(filePath, content);
			this.close();
			await this.app.workspace.getLeaf().openFile(file);
			new Notice(`✅ Project "${name}" created.`);
		} catch (err) {
			console.error("[Simpromana] CreateProject error:", err);
			new Notice("❌ Failed to create project.");
		}
	}
}
