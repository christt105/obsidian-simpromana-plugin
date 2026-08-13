import type { RelationKind, TaskGraph, TaskRecord, TaskRelation, UnresolvedRelation } from "./model";
import { relationKeyOf, toTargetList } from "./relations";

export type LinkResolver = (target: string, sourcePath: string) => string | null;

export interface Subgraph extends TaskGraph {
	external: Set<string>;
}

function relationId(relation: TaskRelation): string {
	if (relation.kind === "related") {
		const [a, b] = [relation.from, relation.to].sort();
		return `related|${a}|${b}`;
	}
	return `${relation.kind}|${relation.from}|${relation.to}`;
}

function orient(source: string, target: string, kind: RelationKind, inverted: boolean): TaskRelation {
	if (kind === "related") {
		const [from, to] = [source, target].sort();
		return { from, to, kind };
	}
	return inverted ? { from: target, to: source, kind } : { from: source, to: target, kind };
}

export function buildTaskGraph(records: TaskRecord[], resolve: LinkResolver): TaskGraph {
	const known = new Set(records.map((record) => record.path));
	const relations = new Map<string, TaskRelation>();
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
			}
		}
	}

	return { nodes: records, relations: [...relations.values()], unresolved };
}

export function selectSubgraph(graph: TaskGraph, isCore: (record: TaskRecord) => boolean): Subgraph {
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

export function dropNodes(graph: Subgraph, shouldDrop: (record: TaskRecord) => boolean): Subgraph {
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

export function connectedPaths(graph: TaskGraph): Set<string> {
	const connected = new Set<string>();
	for (const relation of graph.relations) {
		connected.add(relation.from);
		connected.add(relation.to);
	}
	return connected;
}
