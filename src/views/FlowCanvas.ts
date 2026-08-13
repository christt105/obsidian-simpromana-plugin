import { setTooltip } from "obsidian";
import type { GraphLayout, LayoutEdge, LayoutNode, Point } from "../graph/layout";

const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;
const DRAG_THRESHOLD = 4;

interface Transform {
	x: number;
	y: number;
	k: number;
}

interface CanvasHandlers {
	onOpenTask(path: string, event: MouseEvent): void;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attributes: Record<string, string> = {}
): SVGElementTagNameMap[K] {
	const element = document.createElementNS(SVG_NS, tag);
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
	return element;
}

function curveBetween(from: Point, to: Point): string {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	if (Math.abs(dx) >= Math.abs(dy)) {
		const offset = Math.max(20, Math.abs(dx) * 0.4);
		const direction = dx >= 0 ? 1 : -1;
		return `M ${from.x} ${from.y} C ${from.x + offset * direction} ${from.y}, ${to.x - offset * direction} ${to.y}, ${to.x} ${to.y}`;
	}
	const offset = Math.max(20, Math.abs(dy) * 0.4);
	const direction = dy >= 0 ? 1 : -1;
	return `M ${from.x} ${from.y} C ${from.x} ${from.y + offset * direction}, ${to.x} ${to.y - offset * direction}, ${to.x} ${to.y}`;
}

function edgePath(edge: LayoutEdge): string {
	const points = edge.points;
	if (points.length < 2) return "";
	if (edge.relation.kind === "related") return curveBetween(points[0], points[1]);

	const direction = edge.cyclic ? -1 : 1;
	let path = `M ${points[0].x} ${points[0].y}`;
	for (let index = 1; index < points.length; index++) {
		const from = points[index - 1];
		const to = points[index];
		const offset = Math.max(24, Math.abs(to.x - from.x) * 0.45);
		path += ` C ${from.x + offset * direction} ${from.y}, ${to.x - offset * direction} ${to.y}, ${to.x} ${to.y}`;
	}
	return path;
}

function statusSlug(status: string): string {
	return status.toLowerCase().replace(/\s+/g, "-");
}

export class FlowCanvas {
	private svg: SVGSVGElement;
	private viewport: SVGGElement;
	private edgeLayer: SVGGElement;
	private nodeLayer: SVGGElement;
	private transform: Transform = { x: 0, y: 0, k: 1 };
	private layout: GraphLayout | null = null;
	private nodeElements = new Map<string, SVGGElement>();
	private edgeElements: { element: SVGPathElement; from: string; to: string }[] = [];
	private neighbours = new Map<string, Set<string>>();
	private dragging = false;
	private dragMoved = 0;
	private pointerOrigin: Point = { x: 0, y: 0 };

	constructor(private container: HTMLElement, private handlers: CanvasHandlers) {
		this.svg = svgEl("svg", { class: "spm-flow-svg" });
		this.svg.appendChild(this.buildDefs());

		this.viewport = svgEl("g", { class: "spm-flow-viewport" });
		this.edgeLayer = svgEl("g", { class: "spm-flow-edges" });
		this.nodeLayer = svgEl("g", { class: "spm-flow-nodes" });
		this.viewport.appendChild(this.edgeLayer);
		this.viewport.appendChild(this.nodeLayer);
		this.svg.appendChild(this.viewport);
		this.container.appendChild(this.svg);

		this.svg.addEventListener("wheel", this.onWheel, { passive: false });
		this.svg.addEventListener("pointerdown", this.onPointerDown);
		this.svg.addEventListener("pointermove", this.onPointerMove);
		this.svg.addEventListener("pointerup", this.onPointerUp);
		this.svg.addEventListener("pointercancel", this.onPointerUp);
		this.svg.addEventListener("pointerleave", this.clearHighlight);
	}

	destroy(): void {
		this.svg.removeEventListener("wheel", this.onWheel);
		this.svg.removeEventListener("pointerdown", this.onPointerDown);
		this.svg.removeEventListener("pointermove", this.onPointerMove);
		this.svg.removeEventListener("pointerup", this.onPointerUp);
		this.svg.removeEventListener("pointercancel", this.onPointerUp);
		this.svg.removeEventListener("pointerleave", this.clearHighlight);
		this.svg.remove();
	}

