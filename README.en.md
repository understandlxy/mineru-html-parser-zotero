# MinerU HTML Parser for Zotero

[简体中文](README.zh-CN.md) | [English](README.en.md)

MinerU HTML Parser for Zotero turns a selected Zotero PDF attachment into a readable HTML attachment through the MinerU precise parsing API. After parsing succeeds, the plugin imports the generated HTML back to Zotero and opens it automatically.

[Download Latest XPI](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest/download/mineru-html-parser-0.1.64.xpi) | [Latest Release](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest) | [MinerU API Docs](https://mineru.net/apiManage/docs)

## Features

- Adds a Zotero item/attachment context-menu action: `Parse with MinerU to HTML`.
- Accepts either one selected PDF attachment or one regular Zotero item with exactly one PDF attachment.
- Uses MinerU precise local upload parsing:
  - `POST /api/v4/file-urls/batch` to obtain an upload URL and `batch_id`
  - `PUT` the PDF to the signed upload URL
  - `GET /api/v4/extract-results/batch/{batch_id}` to poll parsing results
- Requests `extra_formats: ["html"]` and extracts `main.html`, `full.html`, or the first HTML file from the result archive.
- Applies reading-oriented HTML cleanup, including paragraph alignment, simple LaTeX cleanup, and common figure-number OCR noise suppression.
- Attaches both the generated HTML and a `.mineru-postprocess.txt` report back to the Zotero item.
- Opens the newly attached HTML in Zotero automatically after parsing finishes.

## Installation

### Install From GitHub Release

1. Open the [latest release](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest).
2. Download `mineru-html-parser-0.1.64.xpi`.
3. Open Zotero.
4. Go to `Tools -> Plugins`.
5. Open the gear menu and choose `Install Add-on From File...`.
6. Select the downloaded `.xpi` file and restart Zotero.

### Install From Add-on Market

If Add-on Market for Zotero has indexed this plugin, search for `MinerU HTML Parser` there and install it directly.

## Configuration

After installation, open the `MinerU HTML Parser` pane in Zotero preferences:

- `Parsing Key`: your MinerU precise parsing API token.
- `Parsing Model`:
  - `vlm`: recommended high-accuracy vision-language model for complex layouts, charts, and multi-column PDFs.
  - `pipeline`: general pipeline model for regular PDFs.
  - `MinerU-HTML`: intended for HTML input scenarios and usually not needed for normal PDF parsing.
- `Language`:
  - Use `Chinese (zh)` for Chinese PDFs.
  - Use `English (en)` for English PDFs.

Click `Test MinerU Connection` to verify the token. If you do not have a token, click `Apply for Free Key` in the preferences pane to open the MinerU website.

## Usage

1. Select one PDF attachment in Zotero, or select one item that has exactly one PDF attachment.
2. Right-click and choose `Parse with MinerU to HTML`.
3. Wait for parsing to finish.
4. The plugin attaches the generated HTML and postprocess report to the same Zotero item, then opens the HTML attachment.

The current version processes one PDF at a time. Files larger than 200 MB are blocked. If the plugin can estimate the page count and it is over 200 pages, it blocks the upload before submitting the task.

## Privacy And Data

- The plugin uploads the selected PDF to MinerU for parsing.
- The MinerU API token is used to call the parsing API.
- The plugin tries to save the token with Firefox/Zotero LoginManager, and also writes a Zotero preference fallback so it can keep working if LoginManager is unavailable.
- Do not publicly share Zotero configuration, debug logs, or screenshots that include your token.

## Automatic Updates

The manifest points Zotero to the `update.json` file published in GitHub Releases:

```text
https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest/download/update.json
```

When a future version updates this file, Zotero can discover the new XPI from that URL.

## Compatibility

- `strict_min_version`: `8.0`
- `strict_max_version`: `9.0.*`
- Tested with: Zotero `9.0.3`

If you use Zotero 10 or later, verify API compatibility before changing the compatibility range in `addon/manifest.json` and publishing a new build.

## FAQ

### Why does it process only one PDF at a time?

MinerU parsing can take time and may consume API quota. Handling one file at a time keeps progress, errors, and attachment ownership clear.

### What should I check if parsing fails?

Check:

- Whether the MinerU token is correct.
- Whether the PDF is larger than 200 MB or has too many pages.
- Whether Zotero can access the local PDF file path.
- Whether the network can reach the MinerU API and GitHub Release download URLs.

If MinerU returns an API error, the plugin tries to show the returned message.
