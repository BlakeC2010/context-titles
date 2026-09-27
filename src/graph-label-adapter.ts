import { App, TFile, type WorkspaceLeaf } from 'obsidian';

import { getGraphDisplayTitles } from './graph-label-rules';
import type { ContextTitlesSettings } from './types';

const GRAPH_VIEW_TYPES = ['graph', 'localgraph'];
const REFRESH_INTERVAL_MS = 1000;

// Obsidian does not currently expose a public graph label provider. Keep this
// internal adapter isolated to graph views so it can be disabled and restored
// cleanly if Obsidian changes Graph View internals.

interface GraphText {
	text: string;
}

interface GraphNode {
	id?: unknown;
	text?: unknown;
	fontDirty?: boolean;
	getDisplayText?: unknown;
}

interface GraphRenderer {
	nodes?: unknown;
	nodeLookup?: unknown;
	changed?: unknown;
	queueRender?: unknown;
}

interface GraphRendererWithChanged extends GraphRenderer {
	changed: () => void;
}

interface GraphRendererWithQueuedRender extends GraphRenderer {
	queueRender: () => void;
}

interface PatchedNodeState {
	displayTitle: string;
	hadOwnGetDisplayText: boolean;
	originalGetDisplayText?: unknown;
	originalText: string;
}

interface GraphFileEntry {
	node: GraphNode;
	file: TFile;
}

export interface GraphRefreshResult {
	renderersScanned: number;
	nodesScanned: number;
	fileNodesFound: number;
	labelsChanged: number;
}

export class GraphLabelAdapter {
	private enabled = false;
	private refreshIntervalId: number | null = null;
	private readonly patchedNodes = new Map<GraphNode, PatchedNodeState>();
	private readonly patchedRenderers = new Set<GraphRenderer>();

	constructor(
		private readonly app: App,
		private readonly getSettings: () => ContextTitlesSettings,
	) {}

	isEnabled(): boolean {
		return this.enabled;
	}

	enable(): void {
		if (this.enabled) {
			this.refresh();
			return;
		}

		this.enabled = true;
		this.refresh();
		this.refreshIntervalId = window.setInterval(
			() => this.refresh(),
			REFRESH_INTERVAL_MS,
		);
	}

	disable(): void {
		this.enabled = false;

		if (this.refreshIntervalId !== null) {
			window.clearInterval(this.refreshIntervalId);
			this.refreshIntervalId = null;
		}

		this.restoreAllNodes();
	}

	refresh(): GraphRefreshResult {
		const result: GraphRefreshResult = {
			renderersScanned: 0,
			nodesScanned: 0,
			fileNodesFound: 0,
			labelsChanged: 0,
		};

		if (!this.enabled) {
			return result;
		}

		const renderers = this.getGraphRenderers();
		result.renderersScanned = renderers.length;

		for (const renderer of renderers) {
			const rendererResult = this.patchRenderer(renderer);
			result.nodesScanned += rendererResult.nodesScanned;
			result.fileNodesFound += rendererResult.fileNodesFound;
			result.labelsChanged += rendererResult.labelsChanged;

			if (rendererResult.labelsChanged > 0) {
				this.patchedRenderers.add(renderer);
				requestGraphRender(renderer);
			}
		}

		return result;
	}

	private getGraphRenderers(): GraphRenderer[] {
		const renderers = new Set<GraphRenderer>();

		for (const leaf of this.getGraphLeaves()) {
			for (const candidate of getRendererCandidates(leaf)) {
				if (isGraphRenderer(candidate)) {
					renderers.add(candidate);
				}
			}
		}

		return [...renderers];
	}

	private getGraphLeaves(): WorkspaceLeaf[] {
		const leaves = new Set<WorkspaceLeaf>();

		for (const viewType of GRAPH_VIEW_TYPES) {
			for (const leaf of this.app.workspace.getLeavesOfType(viewType)) {
				leaves.add(leaf);
			}
		}

		this.app.workspace.iterateAllLeaves((leaf) => {
			const viewType = leaf.view.getViewType();

			if (GRAPH_VIEW_TYPES.includes(viewType)) {
				leaves.add(leaf);
			}
		});

		return [...leaves];
	}

	private patchRenderer(renderer: GraphRenderer): Omit<
		GraphRefreshResult,
		'renderersScanned'
	> {
		const result = {
			nodesScanned: 0,
			fileNodesFound: 0,
			labelsChanged: 0,
		};
		const nodes = getRendererNodes(renderer);
		const fileEntries: GraphFileEntry[] = [];

		for (const node of nodes) {
			result.nodesScanned += 1;
			const file = this.getFileForNode(node);

			if (!file) {
				if (this.patchedNodes.has(node)) {
					this.restoreNode(node);
					result.labelsChanged += 1;
				}

				continue;
			}

			result.fileNodesFound += 1;
			fileEntries.push({ node, file });
		}

		const settings = this.getSettings();
		const visibleFiles = fileEntries.map((entry) => entry.file);
		const displayTitles = getGraphDisplayTitles(visibleFiles, settings);

		for (const { node, file } of fileEntries) {
			const displayTitle = displayTitles.get(file.path) ?? file.basename;

			if (this.applyNodeTitle(node, displayTitle, file.basename)) {
				result.labelsChanged += 1;
			}
		}

		return result;
	}

