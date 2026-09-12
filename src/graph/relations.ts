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

const RELATION_KEYS: Record<string, RelationKey> = Object.fromEntries(
	RELATION_KEY_LIST.map((entry) => [normalizeKey(entry.literal), entry])
);

/** Frontmatter keys the plugin renders as a task searcher instead of plain text. */
export const RELATION_PROPERTY_KEYS = RELATION_KEY_LIST.map((entry) => entry.literal);

export const CANONICAL_RELATION_KEYS: Record<RelationKind, string> = {
	dependency: "blocked_by",
	continuation: "continues",
	related: "related",
	mention: "",
};

export const RELATION_LABELS: Record<RelationKind, string> = {
	dependency: "Blocks",
	continuation: "Continues",
	related: "Related",
	mention: "Mentions",
};

function normalizeKey(key: string): string {
	return key.toLowerCase().replace(/[\s_-]/g, "");
}

export function relationKeyOf(key: string): RelationKey | null {
	return RELATION_KEYS[normalizeKey(key)] ?? null;
}

export function parseLinkTarget(raw: unknown): string | null {
	if (typeof raw !== "string") {
		if (raw && typeof raw === "object" && "path" in raw) {
			return parseLinkTarget((raw as { path: unknown }).path);
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
