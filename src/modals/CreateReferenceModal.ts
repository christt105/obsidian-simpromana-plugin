import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import {
	activeProjectFile,
	ensureFolder,
	generateId,
	getAllProjects,
	projectWikilink,
	referencesPath,
} from "../lib/vault";

const NO_PROJECT = "__none__";

export class CreateReferenceModal extends Modal {
	private title = "";
	private tags = "";
	private description = "";
	private date = new Date().toISOString().slice(0, 10);
	private selectedProject: TFile | null = null;
	private projects: TFile[] = [];
	private lockedProject = false;

	constructor(app: App, private settings: SimpromanaSettings, private presetProject: TFile | null = null) {
		super(app);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "New reference" });

		this.projects = await getAllProjects(this.app, this.settings);
		const contextProject = this.presetProject ?? activeProjectFile(this.app, this.settings);

		if (contextProject) {
			this.selectedProject = contextProject;
			this.lockedProject = true;
		}

		let titleInput: HTMLInputElement;

		new Setting(contentEl).setName("Title").addText((text) => {
			titleInput = text.inputEl;
			text.setPlaceholder("Reference title").onChange((v) => (this.title = v));
		});

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
			.setName("Tags")
			.setDesc("Comma-separated.")
			.addText((text) =>
				text.setPlaceholder("godot, tool, audit").onChange((v) => (this.tags = v))
			);

		new Setting(contentEl)
			.setName("Date")
			.addText((text) => {
				text.inputEl.type = "date";
				text.setValue(this.date).onChange((v) => (this.date = v));
			});

		new Setting(contentEl)
			.setName("Description")
			.addTextArea((text) =>
				text
					.setPlaceholder("Short summary shown in the project's reference list.")
					.onChange((v) => (this.description = v))
			);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Create")
				.setCta()
				.onClick(() => this.submit())
		);

		contentEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
				this.submit();
			}
		});

		setTimeout(() => titleInput?.focus(), 50);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async submit(): Promise<void> {
		const title = this.title.trim();
		if (!title) {
			new Notice("Reference title cannot be empty.");
			return;
		}

		const id = generateId(6);
		const fileName = `${title} - ${id}.md`;
		const folder = referencesPath(this.settings);
		const filePath = normalizePath(`${folder}/${fileName}`);

		const tags = this.tags
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		const tagsYaml = tags.length > 0 ? `\n${tags.map((t) => `  - ${t}`).join("\n")}` : " []";

		const projectLine = this.selectedProject
			? `project: ${projectWikilink(this.settings, this.selectedProject.basename)}`
			: "project:";

		const dateLine = this.date.trim() ? `date: ${this.date.trim()}` : "date:";
		const descriptionLine = `description: "${this.description.trim().replace(/"/g, '\\"')}"`;

		const frontmatterLines = [
			"type: reference",
			`tags:${tagsYaml}`,
			projectLine,
			dateLine,
			descriptionLine,
		];

		const content = `---\n${frontmatterLines.join("\n")}\n---\n# ${title}\n`;

		try {
			await ensureFolder(this.app, folder);
			const file = await this.app.vault.create(filePath, content);
			this.close();
			await this.app.workspace.getLeaf().openFile(file);
			new Notice(
				this.selectedProject
					? `✅ Reference linked to "${this.selectedProject.basename}" created.`
					: "✅ Reference created."
			);
		} catch (err) {
			console.error("[Simpromana] CreateReference error:", err);
			new Notice("❌ Failed to create reference.");
		}
	}
}
