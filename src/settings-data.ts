import { getDefaultSettings } from './defaults';
import { normalizeFolderScopeValue } from './graph-label-rules';
import { normalizeIgnoredFolders } from './title-generator';
import {
	GRAPH_FOLDER_SCOPE_MODES,
	GRAPH_LABEL_MODES,
	PATH_MODES,
	type ContextTitlesSettings,
	type GraphFolderScopeMode,
	type GraphLabelMode,
	type PathMode,
} from './types';

export function normalizeSettings(
	settings: Partial<ContextTitlesSettings> | null | undefined,
): ContextTitlesSettings {
	const defaults = getDefaultSettings();

	if (!settings) {
		return defaults;
	}

	return {
		enableGraphLabels:
			typeof settings.enableGraphLabels === 'boolean'
				? settings.enableGraphLabels
				: defaults.enableGraphLabels,
		graphLabelMode: isGraphLabelMode(settings.graphLabelMode)
			? settings.graphLabelMode
			: defaults.graphLabelMode,
		graphFolderScopeMode: isGraphFolderScopeMode(settings.graphFolderScopeMode)
			? settings.graphFolderScopeMode
			: defaults.graphFolderScopeMode,
		graphFolderScopePath:
			typeof settings.graphFolderScopePath === 'string'
				? normalizeFolderScopeValue(settings.graphFolderScopePath)
				: defaults.graphFolderScopePath,
		separator:
			typeof settings.separator === 'string'
				? settings.separator
				: defaults.separator,
		pathMode: isPathMode(settings.pathMode)
			? settings.pathMode
			: defaults.pathMode,
		ignoredFolders: Array.isArray(settings.ignoredFolders)
			? normalizeIgnoredFolders(settings.ignoredFolders)
			: defaults.ignoredFolders,
	};
}

export function parseIgnoredFolders(value: string): string[] {
	return normalizeIgnoredFolders(value.split(/\r?\n|,/u));
}

export function isPathMode(value: unknown): value is PathMode {
	return PATH_MODES.includes(value as PathMode);
}

export function isGraphLabelMode(value: unknown): value is GraphLabelMode {
	return GRAPH_LABEL_MODES.includes(value as GraphLabelMode);
}

export function isGraphFolderScopeMode(
	value: unknown,
): value is GraphFolderScopeMode {
	return GRAPH_FOLDER_SCOPE_MODES.includes(value as GraphFolderScopeMode);
}
