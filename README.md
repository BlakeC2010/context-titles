# Context Titles

Context Titles is an Obsidian community plugin that makes repeated note names easier to read by adding folder context to the displayed title.

```text
Projects/Alpha/Overview.md
-> Alpha - Overview
```

The real file stays `Overview.md`. The plugin does not rename files, modify note contents, or require frontmatter titles.

By default, Context Titles only changes Graph View labels when the visible graph contains duplicate file names. A unique note like `Reference/Guides/Index.md` stays `Index`, while duplicate notes like `Projects/Alpha/Tasks.md` and `Projects/Beta/Tasks.md` become `Alpha - Tasks` and `Beta - Tasks`.

## What it does

Context Titles changes Graph View and Local Graph labels at display time so repeated note names are easier to tell apart.

In duplicate-only mode, labels receive folder context only when the visible graph contains more than one file with the same basename. If only one `Tasks.md` is visible, it stays `Tasks`. If `Projects/Alpha/Tasks.md` and `Projects/Beta/Tasks.md` are both visible, they display as `Alpha - Tasks` and `Beta - Tasks`.

## What it does not do

- Does not rename files.
- Does not edit note contents.
- Does not require frontmatter titles.
- Does not change normal note headers, breadcrumbs, editor titles, or File Explorer labels.
- Does not modify Canvas files or search/backlink results.

## What works in v0.3.4

- Shows generated context labels in Graph View and Local Graph through an experimental, isolated graph adapter.
- Labels duplicate file names only by default.
- Can optionally label every visible graph file.
- Can include or exclude specific folder trees.
- Generates display titles automatically from `TFile.path` and `TFile.basename`.
- Defaults to parent-folder context: `Folder - File`.
- Supports parent folder, full path, last 2 folders, and last 3 folders.
- Supports a configurable separator.
- Uses built-in ignored folder defaults for common non-note folders.
- Adds a settings tab.
- Adds a command to show the generated title for the active file.
- Adds a command to refresh graph labels.
- Adds a live settings preview.
- Adds a reset-to-defaults button.
- Documents the current display-area support matrix.

## Defaults

- Separator: `-`, rendered with clean spacing as `Alpha - Overview`.
- Path mode: parent folder.
- Built-in ignored folders: `Templates`, `Generated`, `Media`, `Attachments`.

If a file is inside an ignored folder, Context Titles returns only the normal basename. Root files also return only the basename.

Files inside ignored folders keep their normal basename.

## Settings

Context Titles saves settings in the plugin's `data.json` file and normalizes bad saved values back to defaults when the plugin loads.

- Graph view and local graph labels: turns the Graph View and Local Graph adapter on or off. This is enabled by default.
- Graph label mode: controls whether context is added only for duplicate file names or for every visible graph file. The default is `Duplicate file names only`.
- Include / exclude: off means Context Titles only affects the listed folders; on skips the listed folders.
- Folders to include/exclude: vault-relative folder paths such as `Projects/Alpha` or `Resources/Templates`. Enter one folder per line. Leave blank for all folders.
- Separator: text placed between the path context and file name. The default is `-`, displayed as `Alpha - Overview`. Blank separators display with the default separator.
- Path mode: controls how much folder context appears before the file name.
- Parent folder only: `Projects/Alpha/Overview.md` becomes `Alpha - Overview`.
- Full path: `Projects/Alpha/Overview.md` becomes `Projects - Alpha - Overview`.
- Last 2 folders: `Areas/Projects/Alpha/Overview.md` becomes `Projects - Alpha - Overview`.
- Last 3 folders: `Vault/Areas/Projects/Alpha/Overview.md` becomes `Areas - Projects - Alpha - Overview`.
- Live preview: shows the current output for `Projects/Alpha/Overview.md`.
- Reset to defaults: restores the graph label toggle, folder scope, separator, and path mode to their defaults.

## Folder scope

Folder scope uses vault-relative folder paths. Blank lines, extra spaces, repeated slashes, trailing slashes, and Windows backslashes are normalized. A blank folder list means all folders.

Nested folders are included in the match. For example, `Projects/Alpha` also matches `Projects/Alpha/Research/Tasks.md`.

## Current limitations

Obsidian does not expose a public Graph View label-provider API. Context Titles supports Graph View and Local Graph through an isolated runtime adapter that touches Obsidian's internal graph renderer labels and restores normal labels when the plugin unloads or when graph labels are disabled. This may need maintenance if Obsidian changes Graph View internals.

