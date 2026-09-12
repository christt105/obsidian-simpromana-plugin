import { App, FuzzyMatch, FuzzySuggestModal, TFile } from "obsidian";

export class TaskSearchModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private items: TFile[], private onChoose: (file: TFile) => void) {
		super(app);
		this.setPlaceholder("Search tasks…");
	}

	getItems(): TFile[] {
		return this.items;
	}

	getItemText(file: TFile): string {
		return file.basename;
	}

	renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement): void {
		el.createDiv({ text: match.item.basename });
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}
