import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/defaults';
import {
	getDuplicateBasenameKeys,
	getGraphDisplayTitle,
	isInGraphFolderScope,
	parseFolderScopePaths,
	normalizeFolderScopePath,
	shouldConsiderGraphFile,
} from '../src/graph-label-rules';
import type { ContextTitlesSettings, TitleSource } from '../src/types';

function makeFile(path: string): TitleSource {
	const name = path.split('/').pop() ?? path;
	const extensionStart = name.lastIndexOf('.');
	const basename = extensionStart > 0 ? name.slice(0, extensionStart) : name;

	return { path, basename };
}

function settings(
	overrides: Partial<ContextTitlesSettings> = {},
): ContextTitlesSettings {
	return {
		...DEFAULT_SETTINGS,
		ignoredFolders: [...DEFAULT_SETTINGS.ignoredFolders],
		...overrides,
	};
}

describe('getGraphDisplayTitle', () => {
	it('adds context only for duplicate basenames by default', () => {
		const alphaTasks = makeFile('Projects/Alpha/Tasks.md');
		const betaTasks = makeFile('Projects/Beta/Tasks.md');
		const achievements = makeFile('Career/Achievements.md');
		const files = [alphaTasks, betaTasks, achievements];

		expect(getGraphDisplayTitle(alphaTasks, files, settings())).toBe(
			'Alpha - Tasks',
		);
		expect(getGraphDisplayTitle(betaTasks, files, settings())).toBe(
			'Beta - Tasks',
		);
		expect(getGraphDisplayTitle(achievements, files, settings())).toBe(
			'Achievements',
		);
	});

	it('can label every visible graph file when requested', () => {
		const achievements = makeFile('Career/Achievements.md');
		const files = [achievements, makeFile('Projects/Alpha/Tasks.md')];

		expect(
			getGraphDisplayTitle(
				achievements,
				files,
				settings({ graphLabelMode: 'all' }),
			),
		).toBe('Career - Achievements');
	});

	it('removes context when a basename is no longer duplicated', () => {
		const alphaTasks = makeFile('Projects/Alpha/Tasks.md');
		const betaTasks = makeFile('Projects/Beta/Tasks.md');

		expect(
			getGraphDisplayTitle(alphaTasks, [alphaTasks, betaTasks], settings()),
		).toBe('Alpha - Tasks');
		expect(getGraphDisplayTitle(alphaTasks, [alphaTasks], settings())).toBe(
			'Tasks',
		);
	});

	it('leaves ignored folders as normal basenames', () => {
		const templateTasks = makeFile('Templates/Tasks.md');
		const alphaTasks = makeFile('Projects/Alpha/Tasks.md');
		const betaTasks = makeFile('Projects/Beta/Tasks.md');
		const files = [templateTasks, alphaTasks, betaTasks];

		expect(getGraphDisplayTitle(templateTasks, files, settings())).toBe('Tasks');
		expect(getGraphDisplayTitle(alphaTasks, files, settings())).toBe(
			'Alpha - Tasks',
		);
	});

	it('excludes one folder tree from graph labels', () => {
		const alphaTasks = makeFile('Projects/Alpha/Tasks.md');
		const alphaSubfolderTasks = makeFile(
			'Projects/Alpha/Subfolder/Tasks.md',
		);
		const betaTasks = makeFile('Projects/Beta/Tasks.md');
		const files = [alphaTasks, alphaSubfolderTasks, betaTasks];
		const scopedSettings = settings({
			graphFolderScopeMode: 'exclude',
			graphFolderScopePath: 'Projects/Alpha',
		});

		expect(getGraphDisplayTitle(alphaTasks, files, scopedSettings)).toBe(
			'Tasks',
		);
		expect(
			getGraphDisplayTitle(alphaSubfolderTasks, files, scopedSettings),
		).toBe('Tasks');
		expect(getGraphDisplayTitle(betaTasks, files, scopedSettings)).toBe(
			'Tasks',
		);
	});

	it('includes only one folder tree for graph labels', () => {
		const alphaTasks = makeFile('Projects/Alpha/Tasks.md');
		const alphaSubfolderTasks = makeFile(
			'Projects/Alpha/Subfolder/Tasks.md',
		);
		const betaTasks = makeFile('Projects/Beta/Tasks.md');
		const files = [alphaTasks, alphaSubfolderTasks, betaTasks];
		const scopedSettings = settings({
			graphFolderScopeMode: 'include',
			graphFolderScopePath: 'Projects/Alpha',
		});

		expect(getGraphDisplayTitle(alphaTasks, files, scopedSettings)).toBe(
			'Alpha - Tasks',
		);
		expect(
			getGraphDisplayTitle(alphaSubfolderTasks, files, scopedSettings),
		).toBe('Subfolder - Tasks');
		expect(getGraphDisplayTitle(betaTasks, files, scopedSettings)).toBe(
			'Tasks',
		);
	});
});

