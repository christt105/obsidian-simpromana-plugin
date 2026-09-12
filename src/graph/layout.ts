import { isOrderingKind } from "./model";
import type { NoteGraph, NoteRecord, NoteRelation } from "./model";
import { compareGroups, grouperFor } from "./grouping";
import type { GroupingMode, NodeGroup } from "./grouping";

export interface Point {
	x: number;
	y: number;
}

export interface LayoutNode {
	record: NoteRecord;
	x: number;
	y: number;
	width: number;
	height: number;
	layer: number;
	unlinked: boolean;
}

export interface LayoutEdge {
	relation: NoteRelation;
	points: Point[];
	cyclic: boolean;
}

export interface LayoutGroup {
	label: string;
	x: number;
	y: number;
	width: number;
}

export interface LayoutEpic {
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface GraphLayout {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	groups: LayoutGroup[];
	epics: LayoutEpic[];
	width: number;
	height: number;
	unlinkedTop: number | null;
}

export const EPIC_PADDING = 20;

export interface LayoutOptions {
	nodeWidth: number;
	nodeHeight: number;
	layerGap: number;
	rowGap: number;
	componentGap: number;
	dummyHeight: number;
	headerHeight: number;
	grouping: GroupingMode;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
	nodeWidth: 210,
	nodeHeight: 76,
	layerGap: 76,
	rowGap: 22,
	componentGap: 56,
	dummyHeight: 14,
	headerHeight: 34,
	grouping: "status",
};

interface Cell {
	key: string;
	record: NoteRecord | null;
	layer: number;
	order: number;
	y: number;
	height: number;
}

interface OrderingEdge {
	relation: NoteRelation;
	source: string;
	target: string;
	cyclic: boolean;
	dummies: Cell[];
}

function undirectedAdjacency(relations: NoteRelation[]): Map<string, string[]> {
	const adjacency = new Map<string, string[]>();
	const push = (from: string, to: string) => {
		const list = adjacency.get(from);
		if (list) list.push(to);
		else adjacency.set(from, [to]);
	};
	for (const relation of relations) {
		push(relation.from, relation.to);
		push(relation.to, relation.from);
	}
	return adjacency;
}

function findBackEdges(edges: NoteRelation[]): Set<NoteRelation> {
	const outgoing = new Map<string, NoteRelation[]>();
	for (const edge of edges) {
		const list = outgoing.get(edge.from);
		if (list) list.push(edge);
		else outgoing.set(edge.from, [edge]);
	}

	const state = new Map<string, number>();
	const back = new Set<NoteRelation>();

	for (const edge of edges) {
		for (const start of [edge.from, edge.to]) {
			if (state.get(start)) continue;
			state.set(start, 1);
			const stack = [{ node: start, edges: outgoing.get(start) ?? [], index: 0 }];

			while (stack.length > 0) {
				const frame = stack[stack.length - 1];
				if (frame.index >= frame.edges.length) {
					state.set(frame.node, 2);
					stack.pop();
					continue;
				}
				const next = frame.edges[frame.index++];
				const visited = state.get(next.to) ?? 0;
				if (visited === 1) {
					back.add(next);
				} else if (visited === 0) {
					state.set(next.to, 1);
					stack.push({ node: next.to, edges: outgoing.get(next.to) ?? [], index: 0 });
				}
			}
		}
	}

	return back;
}

function assignLayers(
	paths: string[],
	edges: OrderingEdge[],
	relations: NoteRelation[]
): Map<string, number> {
	const layer = new Map<string, number>(paths.map((path) => [path, 0]));
	const outgoing = new Map<string, OrderingEdge[]>();
	const inDegree = new Map<string, number>(paths.map((path) => [path, 0]));
	const constrained = new Set<string>();

	for (const edge of edges) {
		const list = outgoing.get(edge.source);
		if (list) list.push(edge);
		else outgoing.set(edge.source, [edge]);
		inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
		constrained.add(edge.source);
		constrained.add(edge.target);
	}

	const queue = paths.filter((path) => (inDegree.get(path) ?? 0) === 0);
	let processed = 0;

	while (queue.length > 0) {
		const path = queue.shift() as string;
		processed++;
		for (const edge of outgoing.get(path) ?? []) {
			const candidate = (layer.get(path) ?? 0) + 1;
			if (candidate > (layer.get(edge.target) ?? 0)) layer.set(edge.target, candidate);
			const remaining = (inDegree.get(edge.target) ?? 0) - 1;
			inDegree.set(edge.target, remaining);
			if (remaining === 0) queue.push(edge.target);
		}
	}

	if (processed < paths.length) {
		for (const edge of edges) {
			const candidate = (layer.get(edge.source) ?? 0) + 1;
			if (candidate > (layer.get(edge.target) ?? 0)) layer.set(edge.target, candidate);
		}
	}

	spreadUnconstrained(paths, relations, layer, constrained);
	return layer;
}

function spreadUnconstrained(
	paths: string[],
	relations: NoteRelation[],
	layer: Map<string, number>,
	constrained: Set<string>
): void {
	const free = paths.filter((path) => !constrained.has(path));
	if (free.length === 0) return;

	const adjacency = undirectedAdjacency(relations);
	const settled = new Set(constrained);
	const queue = [...constrained].sort(
		(a, b) => (layer.get(a) ?? 0) - (layer.get(b) ?? 0)
	);

	const degreeOf = (path: string) => (adjacency.get(path) ?? []).length;
	const pending = new Set(free.filter((path) => degreeOf(path) > 0));

	while (pending.size > 0) {
		if (queue.length === 0) {
			const root = [...pending].sort(
				(a, b) => degreeOf(b) - degreeOf(a) || a.localeCompare(b)
			)[0];
			layer.set(root, 0);
			settled.add(root);
			pending.delete(root);
			queue.push(root);
		}

		const current = queue.shift() as string;
		for (const neighbour of adjacency.get(current) ?? []) {
			if (settled.has(neighbour)) continue;
			layer.set(neighbour, (layer.get(current) ?? 0) + 1);
			settled.add(neighbour);
			pending.delete(neighbour);
			queue.push(neighbour);
		}
	}
}

function groupComponents(paths: string[], relations: NoteRelation[]): Map<string, number> {
	const parent = new Map<string, string>(paths.map((path) => [path, path]));

	const find = (path: string): string => {
		let root = path;
		while (parent.get(root) !== root) root = parent.get(root) as string;
		let cursor = path;
		while (parent.get(cursor) !== root) {
			const next = parent.get(cursor) as string;
			parent.set(cursor, root);
			cursor = next;
		}
		return root;
	};

	for (const relation of relations) {
		const a = find(relation.from);
		const b = find(relation.to);
		if (a !== b) parent.set(a, b);
	}

	const ids = new Map<string, number>();
	const components = new Map<string, number>();
	for (const path of paths) {
		const root = find(path);
		let id = ids.get(root);
		if (id === undefined) {
			id = ids.size;
			ids.set(root, id);
		}
		components.set(path, id);
	}
	return components;
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? sorted[middle]
		: (sorted[middle - 1] + sorted[middle]) / 2;
}

function orderLayers(layers: Cell[][], neighbours: Map<string, { previous: Cell[]; next: Cell[] }>): void {
	const applyOrder = (layer: Cell[]) => {
		layer.forEach((cell, index) => (cell.order = index));
	};
	layers.forEach(applyOrder);

	for (let sweep = 0; sweep < 6; sweep++) {
		const downwards = sweep % 2 === 0;
		const indexes = downwards
			? layers.map((_, index) => index).slice(1)
			: layers.map((_, index) => index).slice(0, -1).reverse();

		for (const index of indexes) {
			const layer = layers[index];
			const scores = new Map<string, number>();
			for (const cell of layer) {
				const links = neighbours.get(cell.key);
				const side = downwards ? links?.previous : links?.next;
				const barycentre = median((side ?? []).map((other) => other.order));
				scores.set(cell.key, barycentre ?? cell.order);
			}
			layer.sort((a, b) => (scores.get(a.key) as number) - (scores.get(b.key) as number));
			applyOrder(layer);
		}
	}
}

function assignRows(
	layers: Cell[][],
	neighbours: Map<string, { previous: Cell[]; next: Cell[] }>,
	rowGap: number
): void {
	for (const layer of layers) {
		let cursor = 0;
		for (const cell of layer) {
			cell.y = cursor;
			cursor += cell.height + rowGap;
		}
	}

	for (let sweep = 0; sweep < 4; sweep++) {
		const downwards = sweep % 2 === 0;
		const indexes = downwards
			? layers.map((_, index) => index).slice(1)
			: layers.map((_, index) => index).slice(0, -1).reverse();

		for (const index of indexes) {
			let cursor = Number.NEGATIVE_INFINITY;
			for (const cell of layers[index]) {
				const links = neighbours.get(cell.key);
				const side = downwards ? links?.previous : links?.next;
				const centre = median((side ?? []).map((other) => other.y + other.height / 2));
				const desired = centre === null ? cell.y : centre - cell.height / 2;
				cell.y = Math.max(cursor, desired);
				cursor = cell.y + cell.height + rowGap;
			}
		}
	}
}

type Side = "left" | "right" | "top" | "bottom";

interface Endpoint {
	node: LayoutNode;
	side: Side;
	towards: Point;
	point: Point;
}

interface PendingEdge {
	relation: NoteRelation;
	cyclic: boolean;
	from: Endpoint;
	to: Endpoint;
	waypoints: Point[];
}

function centreOf(node: LayoutNode): Point {
	return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function sideTowards(node: LayoutNode, towards: Point): Side {
	const centre = centreOf(node);
	const dx = towards.x - centre.x;
	const dy = towards.y - centre.y;
	if (Math.abs(dx) >= node.width / 2) return dx >= 0 ? "right" : "left";
	return dy >= 0 ? "bottom" : "top";
}

/**
 * Spreads the edges leaving a node along the border instead of stacking them
 * on a single point, keeping the order they arrive in so they do not cross.
 */
function assignPorts(endpoints: Endpoint[]): void {
	const groups = new Map<string, Endpoint[]>();
	for (const endpoint of endpoints) {
		const key = `${endpoint.node.record.path}|${endpoint.side}`;
		const group = groups.get(key);
		if (group) group.push(endpoint);
		else groups.set(key, [endpoint]);
	}

	for (const group of groups.values()) {
		const { node, side } = group[0];
		const vertical = side === "left" || side === "right";
		group.sort((a, b) =>
			vertical ? a.towards.y - b.towards.y : a.towards.x - b.towards.x
		);

		const span = vertical ? node.height : node.width;
		const inset = Math.min(10, span / 4);
		const usable = span - inset * 2;

		group.forEach((endpoint, index) => {
			const offset = inset + (usable * (index + 1)) / (group.length + 1);
			endpoint.point = vertical
				? { x: side === "right" ? node.x + node.width : node.x, y: node.y + offset }
				: { x: node.x + offset, y: side === "bottom" ? node.y + node.height : node.y };
		});
	}
}

export function layoutGraph(graph: NoteGraph, options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS): GraphLayout {
	const records = new Map(graph.nodes.map((record) => [record.path, record]));
	const relations = graph.relations.filter(
		(relation) => records.has(relation.from) && records.has(relation.to)
	);

	const orderingRelations = relations.filter((relation) => isOrderingKind(relation.kind));
	const backEdges = findBackEdges(orderingRelations);
	const ordering: OrderingEdge[] = orderingRelations.map((relation) => {
		const cyclic = backEdges.has(relation);
		return {
			relation,
			source: cyclic ? relation.to : relation.from,
			target: cyclic ? relation.from : relation.to,
			cyclic,
			dummies: [],
		};
	});

	const paths = [...records.keys()];
	const layerOf = assignLayers(paths, ordering, relations);
	const componentOf = groupComponents(paths, relations);

	const degree = new Map<string, number>(paths.map((path) => [path, 0]));
	for (const relation of relations) {
		degree.set(relation.from, (degree.get(relation.from) ?? 0) + 1);
		degree.set(relation.to, (degree.get(relation.to) ?? 0) + 1);
	}

	const linked = paths.filter((path) => (degree.get(path) ?? 0) > 0);
	const unlinked = paths.filter((path) => (degree.get(path) ?? 0) === 0);

	const cells = new Map<string, Cell>();
	for (const path of linked) {
		cells.set(path, {
			key: path,
			record: records.get(path) as NoteRecord,
			layer: layerOf.get(path) ?? 0,
			order: 0,
			y: 0,
			height: options.nodeHeight,
		});
	}

	const components = new Map<number, string[]>();
	for (const path of linked) {
		const id = componentOf.get(path) as number;
		const list = components.get(id);
		if (list) list.push(path);
		else components.set(id, [path]);
	}

	const step = options.nodeWidth + options.layerGap;
	const layoutNodes: LayoutNode[] = [];
	const layoutEdges: LayoutEdge[] = [];
	const layoutGroups: LayoutGroup[] = [];
	let maxLayers = 0;
	let top = 0;

	const componentIds = [...components.keys()].sort((a, b) => {
		const sizeDelta = (components.get(b) as string[]).length - (components.get(a) as string[]).length;
		if (sizeDelta !== 0) return sizeDelta;
		return a - b;
	});

	for (const id of componentIds) {
		const members = components.get(id) as string[];
		const memberSet = new Set(members);
		const minLayer = Math.min(...members.map((path) => cells.get(path)?.layer ?? 0));
		for (const path of members) {
			const cell = cells.get(path) as Cell;
			cell.layer -= minLayer;
		}

		const componentEdges = ordering.filter((edge) => memberSet.has(edge.source));
		const layerCount = Math.max(...members.map((path) => (cells.get(path) as Cell).layer)) + 1;
		const layers: Cell[][] = Array.from({ length: layerCount }, () => []);
		for (const path of members) {
			const cell = cells.get(path) as Cell;
			layers[cell.layer].push(cell);
		}

		let dummyCount = 0;
		for (const edge of componentEdges) {
			const source = cells.get(edge.source) as Cell;
			const target = cells.get(edge.target) as Cell;
			for (let layer = source.layer + 1; layer < target.layer; layer++) {
				const dummy: Cell = {
					key: `${id}:dummy:${dummyCount++}`,
					record: null,
					layer,
					order: 0,
					y: 0,
					height: options.dummyHeight,
				};
				edge.dummies.push(dummy);
				layers[layer].push(dummy);
			}
		}

		const neighbours = new Map<string, { previous: Cell[]; next: Cell[] }>();
		const linkOf = (key: string) => {
			let entry = neighbours.get(key);
			if (!entry) {
				entry = { previous: [], next: [] };
				neighbours.set(key, entry);
			}
			return entry;
		};
		const connect = (from: Cell, to: Cell) => {
			linkOf(from.key).next.push(to);
			linkOf(to.key).previous.push(from);
		};

		for (const edge of componentEdges) {
			const chain = [
				cells.get(edge.source) as Cell,
				...edge.dummies,
				cells.get(edge.target) as Cell,
			];
			for (let index = 0; index < chain.length - 1; index++) {
				connect(chain[index], chain[index + 1]);
			}
		}

		for (const relation of relations) {
			if (isOrderingKind(relation.kind)) continue;
			if (!memberSet.has(relation.from) || !memberSet.has(relation.to)) continue;
			const from = cells.get(relation.from) as Cell;
			const to = cells.get(relation.to) as Cell;
			if (to.layer - from.layer === 1) connect(from, to);
			else if (from.layer - to.layer === 1) connect(to, from);
		}

		for (const layer of layers) {
			layer.sort((a, b) => (a.record?.title ?? "").localeCompare(b.record?.title ?? ""));
		}
		orderLayers(layers, neighbours);
		assignRows(layers, neighbours, options.rowGap);

		const allCells = layers.flat();
		const componentTop = Math.min(...allCells.map((cell) => cell.y));
		const componentBottom = Math.max(...allCells.map((cell) => cell.y + cell.height));
		for (const cell of allCells) {
			cell.y += top - componentTop;
		}

		for (const path of members) {
			const cell = cells.get(path) as Cell;
			layoutNodes.push({
				record: cell.record as NoteRecord,
				x: cell.layer * step,
				y: cell.y,
				width: options.nodeWidth,
				height: cell.height,
				layer: cell.layer,
				unlinked: false,
			});
		}

		maxLayers = Math.max(maxLayers, layerCount);
		top += componentBottom - componentTop + options.componentGap;
	}

	const nodeByPath = new Map(layoutNodes.map((node) => [node.record.path, node]));

	const pending: PendingEdge[] = [];
	const endpoints: Endpoint[] = [];

	const addEndpoint = (node: LayoutNode, towards: Point, side: Side): Endpoint => {
		const endpoint: Endpoint = { node, side, towards, point: centreOf(node) };
		endpoints.push(endpoint);
		return endpoint;
	};

	for (const edge of ordering) {
		const source = nodeByPath.get(edge.source);
		const target = nodeByPath.get(edge.target);
		if (!source || !target) continue;

		const waypoints = edge.dummies.map((dummy) => ({
			x: dummy.layer * step + options.nodeWidth / 2,
			y: dummy.y + dummy.height / 2,
		}));

		const firstHop = waypoints[0] ?? centreOf(target);
		const lastHop = waypoints[waypoints.length - 1] ?? centreOf(source);

		pending.push({
			relation: edge.relation,
			cyclic: edge.cyclic,
			from: addEndpoint(source, firstHop, "right"),
			to: addEndpoint(target, lastHop, "left"),
			waypoints,
		});
	}

	for (const relation of relations) {
		if (isOrderingKind(relation.kind)) continue;
		const from = nodeByPath.get(relation.from);
		const to = nodeByPath.get(relation.to);
		if (!from || !to) continue;

		pending.push({
			relation,
			cyclic: false,
			from: addEndpoint(from, centreOf(to), sideTowards(from, centreOf(to))),
			to: addEndpoint(to, centreOf(from), sideTowards(to, centreOf(from))),
			waypoints: [],
		});
	}

	assignPorts(endpoints);

	for (const edge of pending) {
		const points = [edge.from.point, ...edge.waypoints, edge.to.point];
		layoutEdges.push({
			relation: edge.relation,
			points: edge.cyclic ? [...points].reverse() : points,
			cyclic: edge.cyclic,
		});
	}

	let unlinkedTop: number | null = null;

	if (unlinked.length > 0) {
		if (layoutNodes.length > 0) top += options.componentGap;
		unlinkedTop = top;

		const columns = Math.max(4, maxLayers);
		const gridWidth = columns * step - options.layerGap;
		const grouper = grouperFor(options.grouping);
		const buckets = new Map<string, { group: NodeGroup; records: NoteRecord[] }>();

		for (const path of unlinked) {
			const record = records.get(path) as NoteRecord;
			const group = grouper(record);
			const bucket = buckets.get(group.key);
			if (bucket) bucket.records.push(record);
			else buckets.set(group.key, { group, records: [record] });
		}

		const ordered = [...buckets.values()].sort((a, b) => compareGroups(a.group, b.group));

		for (const bucket of ordered) {
			if (bucket.group.label) {
				layoutGroups.push({ label: bucket.group.label, x: 0, y: top, width: gridWidth });
				top += options.headerHeight;
			}

			bucket.records.sort((a, b) => a.title.localeCompare(b.title));
			bucket.records.forEach((record, index) => {
				layoutNodes.push({
					record,
					x: (index % columns) * step,
					y: top + Math.floor(index / columns) * (options.nodeHeight + options.rowGap),
					width: options.nodeWidth,
					height: options.nodeHeight,
					layer: index % columns,
					unlinked: true,
				});
			});

			const rows = Math.ceil(bucket.records.length / columns);
			top += rows * (options.nodeHeight + options.rowGap) + options.componentGap;
		}
	}

	const width = layoutNodes.reduce((max, node) => Math.max(max, node.x + node.width), 0);
	const height = layoutNodes.reduce((max, node) => Math.max(max, node.y + node.height), 0);
	const epics = computeEpicGroups(layoutNodes, EPIC_PADDING);

	return { nodes: layoutNodes, edges: layoutEdges, groups: layoutGroups, epics, width, height, unlinkedTop };
}

/** Bounding box of the tasks sharing an `epic` frontmatter value, for the flow canvas to draw behind them. */
function computeEpicGroups(nodes: LayoutNode[], padding: number): LayoutEpic[] {
	const buckets = new Map<string, LayoutNode[]>();
	for (const node of nodes) {
		const epic = node.record.epic;
		if (!epic) continue;
		const list = buckets.get(epic);
		if (list) list.push(node);
		else buckets.set(epic, [node]);
	}

	const epics: LayoutEpic[] = [];
	for (const [label, members] of buckets) {
		const minX = Math.min(...members.map((node) => node.x));
		const minY = Math.min(...members.map((node) => node.y));
		const maxX = Math.max(...members.map((node) => node.x + node.width));
		const maxY = Math.max(...members.map((node) => node.y + node.height));
		epics.push({
			label,
			x: minX - padding,
			y: minY - padding,
			width: maxX - minX + padding * 2,
			height: maxY - minY + padding * 2,
		});
	}
	return epics;
}
