import { App, Notice, PluginSettingTab, Setting } from 'obsidian';

import { DEFAULT_SETTINGS, getDefaultSettings } from './defaults';
import type ContextTitlesPlugin from './main';
import { isGraphLabelMode, isPathMode } from './settings-data';
import {
	GRAPH_LABEL_MODES,
	PATH_MODES,
	type GraphLabelMode,
	type PathMode,
} from './types';
import { getGraphDisplayTitle } from './graph-label-rules';

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

	display(): void {
		const { containerEl } = this;
		const isExcludingFolders =
			this.plugin.settings.graphFolderScopeMode === 'exclude';

		this.previewOutputEl = null;
		containerEl.empty();

		new Setting(containerEl).setName('Display areas').setHeading();

		new Setting(containerEl)
			.setName('Graph labels')
			.setDesc('Show context titles in graph view and local graph.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableGraphLabels)
					.onChange(async (value) => {
						this.plugin.settings.enableGraphLabels = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName('Graph label mode')
			.setDesc('Default: duplicate file names only.')
			.addDropdown((dropdown) => {
				for (const graphLabelMode of GRAPH_LABEL_MODES) {
					dropdown.addOption(
						graphLabelMode,
						GRAPH_LABEL_MODE_LABELS[graphLabelMode],
					);
				}

				dropdown
					.setValue(this.plugin.settings.graphLabelMode)
					.onChange(async (value) => {
						this.plugin.settings.graphLabelMode = isGraphLabelMode(value)
							? value
							: DEFAULT_SETTINGS.graphLabelMode;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName('Include / exclude')
			.setDesc(
				isExcludingFolders
					? 'Skips the following folders.'
					: 'Only affects the following folders.',
			)
			.addToggle((toggle) => {
				toggle
					.setValue(isExcludingFolders)
					.onChange(async (value) => {
						this.plugin.settings.graphFolderScopeMode = value
							? 'exclude'
							: 'include';
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName(isExcludingFolders ? 'Folders to exclude' : 'Folders to include')
			.setDesc(
				isExcludingFolders
					? 'Toggle is on, so these folders and their subfolders are skipped. Blank means all folders.'
					: 'Toggle is off, so only these folders and their subfolders are included. Blank means all folders.',
			)
			.addTextArea((text) => {
				text.inputEl.rows = 5;
				text
					.setPlaceholder('Areas/alpha\nprojects/beta\nresources/templates')
					.setValue(this.plugin.settings.graphFolderScopePath)
					.onChange(async (value) => {
						this.plugin.settings.graphFolderScopePath = value;
						await this.plugin.saveSettings();
						this.updatePreview();
					});
			});

		new Setting(containerEl).setName('Title format').setHeading();

		new Setting(containerEl)
			.setName('Path mode')
			.setDesc('Default: parent folder only.')
			.addDropdown((dropdown) => {
				for (const pathMode of PATH_MODES) {
					dropdown.addOption(pathMode, PATH_MODE_LABELS[pathMode]);
				}

				dropdown
					.setValue(this.plugin.settings.pathMode)
					.onChange(async (value) => {
						this.plugin.settings.pathMode = isPathMode(value)
							? value
							: DEFAULT_SETTINGS.pathMode;
						await this.plugin.saveSettings();
						this.updatePreview();
					});
			});

		new Setting(containerEl)
			.setName('Separator')
			.setDesc('Default: -')
			.addText((text) => {
				text
					.setPlaceholder(DEFAULT_SETTINGS.separator)
					.setValue(this.plugin.settings.separator)
					.onChange(async (value) => {
						this.plugin.settings.separator = value;
						await this.plugin.saveSettings();
						this.updatePreview();
					});
			});

		this.renderPreview(containerEl);
		this.renderReset(containerEl);
	}

	private renderPreview(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Live preview').setHeading();

		const previewFragment = activeDocument.createDocumentFragment();
		const previewEl = previewFragment.createDiv({
			cls: 'context-titles-preview',
		});

		this.renderPreviewRow(previewEl, 'Input path', PREVIEW_FILE.path);
		this.previewOutputEl = this.renderPreviewRow(
			previewEl,
			'Output title',
			this.getPreviewTitle(),
		);

		new Setting(containerEl)
			.setName('Preview example')
			.setDesc(previewFragment);
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

	private renderReset(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Reset').setHeading();

		new Setting(containerEl)
			.setName('Reset to defaults')
			.setDesc(
				'Restore the default graph label, scope, separator, and path mode settings.',
			)
			.addButton((button) => {
				button
					.setButtonText('Reset to defaults')
					.onClick(async () => {
						this.plugin.settings = getDefaultSettings();
						await this.plugin.saveSettings();
						new Notice('Settings reset to defaults.');
						this.display();
					});
			});
	}
}
