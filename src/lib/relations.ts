import { App, TFile } from "obsidian";
import type { NoteRecord } from "../graph/model";
import type { RelationDraft } from "../graph/validate";
import { CANONICAL_RELATION_KEYS, parseLinkTarget } from "../graph/relations";

/** The note whose frontmatter declares the relation, and the note it points at. */
function declaration(draft: RelationDraft): { owner: NoteRecord; target: NoteRecord } {
	return draft.kind === "related"
		? { owner: draft.from, target: draft.to }
		: { owner: draft.to, target: draft.from };
}

function wikilink(file: TFile): string {
	return `[[${file.path.replace(/\.md$/, "")}]]`;
}

export async function writeRelation(app: App, draft: RelationDraft): Promise<void> {
	const { owner, target } = declaration(draft);
	const file = app.vault.getAbstractFileByPath(owner.path);
	const targetFile = app.vault.getAbstractFileByPath(target.path);
	if (!(file instanceof TFile) || !(targetFile instanceof TFile)) {
		throw new Error("Task file not found.");
	}

	const key = CANONICAL_RELATION_KEYS[draft.kind];
	const link = wikilink(targetFile);

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		const current = frontmatter[key];
		const values = Array.isArray(current) ? [...current] : current ? [current] : [];
		const already = values.some((value) => {
			const parsed = parseLinkTarget(value);
			return parsed !== null && parsed.split("/").pop() === targetFile.basename;
		});
		if (already) return;
		values.push(link);
		frontmatter[key] = values;
	});
}
