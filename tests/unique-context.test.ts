import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/defaults';
import { getGraphDisplayTitle } from '../src/graph-label-rules';
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

describe('unique graph context', () => {
	it('adds another folder when duplicate notes share the same parent name', () => {
		const projectTasks = makeFile('Projects/Alpha/Tasks.md');
		const schoolTasks = makeFile('School/Alpha/Tasks.md');
		const files = [projectTasks, schoolTasks];

		expect(getGraphDisplayTitle(projectTasks, files, settings())).toBe(
			'Projects - Alpha - Tasks',
		);
		expect(getGraphDisplayTitle(schoolTasks, files, settings())).toBe(
			'School - Alpha - Tasks',
		);
	});

	it('expands only the labels that still collide', () => {
		const projectTasks = makeFile('Projects/Alpha/Tasks.md');
		const schoolTasks = makeFile('School/Alpha/Tasks.md');
		const gammaTasks = makeFile('Projects/Gamma/Tasks.md');
		const files = [projectTasks, schoolTasks, gammaTasks];

		expect(getGraphDisplayTitle(projectTasks, files, settings())).toBe(
			'Projects - Alpha - Tasks',
		);
		expect(getGraphDisplayTitle(schoolTasks, files, settings())).toBe(
			'School - Alpha - Tasks',
		);
		expect(getGraphDisplayTitle(gammaTasks, files, settings())).toBe(
			'Gamma - Tasks',
		);
	});

	it('fixes collisions for existing saved parent-folder settings', () => {
		const projectTasks = makeFile('Projects/Alpha/Tasks.md');
		const schoolTasks = makeFile('School/Alpha/Tasks.md');
		const files = [projectTasks, schoolTasks];

		expect(
			getGraphDisplayTitle(
				projectTasks,
				files,
				settings({ pathMode: 'parent' }),
			),
		).toBe('Projects - Alpha - Tasks');
	});

	it('keeps the selected path mode as the minimum context depth', () => {
		const alphaTasks = makeFile('Areas/Projects/Alpha/Tasks.md');
		const betaTasks = makeFile('Areas/Projects/Beta/Tasks.md');
		const files = [alphaTasks, betaTasks];

		expect(
			getGraphDisplayTitle(
				alphaTasks,
				files,
				settings({ pathMode: 'last-2' }),
			),
		).toBe('Projects - Alpha - Tasks');
		expect(
			getGraphDisplayTitle(
				betaTasks,
				files,
				settings({ pathMode: 'last-2' }),
			),
		).toBe('Projects - Beta - Tasks');
	});
});
