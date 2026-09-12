import { App, Modal, Setting } from "obsidian";
import { DRAWABLE_KINDS, clonePreferences } from "../graph/preferences";
import type { FlowGraphPreferences } from "../graph/preferences";
import { RELATION_LABELS } from "../graph/relations";
import { GROUPING_LABELS } from "../graph/grouping";
import type { GroupingMode } from "../graph/grouping";

export class FlowSettingsModal extends Modal {
	private draft: FlowGraphPreferences;

	constructor(
		app: App,
		current: FlowGraphPreferences,
		private onApply: (next: FlowGraphPreferences) => void,
		private onReset: () => void
	) {
		super(app);
		this.draft = clonePreferences(current);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("spm-flow-settings");
		contentEl.createEl("h2", { text: "Flow view settings" });
		contentEl.createEl("p", {
			cls: "setting-item-description",
			text: "Saved as a preset for the currently selected project.",
		});

		contentEl.createEl("h3", { text: "Layout" });
		this.numberSetting(contentEl, "Card width", "px", () => this.draft.nodeWidth, (v) => (this.draft.nodeWidth = v));
		this.numberSetting(contentEl, "Card height", "px", () => this.draft.nodeHeight, (v) => (this.draft.nodeHeight = v));
		this.numberSetting(contentEl, "Layer spacing", "px", () => this.draft.layerGap, (v) => (this.draft.layerGap = v));
		this.numberSetting(contentEl, "Row spacing", "px", () => this.draft.rowGap, (v) => (this.draft.rowGap = v));

		contentEl.createEl("h3", { text: "Forces" });
		this.numberSetting(contentEl, "Repulsion", "", () => this.draft.charge, (v) => (this.draft.charge = v));
		this.numberSetting(
			contentEl,
			"Collision radius",
			"px",
			() => this.draft.collisionPadding,
			(v) => (this.draft.collisionPadding = v)
		);
		this.numberSetting(
			contentEl,
			"Cooling speed",
			"",
			() => this.draft.alphaDecay,
			(v) => (this.draft.alphaDecay = v),
			0.001
		);
		for (const kind of DRAWABLE_KINDS) {
			this.numberSetting(
				contentEl,
				`${RELATION_LABELS[kind]} link distance`,
				"px",
				() => this.draft.linkDistance[kind],
				(v) => (this.draft.linkDistance[kind] = v)
			);
		}

		contentEl.createEl("h3", { text: "Filters" });
		new Setting(contentEl)
			.setName("Hub threshold")
			.setDesc("Collapse mention edges for tasks with more connections than this. 0 keeps every mention.")
			.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(String(this.draft.hubLimit)).onChange((value) => {
					const parsed = Number(value);
					if (!Number.isNaN(parsed)) this.draft.hubLimit = parsed;
				});
			});

		for (const kind of DRAWABLE_KINDS) {
			new Setting(contentEl)
				.setName(`Draw ${RELATION_LABELS[kind].toLowerCase()} relations`)
				.addToggle((toggle) =>
					toggle
						.setValue(this.draft.drawKinds[kind])
						.onChange((value) => (this.draft.drawKinds[kind] = value))
				);
		}

		new Setting(contentEl).setName("Group unlinked tasks by").addDropdown((dropdown) => {
			for (const [mode, label] of Object.entries(GROUPING_LABELS)) {
				dropdown.addOption(mode, label);
			}
			dropdown.setValue(this.draft.grouping).onChange((value) => {
				this.draft.grouping = value as GroupingMode;
			});
		});

		const actions = new Setting(contentEl);
		actions.addButton((button) =>
			button.setButtonText("Reset to defaults").onClick(() => {
				this.onReset();
				this.close();
			})
		);
		actions.addButton((button) =>
			button
				.setButtonText("Apply")
				.setCta()
				.onClick(() => {
					this.onApply(this.draft);
					this.close();
				})
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private numberSetting(
		container: HTMLElement,
		name: string,
		suffix: string,
		get: () => number,
		set: (value: number) => void,
		step = 1
	): void {
		new Setting(container).setName(suffix ? `${name} (${suffix})` : name).addText((text) => {
			text.inputEl.type = "number";
			text.inputEl.step = String(step);
			text.setValue(String(get())).onChange((value) => {
				const parsed = Number(value);
				if (!Number.isNaN(parsed)) set(parsed);
			});
		});
	}
}