	render(layout: GraphLayout, options: { fit: boolean }): void {
		this.layout = layout;
		this.edgeLayer.empty();
		this.nodeLayer.empty();
		this.nodeElements.clear();
		this.edgeElements = [];
		this.neighbours.clear();

		if (layout.unlinkedTop !== null) {
			this.edgeLayer.appendChild(this.buildUnlinkedDivider(layout));
		}

		for (const edge of layout.edges) {
			this.edgeLayer.appendChild(this.buildEdge(edge));
			this.link(edge.relation.from, edge.relation.to);
		}

		for (const node of layout.nodes) {
			this.nodeLayer.appendChild(this.buildNode(node));
		}

		if (options.fit) this.fit();
		else this.applyTransform();
	}

	fit(): void {
		const layout = this.layout;
		if (!layout || layout.nodes.length === 0) return;

		const bounds = this.container.getBoundingClientRect();
		const padding = 32;
		const scale = Math.min(
			(bounds.width - padding * 2) / Math.max(layout.width, 1),
			(bounds.height - padding * 2) / Math.max(layout.height, 1),
			1
		);
		this.transform.k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
		this.transform.x = (bounds.width - layout.width * this.transform.k) / 2;
		this.transform.y = (bounds.height - layout.height * this.transform.k) / 2;
		this.applyTransform();
	}

	zoomBy(factor: number): void {
		const bounds = this.container.getBoundingClientRect();
		this.zoomAt(factor, bounds.width / 2, bounds.height / 2);
	}

	private buildDefs(): SVGDefsElement {
		const defs = svgEl("defs");
		for (const kind of ["dependency", "continuation", "cycle"]) {
			const marker = svgEl("marker", {
				id: `spm-arrow-${kind}`,
				viewBox: "0 0 10 10",
				refX: "9",
				refY: "5",
				markerWidth: "6",
				markerHeight: "6",
				orient: "auto-start-reverse",
			});
			marker.appendChild(
				svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", class: `spm-flow-arrow is-${kind}` })
			);
			defs.appendChild(marker);
		}
		return defs;
	}

	private buildUnlinkedDivider(layout: GraphLayout): SVGGElement {
		const top = (layout.unlinkedTop as number) - 28;
		const group = svgEl("g", { class: "spm-flow-divider" });
		group.appendChild(
			svgEl("line", {
				x1: "0",
				y1: String(top),
				x2: String(Math.max(layout.width, 200)),
				y2: String(top),
			})
		);
		const label = svgEl("text", { x: "0", y: String(top - 8) });
		label.textContent = "Unlinked tasks";
		group.appendChild(label);
		return group;
	}

	private buildEdge(edge: LayoutEdge): SVGPathElement {
		const kind = edge.cyclic ? "cycle" : edge.relation.kind;
		const path = svgEl("path", {
			class: `spm-flow-edge is-${kind}`,
			d: edgePath(edge),
		});
		if (edge.relation.kind !== "related") {
			path.setAttribute("marker-end", `url(#spm-arrow-${kind})`);
		}
		this.edgeElements.push({ element: path, from: edge.relation.from, to: edge.relation.to });
		return path;
	}

	private buildNode(node: LayoutNode): SVGGElement {
		const record = node.record;
		const group = svgEl("g", { class: "spm-flow-node" });
		group.dataset.path = record.path;

		const holder = svgEl("foreignObject", {
			x: String(node.x),
			y: String(node.y),
			width: String(node.width),
			height: String(node.height),
		});

		const card = document.createElement("div");
		card.className = "spm-flow-card";
		card.dataset.status = statusSlug(record.status);
		if (node.unlinked) card.addClass("is-unlinked");

		const title = card.createDiv({ cls: "spm-flow-card-title", text: record.title });
		title.setAttribute("title", record.title);

		const meta = card.createDiv({ cls: "spm-flow-card-meta" });
		meta.createSpan({ cls: "spm-flow-chip is-status", text: record.status });
		if (record.priority) {
			meta.createSpan({ cls: `spm-flow-chip is-priority is-${record.priority}`, text: record.priority });
		}
		if (record.milestone) {
			meta.createSpan({ cls: "spm-flow-chip", text: record.milestone });
		}

		holder.appendChild(card);
		group.appendChild(holder);

		setTooltip(card, this.tooltipFor(node), { delay: 400 });

		group.addEventListener("mouseenter", () => this.highlight(record.path));
		group.addEventListener("mouseleave", this.clearHighlight);
		group.addEventListener("click", (event: MouseEvent) => {
			if (this.dragMoved > DRAG_THRESHOLD) return;
			this.handlers.onOpenTask(record.path, event);
		});
		group.addEventListener("auxclick", (event: MouseEvent) => {
			if (event.button === 1) this.handlers.onOpenTask(record.path, event);
		});

		this.nodeElements.set(record.path, group);
		return group;
	}

