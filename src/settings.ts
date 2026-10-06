import {
	App,
	Notice,
	PluginSettingTab,
	type SettingDefinitionItem,
} from 'obsidian';

import { DEFAULT_SETTINGS, getDefaultSettings } from './defaults';
import { getGraphDisplayTitle } from './graph-label-rules';
import type ContextTitlesPlugin from './main';
import { isGraphLabelMode, isPathMode } from './settings-data';
import type {
	GraphLabelMode,
	PathMode,
} from './types';

const PATH_MODE_LABELS: Record<PathMode, string> = {
	parent: 'Parent folder only',
	full: 'Full path',
	'last-2': 'Last 2 folders',
	'last-3': 'Last 3 folders',
};

const GRAPH_LABEL_MODE_LABELS: Record<GraphLabelMode, string> = {
	'duplicates-only': 'Duplicate file names only',
	all: 'Every visible graph file',
};

const PREVIEW_FILE = {
	path: 'Projects/Alpha/Overview.md',
	basename: 'Overview',
};

const PREVIEW_FILES = [
	PREVIEW_FILE,
	{
		path: 'Projects/Beta/Overview.md',
		basename: 'Overview',
	},
];

export class ContextTitlesSettingTab extends PluginSettingTab {
	private previewOutputEl: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly plugin: ContextTitlesPlugin,
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const isExcludingFolders =
			this.plugin.settings.graphFolderScopeMode === 'exclude';

		return [
			{
				type: 'group',
				heading: 'Display areas',
				items: [
					{
						name: 'Graph labels',
						desc: 'Show context titles in graph view and local graph.',
						control: {
							type: 'toggle',
							key: 'enableGraphLabels',
						},
					},
					{
						name: 'Graph label mode',
						desc: 'Default: duplicate file names only.',
						control: {
							type: 'dropdown',
							key: 'graphLabelMode',
							defaultValue: DEFAULT_SETTINGS.graphLabelMode,
							options: GRAPH_LABEL_MODE_LABELS,
						},
					},
					{
						name: 'Include / exclude',
						desc: isExcludingFolders
							? 'Skips the following folders.'
							: 'Only affects the following folders.',
						render: (setting) => {
							setting.addToggle((toggle) => {
								toggle
									.setValue(isExcludingFolders)
									.onChange(async (value) => {
										this.plugin.settings.graphFolderScopeMode = value
											? 'exclude'
											: 'include';
										await this.plugin.saveSettings();
										this.update();
									});
							});
						},
					},
					{
						name: isExcludingFolders
							? 'Folders to exclude'
							: 'Folders to include',
						desc: isExcludingFolders
							? 'Toggle is on, so these folders and their subfolders are skipped. Blank means all folders.'
							: 'Toggle is off, so only these folders and their subfolders are included. Blank means all folders.',
						control: {
							type: 'textarea',
							key: 'graphFolderScopePath',
							placeholder:
								'Areas/alpha\nprojects/beta\nresources/templates',
							rows: 5,
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Title format',
				items: [
					{
						name: 'Path mode',
						desc: 'Default: parent folder only.',
						control: {
							type: 'dropdown',
							key: 'pathMode',
							defaultValue: DEFAULT_SETTINGS.pathMode,
							options: PATH_MODE_LABELS,
						},
					},
					{
						name: 'Separator',
						desc: 'Default: -',
						control: {
							type: 'text',
							key: 'separator',
							placeholder: DEFAULT_SETTINGS.separator,
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Live preview',
				items: [
					{
						name: 'Preview example',
						desc: 'Shows how the current title settings affect a duplicate note name.',
						render: (setting) => {
							setting.descEl.empty();
							const previewEl = setting.descEl.createDiv({
								cls: 'context-titles-preview',
							});

							this.renderPreviewRow(
								previewEl,
								'Input path',
								PREVIEW_FILE.path,
							);
							this.previewOutputEl = this.renderPreviewRow(
								previewEl,
								'Output title',
								this.getPreviewTitle(),
							);
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Reset',
				items: [
					{
						name: 'Reset to defaults',
						desc: 'Restore the default graph label, scope, separator, and path mode settings.',
						render: (setting) => {
							setting.addButton((button) => {
								button
									.setButtonText('Reset to defaults')
									.onClick(async () => {
										this.plugin.settings = getDefaultSettings();
										await this.plugin.saveSettings();
										new Notice('Settings reset to defaults.');
										this.update();
									});
							});
						},
					},
				],
			},
		];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		let changed = true;

		switch (key) {
			case 'enableGraphLabels':
				if (typeof value === 'boolean') {
					this.plugin.settings.enableGraphLabels = value;
				} else {
					changed = false;
				}
				break;
			case 'graphLabelMode':
				if (isGraphLabelMode(value)) {
					this.plugin.settings.graphLabelMode = value;
				} else {
					changed = false;
				}
				break;
			case 'graphFolderScopePath':
				if (typeof value === 'string') {
					this.plugin.settings.graphFolderScopePath = value;
				} else {
					changed = false;
				}
				break;
			case 'pathMode':
				if (isPathMode(value)) {
					this.plugin.settings.pathMode = value;
				} else {
					changed = false;
				}
				break;
			case 'separator':
				if (typeof value === 'string') {
					this.plugin.settings.separator = value;
				} else {
					changed = false;
				}
				break;
			default:
				changed = false;
		}

		if (!changed) {
			return;
		}

		await this.plugin.saveSettings();

		if (
			key === 'graphLabelMode' ||
			key === 'graphFolderScopePath' ||
			key === 'pathMode' ||
			key === 'separator'
		) {
			this.updatePreview();
		}
	}

	private renderPreviewRow(
		containerEl: HTMLElement,
		label: string,
		value: string,
	): HTMLElement {
		const rowEl = containerEl.createDiv({
			cls: 'context-titles-preview-row',
		});
		rowEl.createDiv({
			cls: 'context-titles-preview-label',
			text: label,
		});
		return rowEl.createEl('code', {
			cls: 'context-titles-preview-value',
			text: value,
		});
	}

	private updatePreview(): void {
		this.previewOutputEl?.setText(this.getPreviewTitle());
	}

	private getPreviewTitle(): string {
		return getGraphDisplayTitle(
			PREVIEW_FILE,
			PREVIEW_FILES,
			this.plugin.settings,
		);
	}
}
