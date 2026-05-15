# MinerU HTML Parser for Zotero

Submit a Zotero PDF attachment to the MinerU precise parsing API, import the generated HTML back into Zotero, and open the HTML attachment automatically when parsing finishes.

[简体中文](README.zh-CN.md) | [English](README.en.md)

## Download

- [Latest XPI](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest/download/mineru-html-parser-0.1.71.xpi)
- [Latest Release](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest)
- [MinerU API Docs](https://mineru.net/apiManage/docs)

## Highlights

- Adds a Zotero context-menu action for parsing a selected PDF attachment into HTML.
- Imports the generated HTML and a postprocess report back to the same Zotero item.
- Opens the new HTML attachment in Zotero automatically after a successful parse.
- Builds the reading HTML from MinerU `full.md` first and asks MinerU to use the `doclayout_yolo` layout model so original figure regions are preserved before HTML generation.
- Keeps image blocks faithful to MinerU output instead of recombining split subfigures after parsing.
- Bundles KaTeX to render MinerU LaTeX fragments as MathML and uses a Times New Roman / Noto Serif SC reading font stack.
- Splits bracketed bibliography entries such as `[1] ... [2] ...` into separate reference paragraphs.
- Keeps rendered math inside figure/table captions bold with the surrounding caption text.
- Uses an A4-like page width, screen margins, and print `@page` margins for paper-friendly HTML reading.
- Automatically compacts wide tables so multi-column tables fit inside the A4-style page.
- Cleans common reading friction in the generated HTML, including paragraph alignment, simple LaTeX, and figure OCR noise.

## Version 0.1.71

This release focuses on paper-like reading quality for MinerU output:

- Preserves original grouped figures by using MinerU's `doclayout_yolo` layout path and avoiding post-hoc image recomposition.
- Renders inline and block LaTeX with bundled KaTeX MathML output.
- Uses Times New Roman / Noto Serif SC typography with an A4-style reading page and print margins.
- Splits compacted reference lists into one paragraph per bracketed reference.
- Keeps caption math bold and automatically compacts wide tables to fit the page.

## Acknowledgements

This plugin's MinerU request shape, Markdown-first rendering direction, formula rendering approach, and reference-list handling were informed by the Full Text Translate Zotero plugin.

Formula rendering is powered by a bundled KaTeX build.
