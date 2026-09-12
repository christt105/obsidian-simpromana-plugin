import { App, TFile } from "obsidian";
import type { NoteRecord, RelationKind } from "../graph/model";
import type { RelationDraft } from "../graph/validate";
import { CANONICAL_RELATION_KEYS, parseLinkTarget, relationKeyOf } from "../graph/relations";

/** The note whose frontmatter declares the relation, and the note it points at. */
function declaration(draft: RelationDraft): { owner: NoteRecord; target: NoteRecord } {
	return draft.kind === "related"
		? { owner: draft.from, target: draft.to }
		: { owner: draft.to, target: draft.from };
}

export function wikilink(file: TFile): string {
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

/**
 * Strips every frontmatter key on `note` that declares a relation of `kind`
 * towards `other`, regardless of which synonym key was used to declare it.
 */
async function stripRelationFromNote(
	app: App,
	note: NoteRecord,
	other: NoteRecord,
	kind: RelationKind
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(note.path);
	if (!(file instanceof TFile)) return;

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		for (const key of Object.keys(frontmatter)) {
			const relationKey = relationKeyOf(key);
			if (!relationKey || relationKey.kind !== kind) continue;

			const current = frontmatter[key];
			const values = Array.isArray(current) ? current : current ? [current] : [];
			const remaining = values.filter((value) => {
				const parsed = parseLinkTarget(value);
				return parsed === null || parsed.split("/").pop() !== other.basename;
			});

			if (remaining.length === values.length) continue;
			if (remaining.length === 0) delete frontmatter[key];
			else frontmatter[key] = remaining;
		}
	});
}

/** Clears the relation from whichever side(s) declared it. */
export async function deleteRelation(
	app: App,
	from: NoteRecord,
	to: NoteRecord,
	kind: RelationKind
): Promise<void> {
	await stripRelationFromNote(app, from, to, kind);
	await stripRelationFromNote(app, to, from, kind);
}

export async function changeRelationKind(
	app: App,
	from: NoteRecord,
	to: NoteRecord,
	fromKind: RelationKind,
	toKind: RelationKind
): Promise<void> {
	await deleteRelation(app, from, to, fromKind);
	await writeRelation(app, { from, to, kind: toKind });
}
