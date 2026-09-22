import { describe, expect, it } from "vitest";
import type { NoteRecord } from "./model";
import {
	buildNoteGraph,
	collapseHubs,
	connectedPaths,
	dropNodes,
	filterRelationKinds,
	selectSubgraph,
	type LinkResolver,
} from "./build";

const identity: LinkResolver = (target) => target;

function note(path: string, overrides: Partial<NoteRecord> = {}): NoteRecord {
	return {
		kind: "task",
		path,
		basename: path,
		title: path,
		id: "",
		projectPath: null,
		projectName: null,
		status: "Todo",
		priority: "medium",
		milestone: null,
		epic: null,
		frontmatter: {},
		links: [],
		...overrides,
	};
}

describe("buildNoteGraph", () => {
	it("orients blocked_by so the relation points from blocker to blocked", () => {
		const a = note("A", { frontmatter: { blocked_by: "B" } });
		const b = note("B");
		const graph = buildNoteGraph([a, b], identity);
		expect(graph.relations).toEqual([{ from: "B", to: "A", kind: "dependency" }]);
	});

	it("orients blocks (the non-inverted alias) from blocker to blocked directly", () => {
		const a = note("A", { frontmatter: { blocks: "B" } });
		const b = note("B");
		const graph = buildNoteGraph([a, b], identity);
		expect(graph.relations).toEqual([{ from: "A", to: "B", kind: "dependency" }]);
	});

	it("sorts related edges by path so both declaring sides produce the same edge", () => {
		const a = note("A", { frontmatter: { related: "B" } });
		const b = note("B", { frontmatter: { related: "A" } });
		const graph = buildNoteGraph([a, b], identity);
		expect(graph.relations).toEqual([{ from: "A", to: "B", kind: "related" }]);
	});

	it("records an unresolved relation when the target isn't a known note", () => {
		const a = note("A", { frontmatter: { blocked_by: "Missing" } });
		const graph = buildNoteGraph([a], identity);
		expect(graph.relations).toEqual([]);
		expect(graph.unresolved).toEqual([{ from: "A", kind: "dependency", target: "Missing" }]);
	});

	it("drops a self-referencing relation silently", () => {
		const a = note("A", { frontmatter: { related: "A" } });
		const graph = buildNoteGraph([a], identity);
		expect(graph.relations).toEqual([]);
		expect(graph.unresolved).toEqual([]);
	});

	it("adds a mention edge for a body link not already covered by a declared relation", () => {
		const a = note("A", { links: ["B"] });
		const b = note("B");
		const graph = buildNoteGraph([a, b], identity);
		expect(graph.relations).toEqual([{ from: "A", to: "B", kind: "mention" }]);
	});

	it("skips the mention edge when the pair already has a declared relation", () => {
		const a = note("A", { frontmatter: { blocked_by: "B" }, links: ["B"] });
		const b = note("B");
		const graph = buildNoteGraph([a, b], identity);
		expect(graph.relations).toEqual([{ from: "B", to: "A", kind: "dependency" }]);
	});

	it("omits mentions entirely when options.mentions is false", () => {
		const a = note("A", { links: ["B"] });
		const b = note("B");
		const graph = buildNoteGraph([a, b], identity, { mentions: false });
		expect(graph.relations).toEqual([]);
	});
});

describe("selectSubgraph", () => {
	it("keeps relations that touch a core node and marks the other end as external", () => {
		const a = note("A");
		const b = note("B");
		const c = note("C");
		const graph = {
			nodes: [a, b, c],
			relations: [
				{ from: "A", to: "B", kind: "related" as const },
				{ from: "B", to: "C", kind: "related" as const },
			],
			unresolved: [],
		};
		const sub = selectSubgraph(graph, (n) => n.path === "A");
		expect(sub.nodes.map((n) => n.path).sort()).toEqual(["A", "B"]);
		expect(sub.external).toEqual(new Set(["B"]));
		expect(sub.relations).toHaveLength(1);
	});
});

describe("dropNodes", () => {
	it("removes a node and any relation touching it", () => {
		const a = note("A");
		const b = note("B");
		const sub = {
			nodes: [a, b],
			relations: [{ from: "A", to: "B", kind: "related" as const }],
			unresolved: [],
			external: new Set<string>(),
		};
		const dropped = dropNodes(sub, (n) => n.path === "B");
		expect(dropped.nodes).toEqual([a]);
		expect(dropped.relations).toEqual([]);
	});
});

describe("collapseHubs", () => {
	it("hides mention edges above the degree limit but keeps declared relations", () => {
		const nodes = ["A", "B", "C", "D"].map((p) => note(p));
		const sub = {
			nodes,
			relations: [
				{ from: "A", to: "B", kind: "mention" as const },
				{ from: "A", to: "C", kind: "mention" as const },
				{ from: "A", to: "D", kind: "dependency" as const },
			],
			unresolved: [],
			external: new Set<string>(),
		};
		const { graph, hidden } = collapseHubs(sub, 2);
		expect(graph.relations).toEqual([{ from: "A", to: "D", kind: "dependency" }]);
		expect(hidden.get("A")).toBe(2);
	});

	it("is a no-op when the limit is not exceeded", () => {
		const nodes = ["A", "B"].map((p) => note(p));
		const sub = {
			nodes,
			relations: [{ from: "A", to: "B", kind: "mention" as const }],
			unresolved: [],
			external: new Set<string>(),
		};
		const { graph, hidden } = collapseHubs(sub, 5);
		expect(graph.relations).toEqual(sub.relations);
		expect(hidden.size).toBe(0);
	});
});

describe("filterRelationKinds", () => {
	it("keeps only relations whose kind is enabled", () => {
		const sub = {
			nodes: [],
			relations: [
				{ from: "A", to: "B", kind: "dependency" as const },
				{ from: "A", to: "C", kind: "mention" as const },
			],
			unresolved: [],
			external: new Set<string>(),
		};
		const filtered = filterRelationKinds(sub, {
			dependency: true,
			continuation: true,
			related: true,
			mention: false,
		});
		expect(filtered.relations).toEqual([{ from: "A", to: "B", kind: "dependency" }]);
	});
});

describe("connectedPaths", () => {
	it("collects every path that appears in at least one relation", () => {
		const graph = {
			nodes: [],
			relations: [
				{ from: "A", to: "B", kind: "related" as const },
				{ from: "B", to: "C", kind: "related" as const },
			],
			unresolved: [],
		};
		expect(connectedPaths(graph)).toEqual(new Set(["A", "B", "C"]));
	});
});