Obsidian also does not expose a general public title-provider API for built-in display areas. Context Titles supports Graph View and Local Graph first because they are where duplicate note basenames are most confusing, and because their adapter can be isolated behind one setting with unload cleanup.

Context Titles does not rename files, modify notes, add frontmatter, or edit Canvas files.

## Display area support

| Display area | Clean public API? | DOM/internal patching required? | v0.3 decision |
| --- | --- | --- | --- |
| Graph View | No public label-provider API found. | Yes. Uses the internal graph renderer node list and Pixi text labels. | Supported through the experimental graph adapter. |
| Local Graph | No public label-provider API found. | Yes. Uses the same renderer family as Graph View. | Supported through the experimental graph adapter. |
| File Explorer | No public file-name display provider found. | Yes. Would require patching File Explorer DOM or internal tree items. | Delayed. Folder nesting already provides context, so the value is low. |
| Tabs/editor title/breadcrumbs | No public title override provider for built-in file views. | Yes. Would require patching view title methods or workspace DOM. | Delayed. Breadcrumbs already show folder context, and this previously created duplicated paths. |
| Built-in Quick Switcher | No public result-rendering hook found. | Yes. Would require patching modal internals. | Delayed. |
| Search | Search helper functions are public, but the built-in Search pane result labels are not exposed for replacement. | Yes. Would require patching core Search view DOM or internals. | Delayed. |
| Backlinks/Outgoing Links | No public result-label hook found. | Yes. Would require patching core plugin DOM or internals. | Delayed. |
| Canvas cards | Public `.canvas` data types exist, but no runtime display-title provider was found. | Yes, or it would require modifying `.canvas` files, which this plugin must not do. | Delayed. |

The Graph View adapter patches labels at runtime and restores the normal labels when the plugin unloads or when the graph-label setting is disabled.

The previous workspace title experiment was removed because it affected the normal note header/breadcrumb area, where folder context is already visible.

Those areas should wait for dedicated public APIs, a future Obsidian API addition, or a separate experimental adapter with a clear setting and unload cleanup.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Build the plugin:

```bash
npm run build
```

Start watch mode during development:

```bash
npm run dev
```

The build writes `main.js` in the project root.

Context Titles v0.3.4 requires Obsidian `1.0.0` or newer.

## Manual install in a dev vault

Do not develop or test plugins in your main vault. Use a separate Obsidian development vault.

1. Build the plugin with `npm run build`.
2. Create this folder in the dev vault: `.obsidian/plugins/context-titles/`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. Reload Obsidian.
5. Open Settings -> Community plugins.
6. Enable Context Titles.

For local development, the plugin folder name should match the manifest id: `context-titles`.

## Manual test checklist

Create notes like these in a development vault:

```text
Projects/Alpha/Overview.md
Projects/Beta/Overview.md
Projects/Alpha/Tasks.md
Templates/Overview.md
Main.md
Reference/Certificates/Sample.pdf
```

Then verify:

- The command `Show active context title` shows `Alpha - Overview` for `Projects/Alpha/Overview.md`.
- The command `Show active context title` shows `Beta - Overview` for `Projects/Beta/Overview.md`.
- The command `Show active context title` shows `Overview` for `Templates/Overview.md`.
- The command `Show active context title` shows `Main` for `Main.md`.
- The command `Refresh graph labels` forces Graph View and Local Graph labels to rescan.
- Graph View shows duplicate note names with context, such as `Alpha - Tasks` and `Beta - Tasks`.
- Graph View leaves non-duplicate note names unchanged, such as `Achievements`.
- Setting graph label mode to `Every visible graph file` brings back the previous behavior where all visible graph files receive context.
- Turning `Include / exclude` off and entering folder paths only affects those folder trees.
- Turning `Include / exclude` on and entering folder paths skips those folder trees.
- Local Graph shows context labels for visible file nodes.
- Changing the separator updates generated titles.
- Changing path mode updates generated titles.
- Clicking `Reset to defaults` restores separator `-`, path mode `Parent folder only`, and the default folder scope.
- Normal note headers, breadcrumbs, and editor titles stay unchanged.

## Official references

- Obsidian plugin build guide: <https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin>
- Official sample plugin: <https://github.com/obsidianmd/obsidian-sample-plugin>
- Obsidian API types: <https://github.com/obsidianmd/obsidian-api>
- Manifest docs: <https://docs.obsidian.md/Reference/Manifest>
