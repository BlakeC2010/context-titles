export const PATH_MODES = ['parent', 'full', 'last-2', 'last-3'] as const;
export const GRAPH_LABEL_MODES = ['duplicates-only', 'all'] as const;
export const GRAPH_FOLDER_SCOPE_MODES = ['exclude', 'include'] as const;

export type PathMode = (typeof PATH_MODES)[number];
export type GraphLabelMode = (typeof GRAPH_LABEL_MODES)[number];
export type GraphFolderScopeMode = (typeof GRAPH_FOLDER_SCOPE_MODES)[number];

export interface ContextTitlesSettings {
	enableGraphLabels: boolean;
	graphLabelMode: GraphLabelMode;
	graphFolderScopeMode: GraphFolderScopeMode;
	graphFolderScopePath: string;
	separator: string;
	pathMode: PathMode;
	ignoredFolders: string[];
}

export interface TitleSource {
	path: string;
	basename: string;
}