	private getFileForNode(node: GraphNode): TFile | null {
		if (typeof node.id !== 'string') {
			return null;
		}

		const file = this.app.vault.getAbstractFileByPath(node.id);

		if (file instanceof TFile) {
			return file;
		}

		return null;
	}

	private applyNodeTitle(
		node: GraphNode,
		displayTitle: string,
		normalTitle: string,
	): boolean {
		if (displayTitle === normalTitle) {
			if (this.patchedNodes.has(node)) {
				this.restoreNode(node, normalTitle);
				return true;
			}

			return false;
		}

		return this.patchNode(node, displayTitle, normalTitle);
	}

	private patchNode(
		node: GraphNode,
		displayTitle: string,
		fallbackOriginalText: string,
	): boolean {
		let state = this.patchedNodes.get(node);

		if (!state) {
			const text = getGraphText(node.text);

			state = {
				displayTitle,
				hadOwnGetDisplayText: Object.prototype.hasOwnProperty.call(
					node,
					'getDisplayText',
				),
				originalGetDisplayText: node.getDisplayText,
				originalText: text?.text ?? fallbackOriginalText,
			};
			this.patchedNodes.set(node, state);
		}

		let changed = state.displayTitle !== displayTitle;
		state.displayTitle = displayTitle;
		node.getDisplayText = () => displayTitle;

		const text = getGraphText(node.text);

		if (text && text.text !== displayTitle) {
			text.text = displayTitle;
			changed = true;
		}

		if (!node.fontDirty) {
			node.fontDirty = true;
			changed = true;
		}

		return changed;
	}

	private restoreAllNodes(): void {
		for (const node of [...this.patchedNodes.keys()]) {
			const file = this.getFileForNode(node);
			this.restoreNode(node, file?.basename);
		}

		for (const renderer of this.patchedRenderers) {
			requestGraphRender(renderer);
		}

		this.patchedRenderers.clear();
	}

	private restoreNode(node: GraphNode, restoredText?: string): void {
		const state = this.patchedNodes.get(node);

		if (!state) {
			return;
		}

		if (state.hadOwnGetDisplayText) {
			node.getDisplayText = state.originalGetDisplayText;
		} else {
			delete node.getDisplayText;
		}

		const text = getGraphText(node.text);

		if (text) {
			text.text = restoredText ?? state.originalText;
		}

		node.fontDirty = true;
		this.patchedNodes.delete(node);
	}
}

function getRendererCandidates(leaf: WorkspaceLeaf): unknown[] {
	const view = leaf.view as unknown;

	if (!isRecord(view)) {
		return [];
	}

	const engine = getRecordValue(view, 'engine');
	const dataEngine = getRecordValue(view, 'dataEngine');

	return [
		getRecordValue(view, 'renderer'),
		getNestedRecordValue(engine, 'renderer'),
		getNestedRecordValue(dataEngine, 'renderer'),
	];
}

function getRendererNodes(renderer: GraphRenderer): GraphNode[] {
	const nodes = renderer.nodes;

	if (Array.isArray(nodes)) {
		return nodes.filter(isGraphNode);
	}

	if (nodes instanceof Set) {
		return [...nodes].filter(isGraphNode);
	}

	if (nodes instanceof Map) {
		return [...nodes.values()].filter(isGraphNode);
	}

	if (isRecord(nodes)) {
		return Object.values(nodes).filter(isGraphNode);
	}

	return [];
}

function isGraphRenderer(value: unknown): value is GraphRenderer {
	if (!isRecord(value)) {
		return false;
	}

	const nodes = getRecordValue(value, 'nodes');
	const hasNodes =
		Array.isArray(nodes) ||
		nodes instanceof Set ||
		nodes instanceof Map ||
		isRecord(nodes);

	if (!hasNodes) {
		return false;
	}

	return (
		'nodeLookup' in value ||
		typeof getRecordValue(value, 'changed') === 'function' ||
		typeof getRecordValue(value, 'queueRender') === 'function'
	);
}

function isGraphNode(value: unknown): value is GraphNode {
	if (!isRecord(value)) {
		return false;
	}

	return typeof getRecordValue(value, 'id') === 'string';
}

function getGraphText(value: unknown): GraphText | null {
	if (!isRecord(value)) {
		return null;
	}

	const text = getRecordValue(value, 'text');

	if (typeof text !== 'string') {
		return null;
	}

	return value as unknown as GraphText;
}

function requestGraphRender(renderer: GraphRenderer): void {
	if (hasChangedMethod(renderer)) {
		renderer.changed();
		return;
	}

	if (hasQueueRenderMethod(renderer)) {
		renderer.queueRender();
	}
}

function hasChangedMethod(
	renderer: GraphRenderer,
): renderer is GraphRendererWithChanged {
	return typeof renderer.changed === 'function';
}

function hasQueueRenderMethod(
	renderer: GraphRenderer,
): renderer is GraphRendererWithQueuedRender {
	return typeof renderer.queueRender === 'function';
}

function getNestedRecordValue(value: unknown, key: string): unknown {
	if (!isRecord(value)) {
		return undefined;
	}

	return getRecordValue(value, key);
}

function getRecordValue(
	record: Record<string, unknown>,
	key: string,
): unknown {
	return record[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
