# MinerU HTML Parser for Zotero

This repository contains a Zotero bootstrapped plugin that sends one local PDF attachment to the MinerU precise parsing API and attaches the generated HTML back to the Zotero item.

## Features

- Adds a Zotero item context-menu action: `用 MinerU 解析为 HTML`.
- Accepts either one selected PDF attachment or one regular Zotero item with exactly one PDF attachment.
- Uses MinerU precise local upload parsing:
  - `POST /api/v4/file-urls/batch`
  - `PUT` the local PDF to the signed upload URL without a `Content-Type` header
  - `GET /api/v4/extract-results/batch/{batch_id}`
- Requests `extra_formats: ["html"]` and extracts `main.html`, `full.html`, or the first HTML file from the result zip.
- Stores the MinerU API token in Firefox/Zotero LoginManager rather than plain Zotero preferences.

## Development Load

1. Open Zotero.
2. Go to `Tools -> Plugins`.
3. Use the gear menu and choose `Install Add-on From File...` for packaged testing, or follow Zotero's source-loading workflow with the `addon` directory.
4. Open Zotero settings and configure `MinerU HTML Parser`.

For source loading, Zotero expects an extension proxy file in the profile `extensions` directory whose filename is the plugin id and whose contents are the absolute path to the plugin directory:

```text
C:\Users\talka\OneDrive\文档\New project 3\addon\
```

Use this filename:

```text
mineru-html@example.com
```

## Package

Run from the repository root:

```powershell
.\scripts\package.ps1
```

The script writes a versioned XPI such as:

```text
dist\mineru-html-parser-0.1.48.xpi
```

The package script uses .NET zip APIs and explicitly writes `/` entry names so the XPI remains compatible when built on Windows.

## Release

The public repository is expected to be:

```text
https://github.com/understandlxy/mineru-html-parser-zotero
```

To publish a new version:

1. Update `addon/manifest.json`.
2. Update `update.json` so the version and `update_link` point to the same tag.
3. Commit the changes.
4. Push a tag that matches the manifest version, for example `v0.1.48`.

The GitHub Actions release workflow packages the XPI and uploads both the XPI and `update.json` to the GitHub Release.

## Add-on Market

Add-on Market for Zotero can discover GitHub-hosted plugins through scraper/index repositories. For `syt2/zotero-addons-scraper`, submit an entry like:

```json
{
  "repo": "understandlxy/mineru-html-parser-zotero",
  "tags": ["attachment", "utility"]
}
```

This repository includes the same snippet at `docs/marketplace/syt2-zotero-addons-scraper-entry.json` for convenience.

## Compatibility

- `strict_min_version`: `8.0`
- `strict_max_version`: `9.0.*`
- Confirmed local Zotero install during development: `9.0.3`

## Notes

- The plugin blocks files over 200 MB.
- PDF page count detection is best-effort because many PDFs compress page objects; if the count can be estimated and is over 200 pages, parsing is blocked before upload.
- The first version intentionally handles one PDF at a time and polls MinerU rather than using callbacks.
