# MinerU HTML Parser for Zotero

[简体中文](README.zh-CN.md) | [English](README.en.md)

MinerU HTML Parser for Zotero 可以把 Zotero 里的 PDF 附件提交给 MinerU 精准解析 API，下载解析结果中的 HTML，自动挂回 Zotero 条目，并在解析完成后直接打开生成的 HTML。

[下载最新版 XPI](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest/download/mineru-html-parser-0.1.50.xpi) | [查看 Release](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest) | [MinerU API 文档](https://mineru.net/apiManage/docs)

## 功能

- 在 Zotero 条目或附件右键菜单中添加 `用 MinerU 解析为 HTML`。
- 支持选择一个 PDF 附件，或选择一个只包含一个 PDF 附件的普通 Zotero 条目。
- 调用 MinerU 精准解析本地文件上传流程：
  - `POST /api/v4/file-urls/batch` 获取上传地址和 `batch_id`
  - `PUT` PDF 到签名上传地址
  - `GET /api/v4/extract-results/batch/{batch_id}` 轮询解析结果
- 请求 `extra_formats: ["html"]`，优先提取结果压缩包中的 `main.html`、`full.html` 或第一个 HTML 文件。
- 对生成的 HTML 做面向阅读的后处理，包括段落排版、简单 LaTeX 清理、常见图号 OCR 噪声抑制。
- 生成一份 `.mineru-postprocess.txt` 报告，和 HTML 一起附加回 Zotero 条目。
- 解析成功后自动在 Zotero 中打开新生成的 HTML 附件。

## 安装

### 从 GitHub Release 安装

1. 打开 [最新版 Release](https://github.com/understandlxy/mineru-html-parser-zotero/releases/latest)。
2. 下载 `mineru-html-parser-0.1.50.xpi`。
3. 打开 Zotero。
4. 进入 `Tools -> Plugins`。
5. 点击齿轮菜单，选择 `Install Add-on From File...`。
6. 选择刚下载的 `.xpi` 文件并重启 Zotero。

### 从插件市场安装

如果 Add-on Market for Zotero 已经收录本插件，也可以在插件市场中搜索 `MinerU HTML Parser` 并安装。

## 配置

安装后进入 Zotero 设置里的 `MinerU HTML Parser` 面板：

- `解析密钥`：填写 MinerU 精准解析 API Token。
- `解析模型`：
  - `vlm`：推荐，高精度视觉语言模型，适合复杂版面、图表、多栏 PDF。
  - `pipeline`：通用管线模型，适合常规 PDF。
  - `MinerU-HTML`：用于 HTML 输入场景，普通 PDF 解析通常不需要。
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
