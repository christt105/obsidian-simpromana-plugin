import type { RelationKind } from "./model";

interface RelationKey {
	kind: RelationKind;
	/** The declared target comes before the declaring task. */
	inverted: boolean;
	/** How this alias is actually spelled when written to frontmatter. */
	literal: string;
}

const RELATION_KEY_LIST: RelationKey[] = [
	{ kind: "dependency", inverted: false, literal: "blocks" },
	{ kind: "dependency", inverted: false, literal: "blocking" },
	{ kind: "dependency", inverted: true, literal: "blocked_by" },
	{ kind: "dependency", inverted: true, literal: "depends_on" },
	{ kind: "continuation", inverted: false, literal: "continued_by" },
	{ kind: "continuation", inverted: false, literal: "followed_by" },
	{ kind: "continuation", inverted: true, literal: "continues" },
	{ kind: "continuation", inverted: true, literal: "follows" },
	{ kind: "related", inverted: false, literal: "related" },
	{ kind: "related", inverted: false, literal: "related_to" },
];

/** The keys the plugin writes for each relation kind; also recognized when reading. */
export type CanonicalRelationKeys = Record<Exclude<RelationKind, "mention">, string>;

export const DEFAULT_CANONICAL_RELATION_KEYS: CanonicalRelationKeys = {
	dependency: "blocked_by",
	continuation: "continues",
	related: "related",
};

/** Maps frontmatter keys to relation kinds: the built-in aliases plus the configured canonical keys. */
export class RelationKeys {
	private readonly byKey: Record<string, RelationKey>;

	constructor(private readonly canonical: CanonicalRelationKeys = DEFAULT_CANONICAL_RELATION_KEYS) {
		const configured: RelationKey[] = [
			{ kind: "dependency", inverted: true, literal: canonical.dependency },
			{ kind: "continuation", inverted: true, literal: canonical.continuation },
			{ kind: "related", inverted: false, literal: canonical.related },
		];
		this.byKey = Object.fromEntries(
			[...RELATION_KEY_LIST, ...configured].map((entry) => [normalizeKey(entry.literal), entry])
		);
	}

	keyOf(key: string): RelationKey | null {
		return this.byKey[normalizeKey(key)] ?? null;
	}

	/** The key new relations of `kind` are written under. */
	canonicalKey(kind: RelationKind): string {
		return kind === "mention" ? "" : this.canonical[kind];
	}

	/** Frontmatter keys the plugin renders as a task searcher instead of plain text. */
	propertyKeys(): string[] {
		return [...new Set(Object.values(this.byKey).map((entry) => entry.literal))];
	}
}

export const RELATION_LABELS: Record<RelationKind, string> = {
	dependency: "Blocks",
	continuation: "Continues",
	related: "Related",
	mention: "Mentions",
};

function normalizeKey(key: string): string {
	return key.toLowerCase().replace(/[\s_-]/g, "");
}

export function parseLinkTarget(raw: unknown): string | null {
	if (typeof raw !== "string") {
		if (raw && typeof raw === "object" && "path" in raw) {
			return parseLinkTarget(raw.path);
		}
		return null;
	}
	const match = raw.trim().match(/^\[\[(.*)\]\]$/);
	const inner = (match ? match[1] : raw).trim();
	const target = inner.split("|")[0].split("#")[0].trim();
	return target.length > 0 ? target : null;
}

export function toTargetList(value: unknown): string[] {
	if (value === null || value === undefined) return [];
	const values = Array.isArray(value) ? value : [value];
	return values
		.map(parseLinkTarget)
		.filter((target): target is string => target !== null);
}