describe('getDuplicateBasenameKeys', () => {
	it('counts only files eligible for graph labels', () => {
		expect(
			getDuplicateBasenameKeys(
				[
					makeFile('Templates/Tasks.md'),
					makeFile('Projects/Alpha/Tasks.md'),
					makeFile('Projects/Beta/Tasks.md'),
					makeFile('Career/Achievements.md'),
				],
				settings(),
			),
		).toEqual(new Set(['tasks']));
	});
});

describe('folder scope helpers', () => {
	it('normalizes user-entered folder paths', () => {
		expect(normalizeFolderScopePath('/Projects\\Alpha//')).toBe(
			'Projects/Alpha',
		);
	});

	it('checks include and exclude scope against the whole folder tree', () => {
		const filePath = 'Projects/Alpha/Subfolder/Tasks.md';

		expect(
			isInGraphFolderScope(
				filePath,
				settings({
					graphFolderScopeMode: 'include',
					graphFolderScopePath: 'projects/alpha',
				}),
			),
		).toBe(true);
		expect(
			isInGraphFolderScope(
				filePath,
				settings({
					graphFolderScopeMode: 'exclude',
					graphFolderScopePath: 'Projects/Alpha',
				}),
			),
		).toBe(false);
	});

	it('supports multiple include and exclude folders', () => {
		expect(
			parseFolderScopePaths('Projects/Alpha, Templates\nprojects/alpha'),
		).toEqual(['Projects/Alpha', 'Templates']);
		expect(
			isInGraphFolderScope(
				'Templates/Tasks.md',
				settings({
					graphFolderScopeMode: 'include',
					graphFolderScopePath: 'Projects/Alpha, Templates',
				}),
			),
		).toBe(true);
		expect(
			isInGraphFolderScope(
				'Templates/Tasks.md',
				settings({
					graphFolderScopeMode: 'exclude',
					graphFolderScopePath: 'Projects/Alpha, Templates',
				}),
			),
		).toBe(false);
	});

	it('handles messy folder scope input', () => {
		expect(
			parseFolderScopePaths(
				'  /Projects\\Alpha//  \n\n Resources/Templates/ , projects/alpha ',
			),
		).toEqual(['Projects/Alpha', 'Resources/Templates']);
		expect(
			isInGraphFolderScope(
				'Resources/Templates/Daily/Tasks.md',
				settings({
					graphFolderScopeMode: 'include',
					graphFolderScopePath: 'Resources/Templates/',
				}),
			),
		).toBe(true);
	});

	it('does not apply folder scope when the scope path is blank', () => {
		expect(
			shouldConsiderGraphFile(
				makeFile('Projects/Alpha/Tasks.md'),
				settings({
					graphFolderScopeMode: 'include',
					graphFolderScopePath: '',
				}),
			),
		).toBe(true);
	});
});
