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

const PRIORITY_ORDER = ["high", "medium", "low"];

function rankOf(order: string[], value: string): number {
	const index = order.findIndex((entry) => entry.toLowerCase() === value.toLowerCase());
	return index === -1 ? order.length : index;
}

const REFERENCE_GROUP: NodeGroup = { key: "reference", label: "Reference notes", rank: 99 };

export function grouperFor(mode: GroupingMode, statusOrder: string[]): (record: NoteRecord) => NodeGroup {
	if (mode !== "none") {
		const inner = grouperByField(mode, statusOrder);
		return (record) => (record.kind === "reference" ? REFERENCE_GROUP : inner(record));
	}

	return () => ({ key: "", label: "", rank: 0 });
}

function grouperByField(mode: GroupingMode, statusOrder: string[]): (record: NoteRecord) => NodeGroup {
	if (mode === "status") {
		return (record) => ({
			key: record.status || "—",
			label: record.status || "No status",
			rank: rankOf(statusOrder, record.status),
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

/**
 * Maps a status to the stage the default vocabulary styles it as, by its
 * position in `statusOrder`: first is todo, last is done, the one before
 * last is review when there are four or more, anything else is doing.
 */
export function statusStage(statusOrder: string[], status: string): string {
	const index = statusOrder.findIndex((entry) => entry.toLowerCase() === status.toLowerCase());
	if (index === -1) return status.toLowerCase().replace(/\s+/g, "-");
	if (index === 0) return "todo";
	if (index === statusOrder.length - 1) return "done";
	if (statusOrder.length >= 4 && index === statusOrder.length - 2) return "review";
	return "doing";
}

export function compareGroups(a: NodeGroup, b: NodeGroup): number {
	if (a.rank !== b.rank) return a.rank - b.rank;
	return a.label.localeCompare(b.label, undefined, { numeric: true });
}
