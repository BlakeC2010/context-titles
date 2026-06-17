import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../src/defaults';
import {
	isGraphFolderScopeMode,
	isGraphLabelMode,
	isPathMode,
	normalizeSettings,
	parseIgnoredFolders,
} from '../src/settings-data';

describe('normalizeSettings', () => {
	it('uses defaults when no saved settings exist', () => {
		expect(normalizeSettings(null)).toEqual({
			...DEFAULT_SETTINGS,
			ignoredFolders: [...DEFAULT_SETTINGS.ignoredFolders],
		});
	});

	it('enables graph labels when migrating older saved settings', () => {
		expect(
			normalizeSettings({
				separator: '-',
				pathMode: 'parent',
				ignoredFolders: [],
			}),
		).toMatchObject({
			enableGraphLabels: true,
			graphLabelMode: 'duplicates-only',
			graphFolderScopeMode: 'include',
			graphFolderScopePath: '',
		});
	});

	it('preserves an explicit disabled graph label setting', () => {
		expect(
			normalizeSettings({
				enableGraphLabels: false,
			}).enableGraphLabels,
		).toBe(false);
	});

	it('falls back for invalid values and normalizes ignored folders', () => {
		expect(
			normalizeSettings({
				enableGraphLabels: true,
				graphLabelMode: 'all',
				graphFolderScopeMode: 'exclude',
				graphFolderScopePath: '/Projects\\Alpha/, Resources/Templates/',
				separator: '/',
				pathMode: 'not-a-mode' as never,
				ignoredFolders: [' Templates ', '', 'Media', 'Templates'],
			}),
		).toEqual({
			enableGraphLabels: true,
			graphLabelMode: 'all',
			graphFolderScopeMode: 'exclude',
			graphFolderScopePath: 'Projects/Alpha\nResources/Templates',
			separator: '/',
			pathMode: DEFAULT_SETTINGS.pathMode,
			ignoredFolders: ['Templates', 'Media'],
		});
	});

	it('falls back to defaults when saved value types are invalid', () => {
		expect(
			normalizeSettings({
				enableGraphLabels: 'yes' as never,
				graphLabelMode: 'sometimes' as never,
				graphFolderScopeMode: 'near' as never,
				graphFolderScopePath: 12 as never,
				separator: 42 as never,
				pathMode: 'sideways' as never,
				ignoredFolders: 'Templates' as never,
			}),
		).toEqual({
			...DEFAULT_SETTINGS,
			ignoredFolders: [...DEFAULT_SETTINGS.ignoredFolders],
		});
	});
});

describe('parseIgnoredFolders', () => {
	it('supports comma-separated and line-separated values', () => {
		expect(parseIgnoredFolders('Templates, Media\nGenerated')).toEqual([
			'Templates',
			'Media',
			'Generated',
		]);
	});

	it('trims empty values and removes duplicate folder names', () => {
		expect(parseIgnoredFolders(' Templates, ,Media\nTemplates')).toEqual([
			'Templates',
			'Media',
		]);
	});
});

describe('isPathMode', () => {
	it('accepts only supported path modes', () => {
		expect(isPathMode('parent')).toBe(true);
		expect(isPathMode('full')).toBe(true);
		expect(isPathMode('sideways')).toBe(false);
	});
});

describe('isGraphLabelMode', () => {
	it('accepts only supported graph label modes', () => {
		expect(isGraphLabelMode('duplicates-only')).toBe(true);
		expect(isGraphLabelMode('all')).toBe(true);
		expect(isGraphLabelMode('sometimes')).toBe(false);
	});
});

describe('isGraphFolderScopeMode', () => {
	it('accepts only supported graph folder scope modes', () => {
		expect(isGraphFolderScopeMode('all')).toBe(false);
		expect(isGraphFolderScopeMode('exclude')).toBe(true);
		expect(isGraphFolderScopeMode('include')).toBe(true);
		expect(isGraphFolderScopeMode('near')).toBe(false);
	});
});
