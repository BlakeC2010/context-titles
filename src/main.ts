import { Notice, Plugin } from 'obsidian';

import { ContextTitlesSettingTab } from './settings';
import { normalizeSettings } from './settings-data';
import { GraphLabelAdapter } from './graph-label-adapter';
import { generateContextTitle } from './title-generator';
import type { ContextTitlesSettings } from './types';

export default class ContextTitlesPlugin extends Plugin {
	settings!: ContextTitlesSettings;
	private graphLabelAdapter!: GraphLabelAdapter;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.graphLabelAdapter = new GraphLabelAdapter(
			this.app,
			() => this.settings,
		);
		this.registerGraphRefreshEvents();
		this.app.workspace.onLayoutReady(() => this.applyGraphLabelSettings());
		this.applyGraphLabelSettings();

		this.addCommand({
			id: 'show-active-context-title',
			name: 'Show active context title',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();

				if (!file) {
					return false;
				}

				if (!checking) {
					new Notice(generateContextTitle(file, this.settings));
				}

				return true;
			},
		});

		this.addCommand({
			id: 'refresh-graph-labels',
			name: 'Refresh graph labels',
			callback: () => {
				if (!this.graphLabelAdapter.isEnabled()) {
					new Notice('Graph labels are disabled in context titles settings.');
					return;
				}

				const result = this.graphLabelAdapter.refresh();
				new Notice(
					`Graph labels refreshed: ${result.fileNodesFound.toString()} file nodes in ${result.renderersScanned.toString()} graph views.`,
				);
			},
		});

		this.addSettingTab(new ContextTitlesSettingTab(this.app, this));
	}

	onunload(): void {
		this.graphLabelAdapter.disable();
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(
			(await this.loadData()) as Partial<ContextTitlesSettings> | null,
		);
	}

	async saveSettings(): Promise<void> {
		this.settings = normalizeSettings(this.settings);
		await this.saveData(this.settings);
		this.applyGraphLabelSettings();
	}

	private registerGraphRefreshEvents(): void {
		const refreshGraphLabels = (): void => {
			this.graphLabelAdapter.refresh();
		};

		this.registerEvent(
			this.app.workspace.on('layout-change', refreshGraphLabels),
		);
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', refreshGraphLabels),
		);
		this.registerEvent(this.app.workspace.on('file-open', refreshGraphLabels));
		this.registerEvent(this.app.vault.on('create', refreshGraphLabels));
		this.registerEvent(this.app.vault.on('delete', refreshGraphLabels));
		this.registerEvent(this.app.vault.on('rename', refreshGraphLabels));
	}

	private applyGraphLabelSettings(): void {
		if (this.settings.enableGraphLabels) {
			this.graphLabelAdapter.enable();
		} else {
			this.graphLabelAdapter.disable();
		}
	}
}
