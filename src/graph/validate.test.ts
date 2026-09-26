import { describe, expect, it } from "vitest";
import type { NoteGraph, NoteRecord, NoteRelation } from "./model";
import { rejectionReason } from "./validate";

function note(path: string): NoteRecord {
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
	};
}

function graphWith(relations: NoteRelation[]): NoteGraph {
	const paths = new Set(relations.flatMap((r) => [r.from, r.to]));
	return { nodes: [...paths].map(note), relations, unresolved: [] };
}

describe("rejectionReason", () => {
	it("rejects a task relating to itself", () => {
		const a = note("A");
		const graph = graphWith([]);
		expect(rejectionReason(graph, { from: a, to: a, kind: "related" })).toMatch(/itself/);
	});

	it("rejects a duplicate relation regardless of declared direction", () => {
		const a = note("A");
		const b = note("B");
		const graph = graphWith([{ from: "A", to: "B", kind: "dependency" }]);
		expect(rejectionReason(graph, { from: b, to: a, kind: "related" })).toMatch(/already related/);
	});

	it("ignores mention edges when checking for an existing relation", () => {
		const a = note("A");
		const b = note("B");
		const graph = graphWith([{ from: "A", to: "B", kind: "mention" }]);
		expect(rejectionReason(graph, { from: a, to: b, kind: "related" })).toBeNull();
	});

	it("rejects an ordering relation that would close a dependency cycle", () => {
		const a = note("A");
		const c = note("C");
		// A blocked_by B blocked_by C, i.e. edges C -> B -> A (dependency: from=blocker, to=blocked... see build.ts orientation)
		const graph = graphWith([
			{ from: "C", to: "B", kind: "dependency" },
			{ from: "B", to: "A", kind: "dependency" },
		]);
		expect(rejectionReason(graph, { from: a, to: c, kind: "dependency" })).toMatch(/cycle/);
	});

	it("allows an ordering relation that doesn't close a cycle", () => {
		const a = note("A");
		const d = note("D");
		const graph = graphWith([
			{ from: "C", to: "B", kind: "dependency" },
			{ from: "B", to: "A", kind: "dependency" },
		]);
		expect(rejectionReason(graph, { from: a, to: d, kind: "dependency" })).toBeNull();
	});

	it("doesn't apply cycle detection to non-ordering kinds", () => {
		const a = note("A");
		const c = note("C");
		const graph = graphWith([
			{ from: "C", to: "B", kind: "dependency" },
			{ from: "B", to: "A", kind: "dependency" },
		]);
		expect(rejectionReason(graph, { from: a, to: c, kind: "related" })).toBeNull();
	});
});
