import type { NoteRecord } from "./model";

export type GroupingMode = "status" | "milestone" | "priority" | "none";

export interface NodeGroup {
	key: string;
	label: string;
	rank: number;
}

export const GROUPING_LABELS: Record<GroupingMode, string> = {
	status: "Status",
	milestone: "Milestone",
	priority: "Priority",
	none: "Nothing",
};

const STATUS_ORDER = ["todo", "doing", "review", "done"];
const PRIORITY_ORDER = ["high", "medium", "low"];

function rankOf(order: string[], value: string): number {
	const index = order.indexOf(value.toLowerCase());
	return index === -1 ? order.length : index;
}

const REFERENCE_GROUP: NodeGroup = { key: "reference", label: "Reference notes", rank: 99 };

export function grouperFor(mode: GroupingMode): (record: NoteRecord) => NodeGroup {
	if (mode !== "none") {
		const inner = grouperByField(mode);
		return (record) => (record.kind === "reference" ? REFERENCE_GROUP : inner(record));
	}

	return () => ({ key: "", label: "", rank: 0 });
}

function grouperByField(mode: GroupingMode): (record: NoteRecord) => NodeGroup {
	if (mode === "status") {
		return (record) => ({
			key: record.status || "—",
			label: record.status || "No status",
			rank: rankOf(STATUS_ORDER, record.status),
		});
	}

	if (mode === "priority") {
		return (record) => ({
			key: record.priority || "—",
			label: record.priority || "No priority",
			rank: rankOf(PRIORITY_ORDER, record.priority),
		});
	}

	if (mode === "milestone") {
		return (record) => ({
			key: record.milestone ?? "—",
			label: record.milestone ?? "No milestone",
			rank: record.milestone ? 0 : 1,
		});
	}

	return () => ({ key: "", label: "", rank: 0 });
}

export function compareGroups(a: NodeGroup, b: NodeGroup): number {
	if (a.rank !== b.rank) return a.rank - b.rank;
	return a.label.localeCompare(b.label, undefined, { numeric: true });
}