	private tooltipFor(node: LayoutNode): string {
		const record = node.record;
		const lines = [record.title, `Status: ${record.status}`];
		if (record.priority) lines.push(`Priority: ${record.priority}`);
		if (record.milestone) lines.push(`Milestone: ${record.milestone}`);
		if (record.projectName) lines.push(`Project: ${record.projectName}`);
		const incoming = this.layout?.edges.filter((edge) => edge.relation.to === record.path) ?? [];
		for (const edge of incoming) {
			if (edge.relation.kind === "dependency") lines.push("Blocked by an upstream task");
		}
		return lines.join("\n");
	}

	private link(from: string, to: string): void {
		const forward = this.neighbours.get(from) ?? new Set<string>();
		forward.add(to);
		this.neighbours.set(from, forward);
		const backward = this.neighbours.get(to) ?? new Set<string>();
		backward.add(from);
		this.neighbours.set(to, backward);
	}

	private highlight(path: string): void {
		if (this.dragging) return;
		const related = this.neighbours.get(path) ?? new Set<string>();

		for (const [nodePath, element] of this.nodeElements) {
			const active = nodePath === path || related.has(nodePath);
			element.classList.toggle("is-faded", !active);
			element.classList.toggle("is-focus", nodePath === path);
		}
		for (const edge of this.edgeElements) {
			const active = edge.from === path || edge.to === path;
			edge.element.classList.toggle("is-faded", !active);
			edge.element.classList.toggle("is-active", active);
		}
	}

	private clearHighlight = (): void => {
		for (const element of this.nodeElements.values()) {
			element.classList.remove("is-faded", "is-focus");
		}
		for (const edge of this.edgeElements) {
			edge.element.classList.remove("is-faded", "is-active");
		}
	};

	private applyTransform(): void {
		const { x, y, k } = this.transform;
		this.viewport.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
	}

	private zoomAt(factor: number, clientX: number, clientY: number): void {
		const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.transform.k * factor));
		const ratio = next / this.transform.k;
		this.transform.x = clientX - (clientX - this.transform.x) * ratio;
		this.transform.y = clientY - (clientY - this.transform.y) * ratio;
		this.transform.k = next;
		this.applyTransform();
	}

	private onWheel = (event: WheelEvent): void => {
		event.preventDefault();
		const bounds = this.container.getBoundingClientRect();
		this.zoomAt(
			Math.pow(0.999, event.deltaY),
			event.clientX - bounds.left,
			event.clientY - bounds.top
		);
	};

	private onPointerDown = (event: PointerEvent): void => {
		if (event.button !== 0) return;
		this.dragging = true;
		this.dragMoved = 0;
		this.pointerOrigin = { x: event.clientX, y: event.clientY };
		this.svg.setPointerCapture(event.pointerId);
		this.svg.addClass("is-panning");
	};

	private onPointerMove = (event: PointerEvent): void => {
		if (!this.dragging) return;
		const dx = event.clientX - this.pointerOrigin.x;
		const dy = event.clientY - this.pointerOrigin.y;
		this.dragMoved += Math.abs(dx) + Math.abs(dy);
		this.transform.x += dx;
		this.transform.y += dy;
		this.pointerOrigin = { x: event.clientX, y: event.clientY };
		this.applyTransform();
	};

	private onPointerUp = (event: PointerEvent): void => {
		if (!this.dragging) return;
		this.dragging = false;
		this.svg.releasePointerCapture(event.pointerId);
		this.svg.removeClass("is-panning");
		window.setTimeout(() => (this.dragMoved = 0), 0);
	};
}
