import type { ContextTitlesSettings } from './types';

export const DEFAULT_IGNORED_FOLDERS = [
	'Templates',
	'Generated',
	'Media',
	'Attachments',
];

export const DEFAULT_SETTINGS: ContextTitlesSettings = {
	enableGraphLabels: true,
	graphLabelMode: 'duplicates-only',
	graphFolderScopeMode: 'include',
	graphFolderScopePath: '',
	separator: '-',
	pathMode: 'parent',
	ignoredFolders: DEFAULT_IGNORED_FOLDERS,
};

export function getDefaultSettings(): ContextTitlesSettings {
	return {
		...DEFAULT_SETTINGS,
		ignoredFolders: [...DEFAULT_SETTINGS.ignoredFolders],
	};
}
