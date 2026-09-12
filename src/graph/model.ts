export type RelationKind = "dependency" | "continuation" | "related" | "mention";

export type NoteKind = "task" | "reference";

export interface NoteRecord {
	kind: NoteKind;
	path: string;
	basename: string;
	title: string;
	id: string;
	projectPath: string | null;
	projectName: string | null;
	status: string;
	priority: string;
	milestone: string | null;
	epic: string | null;
	frontmatter: Record<string, unknown>;
	links: string[];
	/** Outside the selected project, pulled in by a relation. */
	external?: boolean;
	/** Mentions dropped because the node is a hub. */
	hiddenMentions?: number;
}

export interface NoteRelation {
	from: string;
	to: string;
	kind: RelationKind;
}

export interface UnresolvedRelation {
	from: string;
	kind: RelationKind;
	target: string;
}

export interface NoteGraph {
	nodes: NoteRecord[];
	relations: NoteRelation[];
	unresolved: UnresolvedRelation[];
}

const ORDERING_KINDS: RelationKind[] = ["dependency", "continuation"];

export function isOrderingKind(kind: RelationKind): boolean {
	return ORDERING_KINDS.includes(kind);
}
