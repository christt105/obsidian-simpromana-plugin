import type { NoteGraph, NoteRecord, NoteRelation, RelationKind, UnresolvedRelation } from "./model";
import { relationKeyOf, toTargetList } from "./relations";

export type LinkResolver = (target: string, sourcePath: string) => string | null;

export interface BuildOptions {
	mentions: boolean;
}

export interface Subgraph extends NoteGraph {
	external: Set<string>;
}

function relationId(relation: NoteRelation): string {
	if (relation.kind === "dependency" || relation.kind === "continuation") {
		return `${relation.kind}|${relation.from}|${relation.to}`;
	}
	const [a, b] = [relation.from, relation.to].sort();
	return `${relation.kind}|${a}|${b}`;
}

function pairId(from: string, to: string): string {
	const [a, b] = [from, to].sort();
	return `${a}|${b}`;
}

function orient(source: string, target: string, kind: RelationKind, inverted: boolean): NoteRelation {
	if (kind !== "dependency" && kind !== "continuation") {
		const [from, to] = [source, target].sort();
		return { from, to, kind };
	}
	return inverted ? { from: target, to: source, kind } : { from: source, to: target, kind };
}

export function buildNoteGraph(
	records: NoteRecord[],
	resolve: LinkResolver,
	options: BuildOptions = { mentions: true }
): NoteGraph {
	const known = new Set(records.map((record) => record.path));
	const relations = new Map<string, NoteRelation>();
	const pairs = new Set<string>();
	const unresolved: UnresolvedRelation[] = [];

	for (const record of records) {
		for (const [key, value] of Object.entries(record.frontmatter)) {
			const relationKey = relationKeyOf(key);
			if (!relationKey) continue;

			for (const target of toTargetList(value)) {
				const targetPath = resolve(target, record.path);
				if (!targetPath || !known.has(targetPath)) {
					unresolved.push({ from: record.path, kind: relationKey.kind, target });
					continue;
				}
				if (targetPath === record.path) continue;

				const relation = orient(record.path, targetPath, relationKey.kind, relationKey.inverted);
				relations.set(relationId(relation), relation);
				pairs.add(pairId(relation.from, relation.to));
			}
		}
	}

	if (options.mentions) {
		for (const record of records) {
			for (const link of record.links) {
				const targetPath = resolve(link, record.path);
				if (!targetPath || !known.has(targetPath) || targetPath === record.path) continue;
				if (pairs.has(pairId(record.path, targetPath))) continue;

				const relation = orient(record.path, targetPath, "mention", false);
				relations.set(relationId(relation), relation);
			}
		}
	}

	return { nodes: records, relations: [...relations.values()], unresolved };
}

export function selectSubgraph(graph: NoteGraph, isCore: (record: NoteRecord) => boolean): Subgraph {
	const core = new Set(graph.nodes.filter(isCore).map((record) => record.path));
	const external = new Set<string>();

	const relations = graph.relations.filter((relation) => {
		const fromCore = core.has(relation.from);
		const toCore = core.has(relation.to);
		if (!fromCore && !toCore) return false;
		if (!fromCore) external.add(relation.from);
		if (!toCore) external.add(relation.to);
		return true;
	});

	const kept = new Set([...core, ...external]);
	return {
		nodes: graph.nodes.filter((record) => kept.has(record.path)),
		relations,
		unresolved: graph.unresolved.filter((entry) => core.has(entry.from)),
		external,
	};
}

export function dropNodes(graph: Subgraph, shouldDrop: (record: NoteRecord) => boolean): Subgraph {
	const kept = new Set(
		graph.nodes.filter((record) => !shouldDrop(record)).map((record) => record.path)
	);
	return {
		nodes: graph.nodes.filter((record) => kept.has(record.path)),
		relations: graph.relations.filter(
			(relation) => kept.has(relation.from) && kept.has(relation.to)
		),
		unresolved: graph.unresolved,
		external: new Set([...graph.external].filter((path) => kept.has(path))),
	};
}

export function connectedPaths(graph: NoteGraph): Set<string> {
	const connected = new Set<string>();
	for (const relation of graph.relations) {
		connected.add(relation.from);
		connected.add(relation.to);
	}
	return connected;
}
