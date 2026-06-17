import { generateContextTitle } from './title-generator';
import type { ContextTitlesSettings, TitleSource } from './types';

export function getGraphDisplayTitle(
	file: TitleSource,
	visibleFiles: readonly TitleSource[],
	settings: ContextTitlesSettings,
): string {
	return getGraphDisplayTitleWithDuplicateKeys(
		file,
		getDuplicateBasenameKeys(visibleFiles, settings),
		settings,
	);
}

export function getGraphDisplayTitleWithDuplicateKeys(
	file: TitleSource,
	duplicateBasenameKeys: ReadonlySet<string>,
	settings: ContextTitlesSettings,
): string {
	if (!shouldConsiderGraphFile(file, settings)) {
		return file.basename;
	}

	if (
		settings.graphLabelMode === 'duplicates-only' &&
		!duplicateBasenameKeys.has(getNormalizedBasename(file.basename))
	) {
		return file.basename;
	}

	return generateContextTitle(file, settings);
}

export function getDuplicateBasenameKeys(
	files: readonly TitleSource[],
	settings: ContextTitlesSettings,
): Set<string> {
	const counts = new Map<string, number>();

	for (const file of files) {
		if (!shouldConsiderGraphFile(file, settings)) {
			continue;
		}

		const basename = getNormalizedBasename(file.basename);
		counts.set(basename, (counts.get(basename) ?? 0) + 1);
	}

	const duplicateKeys = new Set<string>();

	for (const [basename, count] of counts) {
		if (count > 1) {
			duplicateKeys.add(basename);
		}
	}

	return duplicateKeys;
}

export function shouldConsiderGraphFile(
	file: TitleSource,
	settings: ContextTitlesSettings,
): boolean {
	if (!isInGraphFolderScope(file.path, settings)) {
		return false;
	}

	if (isInsideIgnoredFolder(file.path, settings.ignoredFolders)) {
		return false;
	}

	return true;
}

export function normalizeFolderScopePath(path: string): string {
	return path
		.trim()
		.replace(/\\/gu, '/')
		.replace(/^\/+|\/+$/gu, '')
		.replace(/\/+/gu, '/');
}

export function parseFolderScopePaths(value: string): string[] {
	const normalizedPaths = value
		.split(/\r?\n|,/u)
		.map((path) => normalizeFolderScopePath(path))
		.filter((path) => path.length > 0);
	const seenPaths = new Set<string>();
	const uniquePaths: string[] = [];

	for (const path of normalizedPaths) {
		const key = path.toLowerCase();

		if (seenPaths.has(key)) {
			continue;
		}

		seenPaths.add(key);
		uniquePaths.push(path);
	}

	return uniquePaths;
}

export function normalizeFolderScopeValue(value: string): string {
	return parseFolderScopePaths(value).join('\n');
}

export function isInGraphFolderScope(
	filePath: string,
	settings: ContextTitlesSettings,
): boolean {
	const scopePaths = parseFolderScopePaths(settings.graphFolderScopePath);

	if (scopePaths.length === 0) {
		return true;
	}

	const isInsideScope = scopePaths.some((scopePath) =>
		isPathInsideScope(filePath, scopePath),
	);

	if (settings.graphFolderScopeMode === 'include') {
		return isInsideScope;
	}

	return !isInsideScope;
}

function getNormalizedBasename(basename: string): string {
	return basename.trim().toLowerCase();
}

function isPathInsideScope(filePath: string, scopePath: string): boolean {
	const normalizedFilePath = normalizeFolderScopePath(filePath).toLowerCase();
	const normalizedScopePath = scopePath.toLowerCase();

	return (
		normalizedFilePath === normalizedScopePath ||
		normalizedFilePath.startsWith(`${normalizedScopePath}/`)
	);
}

function isInsideIgnoredFolder(
	path: string,
	ignoredFolders: readonly string[],
): boolean {
	const ignoredFolderSet = new Set(
		ignoredFolders
			.map((folder) => folder.trim().toLowerCase())
			.filter((folder) => folder.length > 0),
	);

	if (ignoredFolderSet.size === 0) {
		return false;
	}

	const pathSegments = path.split('/').filter((segment) => segment.length > 0);
	const folderSegments = pathSegments.slice(0, -1);

	return folderSegments.some((folder) =>
		ignoredFolderSet.has(folder.toLowerCase()),
	);
}
