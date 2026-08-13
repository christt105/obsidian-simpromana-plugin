export type RelationKind = "dependency" | "continuation" | "related";

export interface TaskRecord {
	path: string;
	basename: string;
	title: string;
	id: string;
	projectPath: string | null;
	projectName: string | null;
	status: string;
	priority: string;
	milestone: string | null;
	frontmatter: Record<string, unknown>;
}

export interface TaskRelation {
	from: string;
	to: string;
	kind: RelationKind;
}

export interface UnresolvedRelation {
	from: string;
	kind: RelationKind;
	target: string;
}

export interface TaskGraph {
	nodes: TaskRecord[];
	relations: TaskRelation[];
	unresolved: UnresolvedRelation[];
}

export const ORDERING_KINDS: RelationKind[] = ["dependency", "continuation"];

export function isOrderingKind(kind: RelationKind): boolean {
	return ORDERING_KINDS.includes(kind);
}
