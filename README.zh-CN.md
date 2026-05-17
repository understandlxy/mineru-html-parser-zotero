# MinerU HTML Parser for Zotero

[简体中文](README.zh-CN.md) | [English](README.en.md)

MinerU HTML Parser for Zotero 可以把 Zotero 里的 PDF 附件提交给 MinerU 精准解析 API，下载解析结果中的 HTML，自动挂回 Zotero 条目，并在解析完成后直接打开生成的 HTML。

[下载最新版 XPI](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest/download/mineru-html-parser-0.1.97.xpi) | [查看 Release](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest) | [MinerU API 文档](https://mineru.net/apiManage/docs)

## 原 PDF 与解析 HTML 对比

下面这个例子展示了原始论文 PDF 和插件生成的 HTML 附件之间的差异。HTML 会保留论文主要内容，同时去掉 PDF 页面中较重的版面元素，让 Zotero 里的阅读更接近干净的文章页面。

| 原 PDF | 解析后的 HTML |
| --- | --- |
| <img src="docs/images/original-pdf.jpg" alt="原始 PDF 页面截图" width="420"> | <img src="docs/images/parsed-html.jpg" alt="解析后的 HTML 阅读页面截图" width="420"> |

## 功能

- 在 Zotero 条目或附件右键菜单中添加 `用 MinerU 解析为 HTML`。
- 支持选择一个 PDF 附件，或选择一个只包含一个 PDF 附件的普通 Zotero 条目。
- 调用 MinerU 精准解析本地文件上传流程：
  - `POST /api/v4/file-urls/batch` 获取上传地址和 `batch_id`
  - `PUT` PDF 到签名上传地址
  - `GET /api/v4/extract-results/batch/{batch_id}` 轮询解析结果
- 优先从 MinerU 结果压缩包中的 `full.md` 重建阅读 HTML，将图片嵌入为 data URL，并在解析请求中指定 `doclayout_yolo` 布局模型。
- 图片块按 MinerU 原始输出保持，不再把拆开的子图在后处理阶段重新组合成自定义组图。
- 直接嵌入 MinerU 结果压缩包中的原始图片，并使用字节数组安全转 base64，避免二进制字符串污染导致半张图变黑。
- 内置 KaTeX，将 MinerU 输出中的 LaTeX 片段渲染为 MathML，并使用 Times New Roman / Noto Serif SC 阅读字体栈。
- 将标题页的作者、机构和邮箱块整理为左对齐、不拉伸的排版，并把数字或字母作者编号显示为上标。
- 将 `[1] ... [2] ...` 这类连续参考文献拆成独立段落，避免参考文献挤成一整坨。
- 图片/表格标题中的公式渲染内容也会和标题文字一起保持加粗。
- 使用接近 A4 纸张的页面宽度、屏幕留白和打印 `@page` 页边距，让 HTML 更适合按论文版式阅读。
- 自动压缩宽表格，让多列表格尽量完整显示在 A4 风格页面内。
- 如果 Markdown 输出不可用，再回退提取 `main.html`、`full.html` 或第一个 HTML 文件。
- 对生成的 HTML 做面向阅读的后处理，包括段落排版、简单 LaTeX 清理、常见图号 OCR 噪声抑制。
- 生成一份 `.mineru-postprocess.txt` 报告，记录 HTML 后处理和图片数量变化，并和 HTML 一起附加回 Zotero 条目。
- 解析成功后自动在 Zotero 中打开新生成的 HTML 附件。

## 安装

### 从 GitHub Release 安装

1. 打开 [最新版 Release](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest)。
2. 下载 `mineru-html-parser-0.1.97.xpi`。
3. 打开 Zotero。
4. 进入 `Tools -> Plugins`。
5. 点击齿轮菜单，选择 `Install Add-on From File...`。
6. 选择刚下载的 `.xpi` 文件并重启 Zotero。

### 从插件市场安装

如果 Add-on Market for Zotero 已经收录本插件，也可以在插件市场中搜索 `MinerU HTML Parser` 并安装。

## 0.1.97 更新重点

- 修复 Springer 风格参考文献末尾条目被拆到列表外，并把下一条编号参考文献当成正文显示的问题。
- 修复作者编号上标生成时的 HTML 转义问题，避免 `<sup>` 标签残片显示在正文中。
- 修复第 1 条参考文献被解析成列表项、后续编号参考文献被错放到致谢标题后的情况。
- 清理 Elsevier 风格输出里的重复文件名标题、标题页 KaTeX 单位片段、粘连作者尾标、a/b 机构合并和实验步骤编号错位。
- 修复标题页里 `10 mm 316L` 被 MinerU 作为 KaTeX annotation 输出后仍粘成 `10 mm316L` 的情况。
- 标题页里还原出来的 `10 mm 316L` 会保持粗体，和标题其他文字一致。
- 将标题页的作者、机构和邮箱块整理为左对齐、不拉伸的排版，并支持 `1,2` 与 `a,b` 两类上标编号。
- 优化 Elsevier/CIRP 这类作者编号贴在姓氏末尾、机构 `a/b/c` 连在同一段里的标题页排版。
- 优化 Springer/Elsevier 这类作者上标被解析成 KaTeX 片段、通讯作者 `*` 被拆到下一行的标题页排版。
- 避免把 `and` 这类普通连接词里的字母误识别为作者脚注。
- 使用字节数组安全转 base64 嵌入 MinerU ZIP 原图，修复 JPEG 字节被字符串转换污染后出现的半张图黑块问题。
- HTML 后处理期间保护图片 data URL，防止正文、公式和单位清理规则误改 base64 字符。
- 直接使用 MinerU 结果压缩包中的原始图片 data URL，不再经过本地 PDF 裁图重渲染，修复图像紫色/蓝色偏色问题。
- 后处理报告不再输出 PDF 裁图替换计数，避免把已移除的实验性修复路径误认为仍在运行。
- 修复结果包不含 HTML 文件时的回退报错，确保优先使用 `full.md` 生成 HTML。
- 使用 MinerU 的 `doclayout_yolo` 布局路径，并避免在后处理阶段重新拼组图，让组图更接近原 PDF 版式。
- 内置 KaTeX，将 `$...$` / `$$...$$` 片段渲染为 MathML，避免正文直接露出 LaTeX 源码。

## 配置

安装后进入 Zotero 设置里的 `MinerU HTML Parser` 面板：

- `解析密钥`：填写 MinerU 精准解析 API Token。
- `语言`：
  - 中文 PDF 选择 `中文 (zh)`。
  - 英文 PDF 选择 `English (en)`。

可以点击 `测试 MinerU 连接` 验证 Token 是否可用。没有 Token 时，可在设置面板中点击 `免费申请密钥` 跳转到 MinerU 官网申请。

## 使用

1. 在 Zotero 中选中一个 PDF 附件，或选中一个只包含一个 PDF 附件的条目。
2. 右键选择 `用 MinerU 解析为 HTML`。
3. 等待解析进度完成。
4. 插件会把生成的 HTML 附件和后处理报告附加到同一个 Zotero 条目下，并自动打开 HTML。

当前版本一次只处理一个 PDF。文件超过 200 MB 会被阻止；如果插件能估算页数且页数超过 200 页，也会提前阻止上传。

## 隐私与数据

- 插件会把你选择的 PDF 上传到 MinerU 服务进行解析。
- MinerU API Token 会用于请求解析接口。
- 当前实现会尝试通过 Firefox/Zotero LoginManager 保存 Token，同时也会写入 Zotero 偏好作为 fallback，方便 LoginManager 不可用时继续工作。
- 不要把包含 Token 的 Zotero 配置、调试日志或截图公开分享。

## 自动更新

插件清单中配置了 GitHub Release 上的 `update.json`：

```text
https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest/download/update.json
```

当后续版本发布并更新 `update.json` 后，Zotero 可以通过该地址发现新版 XPI。

## 兼容性

- `strict_min_version`: `8.0`
- `strict_max_version`: `9.0.*`
- 已测试版本：Zotero `9.0.3`

如果你使用 Zotero 10 或更高版本，需要先确认插件 API 是否兼容，再调整 `addon/manifest.json` 中的兼容版本范围并重新发布。

## 常见问题

### 为什么只能选一个 PDF？

MinerU 解析可能耗时较长，也会消耗 API 额度；一次只处理一个文件可以让进度、错误提示和附件归属更清楚。

### 解析失败怎么办？

先检查：

- MinerU Token 是否填写正确。
- PDF 是否超过 200 MB 或页数过多。
- Zotero 是否能访问本地 PDF 文件路径。
- 网络是否能访问 MinerU API 和 GitHub Release 下载地址。

如果错误来自 MinerU API，插件会尽量把 API 返回信息展示出来。

## 致谢与参考

本插件的 MinerU 请求参数组织、Markdown 优先渲染方向、公式渲染方式和参考文献拆分思路，参考了 Full Text Translate Zotero 插件。

公式渲染使用内置 KaTeX 构建。
