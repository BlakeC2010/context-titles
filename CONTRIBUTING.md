# Contributing to Context Titles

Thanks for helping improve Context Titles.

## Development setup

1. Fork or clone the repository.
2. Run `npm install`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm run lint`.

Test plugin changes in a separate Obsidian development vault by copying `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/context-titles/`.

## Pull requests

Keep changes focused on the plugin's purpose: making duplicate Graph View and Local Graph labels easier to distinguish without renaming notes or editing note content.

Before opening a pull request, make sure tests, build, and lint all pass. Include a short description of the behavior changed and any manual Obsidian testing you performed.

## Bug reports

Include your Obsidian version, Context Titles version, the relevant note paths, the expected labels, and the labels you actually saw. Screenshots are useful for Graph View issues.
