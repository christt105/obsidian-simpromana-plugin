import type { NoteGraph, NoteRecord, RelationKind } from "./model";
import { isOrderingKind } from "./model";

export interface RelationDraft {
	from: NoteRecord;
	to: NoteRecord;
	kind: RelationKind;
}

function reaches(graph: NoteGraph, from: string, to: string): boolean {
	const outgoing = new Map<string, string[]>();
	for (const relation of graph.relations) {
		if (!isOrderingKind(relation.kind)) continue;
		const list = outgoing.get(relation.from);
		if (list) list.push(relation.to);
		else outgoing.set(relation.from, [relation.to]);
	}

	const seen = new Set([from]);
	const queue = [from];
	while (queue.length > 0) {
		const current = queue.shift() as string;
		if (current === to) return true;
		for (const next of outgoing.get(current) ?? []) {
			if (seen.has(next)) continue;
			seen.add(next);
			queue.push(next);
		}
	}
	return false;
}

export function rejectionReason(graph: NoteGraph, draft: RelationDraft): string | null {
	if (draft.from.path === draft.to.path) return "A task cannot relate to itself.";

	const existing = graph.relations.find(
		(relation) =>
			relation.kind !== "mention" &&
			((relation.from === draft.from.path && relation.to === draft.to.path) ||
				(relation.from === draft.to.path && relation.to === draft.from.path))
	);
	if (existing) return "These tasks are already related.";

	if (isOrderingKind(draft.kind) && reaches(graph, draft.to.path, draft.from.path)) {
		return "That would close a dependency cycle.";
	}

	return null;
}
