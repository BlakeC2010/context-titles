import type { ContextTitlesSettings, PathMode, TitleSource } from './types';

export function generateContextTitle(
	file: TitleSource,
	settings: ContextTitlesSettings,
	contextDepth?: number,
): string {
	const basename = getBasename(file);
	const folderSegments = getFolderSegments(file.path);

	if (folderSegments.length === 0) {
		return basename;
	}

	if (isInsideIgnoredFolder(folderSegments, settings.ignoredFolders)) {
		return basename;
	}

	const contextSegments =
		typeof contextDepth === 'number'
			? folderSegments.slice(
					-normalizeContextDepth(contextDepth, folderSegments.length),
				)
			: selectContextSegments(folderSegments, settings.pathMode);

	if (contextSegments.length === 0) {
		return basename;
	}

	return [...contextSegments, basename].join(formatSeparator(settings.separator));
}

export function formatSeparator(separator: string): string {
	const trimmed = separator.trim();

	if (trimmed.length === 0) {
		return ' - ';
	}

	if (trimmed === ':') {
		return ': ';
	}

	return ` ${trimmed} `;
}

export function normalizeIgnoredFolders(folders: readonly string[]): string[] {
	const normalized = folders
		.map((folder) => folder.trim())
		.filter((folder) => folder.length > 0);

	return [...new Set(normalized)];
}

function getBasename(file: TitleSource): string {
	if (file.basename.trim().length > 0) {
		return file.basename;
	}

	const lastPathSegment = file.path.split('/').pop() ?? file.path;
	const extensionStart = lastPathSegment.lastIndexOf('.');

	if (extensionStart <= 0) {
		return lastPathSegment;
	}

	return lastPathSegment.slice(0, extensionStart);
}

function getFolderSegments(path: string): string[] {
	const pathSegments = path.split('/').filter((segment) => segment.length > 0);

	if (pathSegments.length <= 1) {
		return [];
	}

	return pathSegments.slice(0, -1);
}

function isInsideIgnoredFolder(
	folderSegments: readonly string[],
	ignoredFolders: readonly string[],
): boolean {
	const ignoredFolderSet = new Set(
		normalizeIgnoredFolders(ignoredFolders).map((folder) => folder.toLowerCase()),
	);

	return folderSegments.some((folder) =>
		ignoredFolderSet.has(folder.toLowerCase()),
	);
}

function normalizeContextDepth(depth: number, maxDepth: number): number {
	return Math.min(Math.max(1, Math.floor(depth)), maxDepth);
}

function selectContextSegments(
	folderSegments: readonly string[],
	pathMode: PathMode,
): string[] {
	switch (pathMode) {
		case 'automatic':
		case 'parent':
			return folderSegments.slice(-1);
		case 'full':
			return [...folderSegments];
		case 'last-2':
			return folderSegments.slice(-2);
		case 'last-3':
			return folderSegments.slice(-3);
	}
}
