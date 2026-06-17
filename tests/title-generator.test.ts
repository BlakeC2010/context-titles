import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/defaults';
import {
	formatSeparator,
	generateContextTitle,
	normalizeIgnoredFolders,
} from '../src/title-generator';
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

describe('generateContextTitle', () => {
	it('uses the parent folder by default', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Alpha/Overview.md'),
				settings(),
			),
		).toBe('Alpha - Overview');
	});

	it('keeps root files as their normal basename', () => {
		expect(generateContextTitle(makeFile('Main.md'), settings())).toBe('Main');
	});

	it('uses full path mode', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Alpha/Overview.md'),
				settings({ pathMode: 'full' }),
			),
		).toBe('Projects - Alpha - Overview');
	});

	it('uses last 2 folders mode', () => {
		expect(
			generateContextTitle(
				makeFile('Areas/Projects/Alpha/Overview.md'),
				settings({ pathMode: 'last-2' }),
			),
		).toBe('Projects - Alpha - Overview');
	});

	it('uses last 3 folders mode', () => {
		expect(
			generateContextTitle(
				makeFile('Vault/Areas/Projects/Alpha/Overview.md'),
				settings({ pathMode: 'last-3' }),
			),
		).toBe('Areas - Projects - Alpha - Overview');
	});

	it('uses clean spacing for custom separators', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Alpha/Overview.md'),
				settings({ separator: '/' }),
			),
		).toBe('Alpha / Overview');
	});

	it('trims spaced custom separators', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Alpha/Overview.md'),
				settings({ separator: '  >  ' }),
			),
		).toBe('Alpha > Overview');
	});

	it('uses colon spacing without a leading space before the colon', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Alpha/Overview.md'),
				settings({ separator: ':' }),
			),
		).toBe('Alpha: Overview');
	});

	it('falls back to the default separator when the separator is blank', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Alpha/Overview.md'),
				settings({ separator: '   ' }),
			),
		).toBe('Alpha - Overview');
	});

	it('returns only the basename inside an ignored folder', () => {
		expect(
			generateContextTitle(
				makeFile('Templates/Overview.md'),
				settings(),
			),
		).toBe('Overview');
	});

	it('returns only the basename when any ancestor folder is ignored', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Alpha/Templates/Overview.md'),
				settings(),
			),
		).toBe('Overview');
	});

	it('matches ignored folders case-insensitively', () => {
		expect(
			generateContextTitle(
				makeFile('projects/alpha/media/Overview.md'),
				settings(),
			),
		).toBe('Overview');
	});

	it('supports non-Markdown files', () => {
		expect(
			generateContextTitle(
				makeFile('Reference/Certificates/Sample.pdf'),
				settings(),
			),
		).toBe('Certificates - Sample');
	});

	it('keeps spaces and special characters from folder and file names', () => {
		expect(
			generateContextTitle(
				makeFile('Projects/Beta/Research Notes.md'),
				settings(),
			),
		).toBe('Beta - Research Notes');
	});
});

describe('formatSeparator', () => {
	it('formats separators with readable spacing', () => {
		expect(formatSeparator('-')).toBe(' - ');
		expect(formatSeparator('>')).toBe(' > ');
		expect(formatSeparator(':')).toBe(': ');
	});
});

describe('normalizeIgnoredFolders', () => {
	it('trims empty values and removes duplicates', () => {
		expect(
			normalizeIgnoredFolders([' Templates ', '', 'Media', 'Templates']),
		).toEqual(['Templates', 'Media']);
	});
});
