import { generateContextTitle } from './title-generator';
import type { ContextTitlesSettings, TitleSource } from './types';

export function getGraphDisplayTitle(
	file: TitleSource,
	visibleFiles: readonly TitleSource[],
	settings: ContextTitlesSettings,
): string {
	const files = visibleFiles.some((visibleFile) => visibleFile.path === file.path)
		? visibleFiles
		: [...visibleFiles, file];

	return getGraphDisplayTitles(files, settings).get(file.path) ?? file.basename;
}

export function getGraphDisplayTitles(
	files: readonly TitleSource[],
	settings: ContextTitlesSettings,
): Map<string, string> {
	const duplicateBasenameKeys = getDuplicateBasenameKeys(files, settings);
	const automaticContextDepths =
		settings.pathMode === 'automatic'
			? getAutomaticContextDepths(files, settings, duplicateBasenameKeys)
			: new Map<string, number>();
	const displayTitles = new Map<string, string>();

	for (const file of files) {
		displayTitles.set(
			file.path,
			getGraphDisplayTitleWithDuplicateKeys(
				file,
				duplicateBasenameKeys,
				settings,
				automaticContextDepths.get(file.path),
			),
		);
	}

	return displayTitles;
}

export function getGraphDisplayTitleWithDuplicateKeys(
	file: TitleSource,
	duplicateBasenameKeys: ReadonlySet<string>,
	settings: ContextTitlesSettings,
	automaticContextDepth?: number,
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

	return generateContextTitle(file, settings, automaticContextDepth);
}

export function getAutomaticContextDepths(
	files: readonly TitleSource[],
	settings: ContextTitlesSettings,
	duplicateBasenameKeys: ReadonlySet<string> = getDuplicateBasenameKeys(
		files,
		settings,
	),
): Map<string, number> {
	const filesByBasename = new Map<string, TitleSource[]>();

	for (const file of files) {
		if (!shouldConsiderGraphFile(file, settings)) {
			continue;
		}

		const basenameKey = getNormalizedBasename(file.basename);

		if (
			settings.graphLabelMode === 'duplicates-only' &&
			!duplicateBasenameKeys.has(basenameKey)
		) {
			continue;
		}

		const group = filesByBasename.get(basenameKey) ?? [];
		group.push(file);
		filesByBasename.set(basenameKey, group);
	}

	const contextDepths = new Map<string, number>();

	for (const group of filesByBasename.values()) {
		for (const file of group) {
			contextDepths.set(file.path, 1);
		}

		while (expandCollidingContext(group, contextDepths, settings)) {
			// Keep expanding only labels that still collide.
		}
	}

	return contextDepths;
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

function expandCollidingContext(
	files: readonly TitleSource[],
	contextDepths: Map<string, number>,
	settings: ContextTitlesSettings,
): boolean {
	const filesByTitle = new Map<string, TitleSource[]>();

	for (const file of files) {
		const displayTitle = generateContextTitle(
			file,
			settings,
			contextDepths.get(file.path) ?? 1,
		);
		const matchingFiles = filesByTitle.get(displayTitle) ?? [];
		matchingFiles.push(file);
		filesByTitle.set(displayTitle, matchingFiles);
	}

	let expanded = false;

	for (const matchingFiles of filesByTitle.values()) {
		if (matchingFiles.length < 2) {
			continue;
		}

		for (const file of matchingFiles) {
			const currentDepth = contextDepths.get(file.path) ?? 1;
			const maxDepth = Math.max(1, getFolderDepth(file.path));

			if (currentDepth < maxDepth) {
				contextDepths.set(file.path, currentDepth + 1);
				expanded = true;
			}
		}
	}

	return expanded;
}

function getFolderDepth(path: string): number {
	return Math.max(
		0,
		path.split('/').filter((segment) => segment.length > 0).length - 1,
	);
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
