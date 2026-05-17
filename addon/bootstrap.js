var Services = globalThis.Services || ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;
var Cc = Components.classes;
var Ci = Components.interfaces;

var MinerUHTML;

function log(message) {
  Zotero.debug("MinerU HTML Parser: " + message);
}

function install() {
  log("Installed");
}

async function startup({ id, version, rootURI }) {
  MinerUHTML = {
    id,
    version,
    rootURI,
    menuIDs: [],

    PREF_BRANCH: "extensions.mineru-html.",
    LOGIN_ORIGIN: "chrome://mineru-html",
    LOGIN_REALM: "MinerU API Token",
    LOGIN_USERNAME: "mineru-api-token",
    API_BASE: "https://mineru.net/api/v4",
    MAX_FILE_SIZE: 200 * 1024 * 1024,
    MAX_PAGES: 200,
    FIXED_PREFS: {
      pollIntervalSeconds: 5,
      maxPollSeconds: 200,
      enableFormula: true,
      enableTable: true,
      isOCR: false,
      postprocessHTML: true,
      justifyText: true,
      cleanupSimpleLatex: true,
      suppressFigureOCRText: true
    },
    I18N: {
      zh: {
        introFeatureTitle: "功能说明",
        introFeatureText: "将 Zotero 中的 PDF 提交给 MinerU 精准解析，生成更适合阅读的 HTML 附件，并自动清理常见 OCR 噪声。",
        introStepsTitle: "使用步骤",
        introStepsText: "填写解析密钥并选择语言后保存；在条目或 PDF 附件上右键选择“用 MinerU 解析为 HTML”。",
        tokenLabel: "解析密钥",
        tokenHelp: "解析密钥是 MinerU 精准解析 API 的 Token，用于提交 PDF 解析任务。没有密钥时可点击下方“免费申请密钥”到 MinerU 官网申请，申请和基础额度免费。基础额度完全足够科研论文阅读的使用。",
        languageLabel: "语言",
        languageHelp: "根据 PDF 中文字语言类型来选择。中文文档选择中文，纯英文文档选择 English。",
        languageZh: "中文 (zh)",
        languageEn: "English (en)",
        save: "保存设置",
        testConnection: "测试 MinerU 连接",
        testConfig: "测试当前配置",
        applyToken: "免费申请密钥",
        ready: "就绪",
        tokenLoadFailed: "就绪。Token 读取失败，可重新保存。",
        saving: "正在保存...",
        savedWithToken: "设置已保存，Token 已保存。需要验证请点击“测试 MinerU 连接”。",
        savedNoToken: "设置已保存，但未填写 MinerU API Token。",
        saveFailed: "保存失败：{message}",
        unknownLanguage: "未知语言：{language}",
        configAvailable: "当前配置可用：{language}，HTML 输出与清理规则已启用。",
        configInvalid: "配置异常：{message}",
        testingConnection: "正在测试 MinerU 连接...",
        tokenRequired: "请先填写或保存 MinerU API Token。",
        connectionOK: "连接正常。batch_id: {batchID}",
        connectionFailed: "连接测试失败：{message}",
        mineruMissingUpload: "MinerU 未返回上传地址或 batch_id。",
        openedTokenPage: "已打开 MinerU 官网，可免费申请解析密钥。",
        openTokenPageFailed: "打开申请页面失败：{url}"
      },
      en: {
        introFeatureTitle: "What This Plugin Does",
        introFeatureText: "Submits Zotero PDFs to the MinerU precise parsing API, creates a cleaner HTML attachment for reading, and removes common OCR noise.",
        introStepsTitle: "How To Use",
        introStepsText: "Enter your parsing key, choose the document language, then save. Right-click an item or PDF attachment and choose “Parse with MinerU to HTML”.",
        tokenLabel: "Parsing Key",
        tokenHelp: "The parsing key is your MinerU precise parsing API token. It is used to submit PDF parsing jobs. If you do not have one, click “Apply for Free Key” below to request it on the MinerU website. Applying is free, and the basic quota is free. The basic quota is fully enough for reading research papers.",
        languageLabel: "Language",
        languageHelp: "Choose according to the text language in the PDF. Use Chinese for Chinese documents and English for English-only documents.",
        languageZh: "Chinese (zh)",
        languageEn: "English (en)",
        save: "Save Settings",
        testConnection: "Test MinerU Connection",
        testConfig: "Test Current Config",
        applyToken: "Apply for Free Key",
        ready: "Ready",
        tokenLoadFailed: "Ready. Existing token could not be read, but you can save a new one.",
        saving: "Saving...",
        savedWithToken: "Settings saved. Token saved. Click “Test MinerU Connection” to verify it.",
        savedNoToken: "Settings saved, but no MinerU API token was entered.",
        saveFailed: "Save failed: {message}",
        unknownLanguage: "Unknown language: {language}",
        configAvailable: "Current config is valid: {language}. HTML output and cleanup rules are enabled.",
        configInvalid: "Config error: {message}",
        testingConnection: "Testing MinerU connection...",
        tokenRequired: "Please enter or save a MinerU API token first.",
        connectionOK: "Connection OK. batch_id: {batchID}",
        connectionFailed: "Connection test failed: {message}",
        mineruMissingUpload: "MinerU did not return an upload URL or batch_id.",
        openedTokenPage: "Opened the MinerU website. You can apply for a free parsing key there.",
        openTokenPageFailed: "Failed to open application page: {url}"
      }
    },

    async init() {
      this.writeFixedPrefs();
      this.loadKaTeX();

      let prefPaneCandidates = [
        {
          pluginID: this.id,
          src: this.rootURI + "preferences.xhtml",
          scripts: [this.rootURI + "preferences.js"],
          stylesheets: [this.rootURI + "preferences.css"],
          label: "MinerU HTML Parser",
          image: this.rootURI + "icon48.png"
        },
        {
          pluginID: this.id,
          src: "preferences.xhtml",
          scripts: [this.rootURI + "preferences.js"],
          stylesheets: [this.rootURI + "preferences.css"],
          label: "MinerU HTML Parser",
          image: "icon48.png"
        },
        {
          pluginID: this.id,
          src: "preferences.xhtml",
          label: "MinerU HTML Parser",
          image: "icon48.png"
        }
      ];

      for (let options of prefPaneCandidates) {
        try {
          Zotero.PreferencePanes.register(options);
          break;
        }
        catch (error) {
          log(`Preference pane registration attempt failed: ${error}`);
        }
      }

      this.addToAllWindows();
      this.registerMenus();
      log(`Started ${this.version}`);
    },

    loadKaTeX() {
      if (globalThis.MinerUHTMLKaTeX?.renderToString) {
        return true;
      }
      try {
        Services.scriptloader.loadSubScript(this.rootURI + "vendor/mineru-katex.js", globalThis, "UTF-8");
        return !!globalThis.MinerUHTMLKaTeX?.renderToString;
      }
      catch (error) {
        log(`KaTeX loader failed; falling back to simple formula cleanup. ${error?.stack || error}`);
        return false;
      }
    },

    writeFixedPrefs() {
      for (let [key, value] of Object.entries(this.FIXED_PREFS)) {
        Zotero.Prefs.set(this.PREF_BRANCH + key, value);
      }
    },

    onPrefsLoad({ window }) {
      let win = window || Services.wm.getMostRecentWindow("zotero:pref");
      this.writeFixedPrefs();
      this.localizePrefsPane(win);
      this.loadPrefsPaneValues(win);
      this.bindPrefsButton(win, "mineru-html-save", () => this.savePrefsPane(win));
      this.bindPrefsButton(win, "mineru-html-test-connection", () => this.testPrefsPaneConnection(win));
      this.bindPrefsButton(win, "mineru-html-test-config", () => this.testPrefsPaneConfig(win));
      this.bindPrefsButton(win, "mineru-html-apply-token", () => this.openTokenApplicationPage(win));
      this.setPrefsStatus(win, this.t("ready"));
    },

    loadPrefsPaneValues(win) {
      this.setPrefsValue(win, "mineru-html-language", this.pref("language", "ch"));
      this.loadTokenForPrefsPane(win).catch(error => {
        log(`Preference pane token load failed: ${error?.stack || error}`);
        this.setPrefsValue(win, "mineru-html-token", this.pref("apiTokenFallback", ""));
        this.setPrefsStatus(win, this.t("tokenLoadFailed"));
      });
    },

    async loadTokenForPrefsPane(win) {
      let login = this.findTokenLoginSafe();
      this.setPrefsValue(win, "mineru-html-token", login ? login.password : this.pref("apiTokenFallback", ""));
    },

    async savePrefsPane(win) {
      try {
        this.setPrefsStatus(win, this.t("saving"));
        Zotero.Prefs.set(this.PREF_BRANCH + "language", this.getPrefsValue(win, "mineru-html-language") || "ch");
        this.writeFixedPrefs();

        let token = this.getPrefsValue(win, "mineru-html-token").trim();
        await this.saveToken(token);
        this.setPrefsStatus(win, token ? this.t("savedWithToken") : this.t("savedNoToken"));
      }
      catch (error) {
        log(`Preference pane save failed: ${error?.stack || error}`);
        this.setPrefsStatus(win, this.t("saveFailed", { message: error?.message || error }));
      }
    },

    async testPrefsPaneConfig(win) {
      try {
        let language = this.getPrefsValue(win, "mineru-html-language") || "ch";
        if (!["ch", "en"].includes(language)) {
          throw new Error(this.t("unknownLanguage", { language }));
        }
        this.writeFixedPrefs();
        this.setPrefsStatus(win, this.t("configAvailable", { language: this.displayLanguage(language) }));
      }
      catch (error) {
        log(`Preference pane config test failed: ${error?.stack || error}`);
        this.setPrefsStatus(win, this.t("configInvalid", { message: error?.message || error }));
      }
    },

    async testPrefsPaneConnection(win) {
      try {
        this.setPrefsStatus(win, this.t("testingConnection"));
        Zotero.Prefs.set(this.PREF_BRANCH + "language", this.getPrefsValue(win, "mineru-html-language") || "ch");
        this.writeFixedPrefs();

        let token = this.getPrefsValue(win, "mineru-html-token").trim() || await this.getToken();
        if (!token) {
          throw new Error(this.t("tokenRequired"));
        }
        let result = await this.testMinerUConnection(token);
        this.setPrefsStatus(win, this.t("connectionOK", { batchID: result.batchID }));
      }
      catch (error) {
        log(`Preference pane MinerU connection test failed: ${error?.stack || error}`);
        this.setPrefsStatus(win, this.t("connectionFailed", { message: error?.message || error }));
      }
    },

    async testMinerUConnection(token) {
      let body = {
        files: [
          {
            name: "mineru-html-connection-test.pdf",
            is_ocr: false
          }
        ],
        language: this.pref("language", "ch"),
        enable_formula: true,
        enable_table: true,
        enable_page_ocr: false,
        layout_model: "doclayout_yolo"
      };
      let json = await this.fetchJSON(`${this.API_BASE}/file-urls/batch`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "*/*"
        },
        body: JSON.stringify(body)
      });

      let uploadURL = json?.data?.file_urls?.[0];
      let batchID = json?.data?.batch_id;
      if (!uploadURL || !batchID) {
        throw new Error(this.t("mineruMissingUpload"));
      }
      return { batchID, uploadURL };
    },

    openTokenApplicationPage(win) {
      let url = "https://mineru.net/apiManage/token";
      try {
        if (Zotero.launchURL) {
          Zotero.launchURL(url);
        }
        else {
          win?.open?.(url, "_blank");
        }
        this.setPrefsStatus(win, this.t("openedTokenPage"));
      }
      catch (error) {
        log(`Failed to open MinerU token page: ${error?.stack || error}`);
        this.setPrefsStatus(win, this.t("openTokenPageFailed", { url }));
      }
    },

    localizePrefsPane(win) {
      this.setPrefsText(win, "mineru-html-intro-feature-title", this.t("introFeatureTitle"));
      this.setPrefsText(win, "mineru-html-intro-feature-text", this.t("introFeatureText"));
      this.setPrefsText(win, "mineru-html-intro-steps-title", this.t("introStepsTitle"));
      this.setPrefsText(win, "mineru-html-intro-steps-text", this.t("introStepsText"));
      this.setPrefsAttribute(win, "mineru-html-token-label", "value", this.t("tokenLabel"));
      this.setPrefsAttribute(win, "mineru-html-token-help", "tooltiptext", this.t("tokenHelp"));
      this.setPrefsAttribute(win, "mineru-html-language-label", "value", this.t("languageLabel"));
      this.setPrefsAttribute(win, "mineru-html-language-help", "tooltiptext", this.t("languageHelp"));
      this.setPrefsAttribute(win, "mineru-html-language-zh", "label", this.t("languageZh"));
      this.setPrefsAttribute(win, "mineru-html-language-en", "label", this.t("languageEn"));
      this.setPrefsAttribute(win, "mineru-html-save", "label", this.t("save"));
      this.setPrefsAttribute(win, "mineru-html-test-connection", "label", this.t("testConnection"));
      this.setPrefsAttribute(win, "mineru-html-test-config", "label", this.t("testConfig"));
      this.setPrefsAttribute(win, "mineru-html-apply-token", "label", this.t("applyToken"));
    },

    bindPrefsButton(win, id, handler) {
      let button = win?.document?.getElementById(id);
      if (!button || button._mineruHTMLBound) {
        return;
      }
      button._mineruHTMLBound = true;
      button.addEventListener("command", event => {
        event.preventDefault?.();
        handler();
      });
    },

    setPrefsText(win, id, value) {
      let element = win?.document?.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    },

    setPrefsAttribute(win, id, attribute, value) {
      let element = win?.document?.getElementById(id);
      if (element) {
        element.setAttribute(attribute, value);
      }
    },

    getPrefsValue(win, id) {
      let element = win?.document?.getElementById(id);
      return element ? String(element.value || "") : "";
    },

    setPrefsValue(win, id, value) {
      let element = win?.document?.getElementById(id);
      if (element) {
        element.value = value;
      }
    },

    setPrefsStatus(win, message) {
      let status = win?.document?.getElementById("mineru-html-status");
      if (status) {
        status.textContent = "";
        status.setAttribute("value", message);
      }
    },

    displayLanguage(language) {
      return language === "ch" ? "zh" : language;
    },

    t(key, vars = {}) {
      let table = this.I18N[this.uiLanguage()] || this.I18N.en;
      let text = table[key] || this.I18N.en[key] || key;
      return String(text).replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => {
        return vars[name] === undefined ? match : vars[name];
      });
    },

    uiLanguage() {
      let locale = this.currentLocale().toLowerCase();
      return locale.startsWith("zh") ? "zh" : "en";
    },

    currentLocale() {
      return String(
        Zotero.locale
        || Services.locale?.appLocaleAsBCP47
        || Services.locale?.requestedLocale
        || Services.locale?.availableLocales?.[0]
        || "en-US"
      );
    },

    addToAllWindows() {
      for (let win of Zotero.getMainWindows()) {
        this.addToWindow(win);
      }
    },

    addToWindow(win) {
      win.MozXULElement?.insertFTLIfNeeded?.("mineru-html.ftl");
    },

    removeFromAllWindows() {
      for (let win of Zotero.getMainWindows()) {
        this.removeFromWindow(win);
      }
    },

    removeFromWindow(win) {
      win.document.querySelector('[href="mineru-html.ftl"]')?.remove();
    },

    registerMenus() {
      if (!Zotero.MenuManager?.registerMenu) {
        log("Zotero.MenuManager.registerMenu is unavailable; context menu was not registered");
        return;
      }

      let menuID = Zotero.MenuManager.registerMenu({
        menuID: "mineru-html-parse",
        pluginID: this.id,
        target: "main/library/item",
        menus: [
          {
            menuType: "menuitem",
            l10nID: "mineru-html-menu-parse",
            icon: this.rootURI + "icon16.png",
            image: this.rootURI + "icon16.png",
            onShowing: (event, context) => {
              let target = this.resolvePDFTargetSync(context);
              context.setVisible(!!target);
              context.setEnabled(!!target);
            },
            onCommand: async (event, context) => {
              await this.runFromContext(context);
            }
          }
        ]
      });
      this.menuIDs.push(menuID);
    },

    shutdown() {
      for (let menuID of this.menuIDs) {
        try {
          Zotero.MenuManager?.unregisterMenu?.(menuID);
        }
        catch (error) {
          log(`Failed to unregister menu ${menuID}: ${error}`);
        }
      }
      this.menuIDs = [];
      this.removeFromAllWindows();
      log("Stopped");
    },

    async runFromContext(context) {
      let progress = null;
      try {
        let target = await this.resolvePDFTarget(context);
        if (!target) {
          this.alert("Please select a single PDF attachment, or one Zotero item with a single PDF attachment.");
          return;
        }

        let token = await this.getToken();
        if (!token) {
          this.alert("Please open Zotero Settings -> MinerU HTML Parser and save your MinerU API token first.");
          return;
        }

        let filePath = await target.pdfItem.getFilePathAsync();
        if (!filePath) {
          this.alert("The selected PDF attachment does not have a local file path.");
          return;
        }

        await this.validatePDF(filePath);
        progress = this.createProgress(`MinerU 正在解析：${this.basename(filePath)}`);
        progress?.step("准备提交 PDF...", 5);
        let parseResult = await this.parsePDFToHTML({ filePath, token, pdfItem: target.pdfItem, progress });
        let htmlPath = parseResult.htmlPath || parseResult;
        progress?.step("正在导入 HTML 附件...", 92);
        let htmlAttachment = await this.attachHTML({ htmlPath, pdfItem: target.pdfItem, parentItem: target.parentItem });
        if (parseResult.reportPath) {
          progress?.step("Importing MinerU postprocess report...", 96);
          await this.attachPostprocessReport({ reportPath: parseResult.reportPath, pdfItem: target.pdfItem, parentItem: target.parentItem });
        }
        progress?.step("Opening generated HTML...", 98);
        let opened = await this.openAttachmentInZotero(htmlAttachment);
        progress?.success(opened
          ? "解析完成，HTML 已附加到当前条目并打开。"
          : "解析完成，HTML 已附加到当前条目。");
        if (!progress) {
          this.alert(opened
            ? "MinerU parsing finished. The generated HTML was attached to the Zotero item and opened."
            : "MinerU parsing finished. The generated HTML and postprocess report were attached to the Zotero item.");
        }
      }
      catch (error) {
        log(error?.stack || error);
        progress?.error(this.formatError(error));
        this.alert(this.formatError(error));
      }
    },

    async parsePDFToHTML({ filePath, token, pdfItem, progress }) {
      let fileName = this.basename(filePath);
      let dataID = this.uuid();
      log(`Requesting MinerU upload URL for ${fileName}`);
      progress?.step("正在请求 MinerU 上传地址...", 10);
      let { batchID, uploadURL } = await this.requestUploadURL({ token, fileName });

      log(`Uploading ${fileName} to MinerU batch ${batchID}`);
      progress?.step("正在上传 PDF 到 MinerU...", 20);
      await this.uploadFile(uploadURL, filePath);

      log(`Polling MinerU batch ${batchID}`);
      progress?.step("上传完成，等待 MinerU 开始解析...", 35);
      let result = await this.pollResult({ token, batchID, dataID, fileName, progress });
      if (!result.full_zip_url) {
        throw new Error("MinerU finished parsing, but did not return full_zip_url.");
      }

      let tempDir = await this.ensureTempDir();
      let safeName = this.safeFileName(fileName.replace(/\.pdf$/i, ""));
      let zipPath = PathUtils.join(tempDir, `${safeName}.${dataID}.zip`);
      let htmlPath = PathUtils.join(tempDir, `${safeName}.mineru.html`);
      let reportPath = PathUtils.join(tempDir, `${safeName}.mineru-postprocess.txt`);

      log(`Downloading MinerU result zip for attachment ${pdfItem.id}`);
      progress?.step("解析完成，正在下载结果 ZIP...", 78);
      await this.downloadFile(result.full_zip_url, zipPath);
      progress?.step("Preparing HTML output...", 84);
      let sourceInfo;
      try {
        progress?.step("Building HTML from MinerU Markdown...", 84);
        sourceInfo = await this.extractMarkdownHTMLFromZip(zipPath, htmlPath, {
          title: fileName.replace(/\.pdf$/i, ""),
          sourceFileName: fileName
        });
      }
      catch (error) {
        log(`Markdown-first HTML generation failed; falling back to MinerU HTML. ${error?.stack || error}`);
        try {
          await this.extractHTMLFromZip(zipPath, htmlPath);
        }
        catch (fallbackError) {
          throw new Error(`Markdown HTML generation failed: ${error?.message || error}. HTML fallback also failed: ${fallbackError?.message || fallbackError}`);
        }
        sourceInfo = {
          sourceMode: "html-fallback",
          markdownImages: 0,
          imageGroups: 0,
          markdownBlocks: 0,
          fallbackReason: error?.message || String(error)
        };
      }
      progress?.step("正在优化 HTML 显示样式...", 88);
      let report = await this.postprocessHTML(htmlPath, {
        reportPath,
        sourceFileName: fileName,
        dataID,
        ...sourceInfo
      });
      return { htmlPath, reportPath: report?.reportPath || null };
    },

    async requestUploadURL({ token, fileName }) {
      let isOCR = Boolean(this.pref("isOCR", false));
      let mineruFileName = this.normalizeMinerUFileName(fileName);
      let body = {
        files: [
          {
            name: mineruFileName,
            is_ocr: isOCR
          }
        ],
        language: this.pref("language", "ch"),
        enable_formula: this.pref("enableFormula", true),
        enable_table: this.pref("enableTable", true),
        enable_page_ocr: isOCR,
        layout_model: "doclayout_yolo"
      };
      let json = await this.fetchJSON(`${this.API_BASE}/file-urls/batch`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "*/*"
        },
        body: JSON.stringify(body)
      });

      let uploadURL = json?.data?.file_urls?.[0];
      let batchID = json?.data?.batch_id;
      if (!uploadURL || !batchID) {
        throw new Error("MinerU did not return an upload URL and batch_id.");
      }
      return { batchID, uploadURL };
    },

    async uploadFile(uploadURL, filePath) {
      let bytes = await IOUtils.read(filePath);
      let response = await this.fetchWithTimeout(uploadURL, {
        method: "PUT",
        body: bytes
      });
      if (!response.ok) {
        throw new Error(`MinerU file upload failed with HTTP ${response.status}.`);
      }
    },

    async pollResult({ token, batchID, dataID, fileName, progress }) {
      let intervalSeconds = this.pref("pollIntervalSeconds", 5);
      let maxPollSeconds = this.pref("maxPollSeconds", 200);
      let deadline = Date.now() + maxPollSeconds * 1000;
      let started = Date.now();
      let updatePollingProgress = state => {
        let elapsedSeconds = Math.floor((Date.now() - started) / 1000);
        let percent = Math.min(75, 35 + Math.floor((elapsedSeconds / maxPollSeconds) * 40));
        progress?.update(`MinerU 状态：${this.translateMinerUState(state)}，已等待 ${elapsedSeconds}/${maxPollSeconds} 秒`, percent);
      };

      while (Date.now() < deadline) {
        let json = await this.fetchJSON(`${this.API_BASE}/extract-results/batch/${encodeURIComponent(batchID)}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "*/*"
          }
        });

        let results = json?.data?.extract_result;
        if (!Array.isArray(results)) {
          throw new Error("MinerU returned an unexpected extract_result payload.");
        }

        let result = results.find(item => item.data_id === dataID)
          || results.find(item => item.file_name === fileName)
          || results[0];
        let state = result?.state;

        if (state === "done") {
          return result;
        }
        if (state === "failed") {
          throw new Error(result.err_msg || "MinerU parsing failed.");
        }
        if (!["waiting-file", "pending", "running", "converting"].includes(state)) {
          throw new Error(`MinerU returned unknown task state: ${state || "empty"}.`);
        }

        updatePollingProgress(state);
        let nextPollAt = Math.min(Date.now() + intervalSeconds * 1000, deadline);
        while (Date.now() < nextPollAt) {
          await Zotero.Promise.delay(Math.min(1000, nextPollAt - Date.now()));
          updatePollingProgress(state);
        }
      }

      throw new Error(`MinerU parsing did not finish within ${maxPollSeconds} seconds.`);
    },

    async downloadFile(url, targetPath) {
      let response = await this.fetchWithTimeout(url, {
        method: "GET"
      });
      if (!response.ok) {
        throw new Error(`Failed to download MinerU result zip with HTTP ${response.status}.`);
      }
      let bytes = new Uint8Array(await response.arrayBuffer());
      await IOUtils.write(targetPath, bytes);
    },

    async extractHTMLFromZip(zipPath, htmlPath) {
      let zipFile = this.localFile(zipPath);
      let zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
      zipReader.open(zipFile);
      try {
        let htmlEntries = [];
        let entries = zipReader.findEntries("*");
        while (entries.hasMore()) {
          let entry = entries.getNext();
          if (/\.html?$/i.test(entry)) {
            htmlEntries.push(entry);
          }
        }
        if (!htmlEntries.length) {
          throw new Error("MinerU result zip did not contain an HTML file.");
        }

        let selected = this.selectHTMLEntry(htmlEntries);
        await IOUtils.remove(htmlPath, { ignoreAbsent: true });
        zipReader.extract(selected, this.localFile(htmlPath));
      }
      finally {
        zipReader.close();
      }
    },

    selectHTMLEntry(entries) {
      let priorities = ["main.html", "full.html"];
      for (let priority of priorities) {
        let match = entries.find(entry => this.basename(entry).toLowerCase() === priority);
        if (match) {
          return match;
        }
      }
      return entries[0];
    },

    async extractMarkdownHTMLFromZip(zipPath, htmlPath, options = {}) {
      let zipFile = this.localFile(zipPath);
      let zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
      zipReader.open(zipFile);
      try {
        let markdownEntry = this.findZipEntry(zipReader, /(^|\/)full\.md$/i);
        if (!markdownEntry) {
          throw new Error("MinerU result zip did not contain full.md.");
        }
        let markdown = await this.readZipTextEntry(zipReader, markdownEntry);
        if (!markdown || !markdown.trim()) {
          throw new Error("MinerU full.md was empty.");
        }
        let markdownImageMap = await this.buildMarkdownImageMap(zipReader, markdown);
        let rendered = this.renderMarkdownDocument(markdown, {
          title: options.title || options.sourceFileName || "MinerU HTML",
          imageMap: markdownImageMap
        });
        await IOUtils.write(htmlPath, new TextEncoder().encode(rendered.html));
        return {
          sourceMode: "markdown",
          markdownImages: rendered.markdownImages,
          imageGroups: rendered.imageGroups,
          markdownBlocks: rendered.markdownBlocks
        };
      }
      finally {
        zipReader.close();
      }
    },

    findZipEntry(zipReader, pattern) {
      let entries = zipReader.findEntries("*");
      while (entries.hasMore()) {
        let entry = entries.getNext();
        if (typeof entry === "string" && pattern.test(entry.replace(/\\/g, "/"))) {
          return entry;
        }
      }
      return "";
    },

    async readZipTextEntry(zipReader, entry) {
      let stream = zipReader.getInputStream(entry);
      return await Zotero.File.getContentsAsync(stream, "utf-8");
    },

    async buildMarkdownImageMap(zipReader, markdown) {
      let imageMap = {};
      let seen = new Set();
      let pattern = /!\[[^\]]*\]\(([^)\n]+)\)/g;
      let match;
      while ((match = pattern.exec(markdown))) {
        let ref = this.parseMarkdownImageDestination(match[1]);
        if (!ref || /^(?:https?:|data:|file:)/i.test(ref) || seen.has(ref)) {
          continue;
        }
        seen.add(ref);
        let imageData = await this.readZipImageData(zipReader, ref);
        let dataURL = imageData?.dataURL || "";
        if (dataURL) {
          imageMap[ref] = dataURL;
        }
      }
      return imageMap;
    },

    async extractZipImageDataURL(zipReader, entry) {
      return (await this.readZipImageData(zipReader, entry))?.dataURL || "";
    },

    async readZipImageData(zipReader, entry) {
      let resolvedEntry = this.resolveZipEntry(zipReader, entry);
      if (!resolvedEntry) {
        return null;
      }
      let stream = zipReader.getInputStream(resolvedEntry);
      let binaryStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
      binaryStream.setInputStream(stream);
      let chunks = [];
      let byteLength = 0;
      try {
        while (binaryStream.available() > 0) {
          let chunk = binaryStream.readByteArray(binaryStream.available());
          chunks.push(chunk);
          byteLength += chunk.length;
        }
      }
      finally {
        binaryStream.close();
        stream.close();
      }
      if (!byteLength) {
        return null;
      }
      let ext = (resolvedEntry.split(".").pop() || "png").toLowerCase();
      let mime = ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : "image/png";
      return {
        resolvedEntry,
        dataURL: `data:${mime};base64,${this.byteChunksToBase64(chunks, byteLength)}`
      };
    },

    byteChunksToBase64(chunks, byteLength) {
      let bytes = new Uint8Array(byteLength);
      let offset = 0;
      for (let chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let parts = [];
      let chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        let end = Math.min(index + chunkSize, bytes.length);
        let binary = "";
        for (let byteIndex = index; byteIndex < end; byteIndex++) {
          binary += String.fromCharCode(bytes[byteIndex]);
        }
        parts.push(binary);
      }
      return btoa(parts.join(""));
    },

    resolveZipEntry(zipReader, entry) {
      let candidates = [this.normalizeZipPath(entry)];
      try {
        let decoded = decodeURIComponent(candidates[0]);
        if (decoded !== candidates[0]) {
          candidates.push(decoded);
        }
      }
      catch (_) {
      }
      let entries = zipReader.findEntries("*");
      while (entries.hasMore()) {
        let current = entries.getNext();
        if (typeof current !== "string") {
          continue;
        }
        let normalizedCurrent = current.replace(/\\/g, "/");
        if (candidates.some(candidate => normalizedCurrent === candidate || normalizedCurrent.endsWith(`/${candidate}`))) {
          return current;
        }
      }
      return "";
    },

    normalizeZipPath(value) {
      return String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "");
    },

    renderMarkdownDocument(markdown, options = {}) {
      let blocks = this.splitMarkdownBlocks(markdown);
      let sections = [];
      let markdownImages = 0;
      let imageGroups = 0;
      for (let index = 0; index < blocks.length; index++) {
        let images = this.extractMarkdownImagesFromBlock(blocks[index]);
        if (images.length) {
          markdownImages += images.length;
          sections.push(this.renderMarkdownImageFigure(images, options.imageMap || {}));
          continue;
        }
        let html = this.renderMarkdownBlock(blocks[index], options.imageMap || {});
        if (html) {
          sections.push(html);
        }
      }
      return {
        html: this.wrapRenderedMarkdownHTML(options.title || "MinerU HTML", sections.join("\n")),
        markdownImages,
        imageGroups,
        markdownBlocks: blocks.length
      };
    },

    splitMarkdownBlocks(markdown) {
      let lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
      let blocks = [];
      let index = 0;
      let pushBlock = buffer => {
        let block = buffer.join("\n").trim();
        if (block) {
          blocks.push(block);
        }
      };
      while (index < lines.length) {
        let line = lines[index];
        let trimmed = line.trim();
        if (!trimmed) {
          index++;
          continue;
        }
        if (trimmed.startsWith("```")) {
          let buffer = [line];
          index++;
          while (index < lines.length) {
            buffer.push(lines[index]);
            if (lines[index].trim().startsWith("```")) {
              index++;
              break;
            }
            index++;
          }
          pushBlock(buffer);
          continue;
        }
        if (trimmed === "$$") {
          let buffer = [line];
          index++;
          while (index < lines.length) {
            buffer.push(lines[index]);
            if (lines[index].trim() === "$$") {
              index++;
              break;
            }
            index++;
          }
          pushBlock(buffer);
          continue;
        }
        if (/^<table\b/i.test(trimmed)) {
          let buffer = [line];
          index++;
          while (index < lines.length && !/<\/table>/i.test(buffer[buffer.length - 1])) {
            buffer.push(lines[index]);
            index++;
          }
          pushBlock(buffer);
          continue;
        }
        if (this.isMarkdownImageLine(trimmed) || this.isMarkdownImageListLine(trimmed)) {
          let buffer = [line];
          index++;
          while (index < lines.length) {
            let nextTrimmed = lines[index].trim();
            if (!nextTrimmed || (!this.isMarkdownImageLine(nextTrimmed) && !this.isMarkdownImageListLine(nextTrimmed))) {
              break;
            }
            buffer.push(lines[index]);
            index++;
          }
          pushBlock(buffer);
          continue;
        }
        if (/^\s*#{1,6}\s+/.test(trimmed) || this.isMarkdownTableRow(trimmed)) {
          let buffer = [line];
          index++;
          if (this.isMarkdownTableRow(trimmed)) {
            while (index < lines.length && this.isMarkdownTableRow(lines[index].trim())) {
              buffer.push(lines[index]);
              index++;
            }
          }
          pushBlock(buffer);
          continue;
        }
        let buffer = [line];
        index++;
        while (index < lines.length) {
          let nextTrimmed = lines[index].trim();
          if (
            !nextTrimmed
            || nextTrimmed.startsWith("```")
            || nextTrimmed === "$$"
            || /^<table\b/i.test(nextTrimmed)
            || this.isMarkdownImageLine(nextTrimmed)
            || this.isMarkdownImageListLine(nextTrimmed)
            || /^\s*#{1,6}\s+/.test(nextTrimmed)
            || this.isMarkdownTableRow(nextTrimmed)
          ) {
            break;
          }
          buffer.push(lines[index]);
          index++;
        }
        pushBlock(buffer);
      }
      return blocks;
    },

    renderMarkdownBlock(block) {
      let trimmed = String(block || "").trim();
      if (!trimmed) {
        return "";
      }
      if (/^<table\b/i.test(trimmed)) {
        return trimmed;
      }
      if (/^```/.test(trimmed)) {
        let content = trimmed.replace(/^```[^\n]*\n?/, "").replace(/\n?```\s*$/, "");
        return `<pre><code>${this.escapeHTML(content)}</code></pre>`;
      }
      if (/^\$\$[\s\S]*\$\$$/.test(trimmed)) {
        return `<div class="mineru-formula-block">${this.renderFormulaHTML(trimmed, true)}</div>`;
      }
      let heading = trimmed.match(/^(#{1,6})\s+([\s\S]+)$/);
      if (heading) {
        let level = Math.max(1, Math.min(heading[1].length, 6));
        return `<h${level}>${this.renderMarkdownInline(heading[2].trim())}</h${level}>`;
      }
      if (this.isMarkdownTableBlock(trimmed)) {
        return this.renderMarkdownTable(trimmed);
      }
      if (this.isReferenceListBlock(trimmed)) {
        return this.renderReferenceListBlock(trimmed, entry => this.renderMarkdownInline(entry));
      }
      let listItems = this.extractTextListItems(trimmed);
      if (listItems.length) {
        return `<ul>\n${listItems.map(item => `<li>${this.renderMarkdownInline(item)}</li>`).join("\n")}\n</ul>`;
      }
      let paragraphs = trimmed.split(/\n{2,}/).map(part => part.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
      return paragraphs.map(part => `<p>${this.renderMarkdownInline(part)}</p>`).join("\n");
    },

    renderMarkdownImageFigure(images, imageMap) {
      let renderedImages = images
        .map(image => this.renderMarkdownImageElement(image, imageMap))
        .filter(Boolean);
      if (!renderedImages.length) {
        return "";
      }
      return renderedImages
        .map(image => `<figure class="mineru-image-block">${image}</figure>`)
        .join("\n");
    },

    renderMarkdownImageElement(image, imageMap) {
      if (image.html) {
        return this.rewriteImageHTMLSource(image.html, imageMap);
      }
      let originalSrc = image.src || "";
      let src = imageMap[originalSrc] || originalSrc;
      if (!src) {
        return "";
      }
      return `<img src="${this.escapeAttribute(src)}" alt="${this.escapeAttribute(image.alt || "")}" />`;
    },

    rewriteImageHTMLSource(imageHTML, imageMap) {
      return imageHTML.replace(/\bsrc\s*=\s*(["'])(.*?)\1/i, (match, quote, src) => {
        let rewritten = imageMap[src] || src;
        return `src=${quote}${this.escapeAttribute(rewritten)}${quote}`;
      });
    },

    extractMarkdownImagesFromBlock(block) {
      let images = [];
      let lines = String(block || "").split(/\n/).map(line => line.trim()).filter(Boolean);
      if (!lines.length) {
        return images;
      }
      for (let line of lines) {
        let image = this.parseMarkdownImageLine(line);
        if (!image) {
          return [];
        }
        images.push(image);
      }
      return images;
    },

    parseMarkdownImageLine(line) {
      let value = String(line || "").trim().replace(/^(?:[-*+]|\d+[.)])\s+/, "").trim();
      let markdownImage = value.match(/^!\[([^\]]*)\]\(([^)\n]+)\)$/);
      if (markdownImage) {
        return {
          alt: markdownImage[1] || "",
          src: this.parseMarkdownImageDestination(markdownImage[2])
        };
      }
      if (/^<img\b[^>]*>$/i.test(value)) {
        return { html: value };
      }
      return null;
    },

    parseMarkdownImageDestination(value) {
      let trimmed = String(value || "").trim();
      if (trimmed.startsWith("<") && trimmed.includes(">")) {
        return trimmed.slice(1, trimmed.indexOf(">")).trim();
      }
      return trimmed.replace(/\s+["'][^"']*["']\s*$/, "").trim();
    },

    isMarkdownImageLine(line) {
      return !!this.parseMarkdownImageLine(line);
    },

    isMarkdownImageListLine(line) {
      return !!this.parseMarkdownImageLine(String(line || "").trim());
    },

    isMarkdownTableRow(line) {
      return /^\|.*\|\s*$/.test(line) || /^[-:| ]+$/.test(line);
    },

    isMarkdownTableBlock(block) {
      let lines = String(block || "").split(/\n/).map(line => line.trim()).filter(Boolean);
      return lines.length >= 2 && lines.every(line => this.isMarkdownTableRow(line));
    },

    renderMarkdownTable(block) {
      let rows = String(block || "").split(/\n/).map(line => line.trim()).filter(Boolean);
      let cells = rows.map(row => row.replace(/^\||\|$/g, "").split("|").map(cell => cell.trim()));
      if (cells.length >= 2 && /^[-:| ]+$/.test(rows[1])) {
        cells.splice(1, 1);
      }
      if (!cells.length) {
        return "";
      }
      let header = cells.shift();
      let html = ["<table>", "<thead><tr>"];
      html.push(...header.map(cell => `<th>${this.renderMarkdownInline(cell)}</th>`));
      html.push("</tr></thead>");
      if (cells.length) {
        html.push("<tbody>");
        for (let row of cells) {
          html.push("<tr>");
          html.push(...row.map(cell => `<td>${this.renderMarkdownInline(cell)}</td>`));
          html.push("</tr>");
        }
        html.push("</tbody>");
      }
      html.push("</table>");
      return html.join("\n");
    },

    isReferenceListBlock(block) {
      let value = String(block || "").trim();
      if (!/^\[\d{1,3}\]\s+/.test(value)) {
        return false;
      }
      return this.splitReferenceEntries(value).length >= 2;
    },

    splitReferenceEntries(text) {
      let value = String(text || "").replace(/\r\n/g, "\n").trim();
      if (!value) {
        return [];
      }

      let entries = [];
      let current = "";
      for (let line of value.split(/\n+/).map(part => part.trim()).filter(Boolean)) {
        if (/^\[\d{1,3}\]\s+/.test(line)) {
          if (current) {
            entries.push(current.trim());
          }
          current = line;
        }
        else if (current) {
          current += ` ${line}`;
        }
      }
      if (current) {
        entries.push(current.trim());
      }
      if (entries.length > 1) {
        return entries;
      }

      let compact = value.replace(/\s+/g, " ");
      return compact
        .split(/(?=\[\d{1,3}\]\s+)/g)
        .map(entry => entry.trim())
        .filter(entry => /^\[\d{1,3}\]\s+/.test(entry));
    },

    renderReferenceListBlock(text, renderEntry) {
      let entries = this.splitReferenceEntries(text);
      if (entries.length < 2) {
        return "";
      }
      return this.renderReferenceEntriesBlock(entries, renderEntry);
    },

    renderReferenceEntriesBlock(entries, renderEntry) {
      return `<div class="mineru-reference-list">\n${entries.map(entry => {
        return `<p class="mineru-reference">${renderEntry(entry)}</p>`;
      }).join("\n")}\n</div>`;
    },

    extractTextListItems(block) {
      let lines = String(block || "").split(/\n/).map(line => line.trim()).filter(Boolean);
      if (!lines.length || !lines.every(line => /^(?:[-*+]|\d+[.)])\s+/.test(line))) {
        return [];
      }
      let items = [];
      for (let line of lines) {
        let text = line.replace(/^(?:[-*+]|\d+[.)])\s+/, "").trim();
        if (this.parseMarkdownImageLine(text)) {
          return [];
        }
        items.push(text);
      }
      return items;
    },

    renderMarkdownInline(text) {
      let html = this.escapeHTML(String(text || ""));
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
        return `<a href="${this.escapeAttribute(this.parseMarkdownImageDestination(href))}">${label}</a>`;
      });
      return html;
    },

    wrapRenderedMarkdownHTML(title, bodyHTML) {
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escapeHTML(title)}</title>
</head>
<body>
  <main class="mineru-markdown-document">
    <h1>${this.escapeHTML(title)}</h1>
${bodyHTML}
  </main>
</body>
</html>`;
    },

    async postprocessHTML(htmlPath, options = {}) {
      if (!this.pref("postprocessHTML", true)) {
        return null;
      }

      let bytes = await IOUtils.read(htmlPath);
      let html = new TextDecoder().decode(bytes);
      let report = this.createPostprocessReport({
        htmlPath,
        sourceFileName: options.sourceFileName,
        dataID: options.dataID,
        originalHTML: html,
        sourceMode: options.sourceMode,
        markdownImages: options.markdownImages,
        imageGroups: options.imageGroups,
        markdownBlocks: options.markdownBlocks,
        fallbackReason: options.fallbackReason
      });
      let protectedDataURLs = this.protectDataURLAttributes(html);
      let updated = this.runPostprocessStep(report, "injectReadableStyles", protectedDataURLs.html, value => this.injectReadableStyles(value));
      updated = this.runPostprocessStep(report, "normalizeFrontMatterHeadings", updated, value => this.normalizeFrontMatterHeadings(value));
      updated = this.runPostprocessStep(report, "formatAuthorAffiliationBlock", updated, value => this.formatAuthorAffiliationBlock(value));
      if (this.pref("suppressFigureOCRText", true)) {
        updated = this.runPostprocessStep(report, "suppressFigureOCRText", updated, value => this.suppressFigureOCRText(value));
        updated = this.runPostprocessStep(report, "removeLooseFigureOCRFragments", updated, value => this.removeLooseFigureOCRFragments(value));
      }
      updated = this.runPostprocessStep(report, "centerSubfigureCaptions", updated, value => this.centerSubfigureCaptions(value));
      updated = this.runPostprocessStep(report, "normalizeSubfigureCaptionList", updated, value => this.normalizeSubfigureCaptionList(value));
      updated = this.runPostprocessStep(report, "normalizeLabelCaptionImageListItems", updated, value => this.normalizeLabelCaptionImageListItems(value));
      updated = this.runPostprocessStep(report, "removeCaptionAdjacentPipeNoise", updated, value => this.removeCaptionAdjacentPipeNoise(value));
      updated = this.runPostprocessStep(report, "normalizeCaptionLists", updated, value => this.normalizeCaptionLists(value));
      updated = this.runPostprocessStep(report, "splitLooseCaptionImageParagraphs", updated, value => this.splitLooseCaptionImageParagraphs(value));
      updated = this.runPostprocessStep(report, "splitCaptionParagraphImages", updated, value => this.splitCaptionParagraphImages(value));
      updated = this.runPostprocessStep(report, "splitImageCaptionParagraphs", updated, value => this.splitImageCaptionParagraphs(value));
      updated = this.runPostprocessStep(report, "closeCaptionParagraphsBeforeImages", updated, value => this.closeCaptionParagraphsBeforeImages(value));
      updated = this.runPostprocessStep(report, "wrapBareFigureCaptionLines", updated, value => this.wrapBareFigureCaptionLines(value));
      updated = this.runPostprocessStep(report, "demoteFigureReferenceParagraphs", updated, value => this.demoteFigureReferenceParagraphs(value));
      updated = this.runPostprocessStep(report, "markFigureAndTableCaptions", updated, value => this.markFigureAndTableCaptions(value));
      updated = this.runPostprocessStep(report, "demoteFigureReferenceParagraphsAfterCaptions", updated, value => this.demoteFigureReferenceParagraphs(value));
      if (this.pref("suppressFigureOCRText", true)) {
        updated = this.runPostprocessStep(report, "removeLooseFigureOCRFragmentsAfterCaptions", updated, value => this.removeLooseFigureOCRFragments(value));
      }
      updated = this.runPostprocessStep(report, "demoteNarrativeTableLeadIns", updated, value => this.demoteNarrativeTableLeadIns(value));
      updated = this.runPostprocessStep(report, "normalizeCaptionMathOCR", updated, value => this.normalizeCaptionMathOCR(value));
      updated = this.runPostprocessStep(report, "restoreSequentialNumberedListItems", updated, value => this.restoreSequentialNumberedListItems(value));
      if (this.pref("cleanupSimpleLatex", true)) {
        updated = this.runPostprocessStep(report, "cleanupSimpleLatex", updated, value => this.cleanupSimpleLatex(value));
        updated = this.runPostprocessStep(report, "normalizePlainTableMathNotation", updated, value => this.normalizePlainTableMathNotation(value));
      }
      updated = this.runPostprocessStep(report, "splitAffiliationParagraphs", updated, value => this.splitAffiliationParagraphs(value));
      updated = this.runPostprocessStep(report, "markWideTables", updated, value => this.markWideTables(value));
      updated = this.runPostprocessStep(report, "splitReferenceParagraphs", updated, value => this.splitReferenceParagraphs(value));
      updated = this.restoreDataURLAttributes(updated, protectedDataURLs.urls);

      if (updated !== html) {
        await IOUtils.write(htmlPath, new TextEncoder().encode(updated));
      }
      report.final = this.collectPostprocessSignals(updated);
      report.changed = updated !== html;
      if (options.reportPath) {
        await this.writePostprocessReport(options.reportPath, report);
        return { reportPath: options.reportPath, report };
      }
      return { reportPath: null, report };
    },

    protectDataURLAttributes(html) {
      let urls = [];
      let protectedHTML = String(html || "").replace(
        /\b(src\s*=\s*)(["'])(data:image\/[^"']+)\2/gi,
        (match, prefix, quote, url) => {
          let token = `MINERUHTMLDATAURLTOKEN${urls.length}`;
          urls.push(url);
          return `${prefix}${quote}${token}${quote}`;
        }
      );
      return { html: protectedHTML, urls };
    },

    restoreDataURLAttributes(html, urls) {
      return String(html || "").replace(/MINERUHTMLDATAURLTOKEN(\d+)/g, (match, indexText) => {
        let index = parseInt(indexText, 10);
        return urls[index] || match;
      });
    },

    createPostprocessReport({ htmlPath, sourceFileName, dataID, originalHTML, sourceMode, markdownImages, imageGroups, markdownBlocks, fallbackReason }) {
      let createdAt = new Date().toISOString();
      return {
        createdAt,
        parsedAt: createdAt,
        pluginVersion: this.version || "",
        sourceFileName: sourceFileName || "",
        dataID: dataID || "",
        htmlPath,
        sourceMode: sourceMode || "html-fallback",
        markdownImages: markdownImages || 0,
        imageGroups: imageGroups || 0,
        markdownBlocks: markdownBlocks || 0,
        fallbackReason: fallbackReason || "",
        initial: this.collectPostprocessSignals(originalHTML),
        final: null,
        changed: false,
        steps: []
      };
    },

    runPostprocessStep(report, name, input, transform) {
      let before = this.collectPostprocessSignals(input);
      let output = transform(input);
      let after = this.collectPostprocessSignals(output);
      report.steps.push({
        name,
        changed: output !== input,
        characterDelta: after.characters - before.characters,
        before,
        after
      });
      return output;
    },

    collectPostprocessSignals(html) {
      return {
        characters: html.length,
        images: this.countMatches(html, /<img\b/gi),
        imageGroups: this.countMatches(html, /\bmineru-image-group\b/gi),
        figureCaptionRefs: this.countMatches(html, /\bfig\.\s*\d+\./gi),
        tableCaptionRefs: this.countMatches(html, /\btable\s*\d+\b/gi),
        figureNumbers: this.extractFigureCaptionNumbers(html)
      };
    },

    countMatches(text, pattern) {
      return (text.match(pattern) || []).length;
    },

    extractFigureCaptionNumbers(html) {
      let numbers = [];
      let seen = new Set();
      let pattern = /\bfig\.\s*(\d+)(?:\s*[.:])?(?=\s|<|$)/gi;
      let match;
      while ((match = pattern.exec(html))) {
        let number = match[1];
        if (!seen.has(number)) {
          seen.add(number);
          numbers.push(number);
        }
      }
      return numbers;
    },

    async writePostprocessReport(reportPath, report) {
      let beforeNumbers = new Set(report.initial.figureNumbers);
      let afterNumbers = new Set(report.final.figureNumbers);
      let removedFigures = report.initial.figureNumbers.filter(number => !afterNumbers.has(number));
      let addedFigures = report.final.figureNumbers.filter(number => !beforeNumbers.has(number));
      let lines = [
        "MinerU HTML Parser postprocess report",
        `Plugin version: ${report.pluginVersion || "(unknown)"}`,
        `Parsed at: ${report.parsedAt || report.createdAt}`,
        `Report created at: ${report.createdAt}`,
        `Source PDF: ${report.sourceFileName}`,
        `Local tracking id: ${report.dataID}`,
        `HTML path: ${report.htmlPath}`,
        `Source mode: ${report.sourceMode}`,
        `Markdown blocks: ${report.markdownBlocks}`,
        `Markdown image refs: ${report.markdownImages}`,
        `Image groups created: ${report.imageGroups}`,
        `Fallback reason: ${report.fallbackReason || "(none)"}`,
        `HTML changed: ${report.changed ? "yes" : "no"}`,
        "",
        "Summary",
        `Characters: ${report.initial.characters} -> ${report.final.characters}`,
        `Images: ${report.initial.images} -> ${report.final.images}`,
        `Image groups: ${report.initial.imageGroups} -> ${report.final.imageGroups}`,
        `Figure caption refs: ${report.initial.figureCaptionRefs} -> ${report.final.figureCaptionRefs}`,
        `Table caption refs: ${report.initial.tableCaptionRefs} -> ${report.final.tableCaptionRefs}`,
        `Figure numbers before: ${report.initial.figureNumbers.join(", ") || "(none)"}`,
        `Figure numbers after: ${report.final.figureNumbers.join(", ") || "(none)"}`,
        `Figure numbers removed by postprocess: ${removedFigures.join(", ") || "(none)"}`,
        `Figure numbers added by postprocess: ${addedFigures.join(", ") || "(none)"}`,
        "",
        "Steps"
      ];
      for (let step of report.steps) {
        lines.push(
          `- ${step.name}: changed=${step.changed ? "yes" : "no"}, characterDelta=${step.characterDelta}, ` +
          `figRefs=${step.before.figureCaptionRefs}->${step.after.figureCaptionRefs}, ` +
          `tableRefs=${step.before.tableCaptionRefs}->${step.after.tableCaptionRefs}, ` +
          `images=${step.before.images}->${step.after.images}`
        );
      }
      await IOUtils.write(reportPath, new TextEncoder().encode(lines.join("\n") + "\n"));
    },

    injectReadableStyles(html) {
      let marker = "mineru-html-parser-readable";
      let paragraphAlignment = this.pref("justifyText", true)
        ? "text-align: justify !important;\n  text-justify: inter-word !important;"
        : "text-align: left !important;";

let style = `
<style id="${marker}">
html {
  background: #f2f2f2 !important;
}
body {
  box-sizing: border-box !important;
  width: min(210mm, calc(100vw - 32px)) !important;
  min-height: 297mm !important;
  padding: 18mm 18mm 22mm 18mm !important;
  margin: 16px auto !important;
  background: #fff !important;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 10px 30px rgba(0, 0, 0, 0.10) !important;
  font: 16px/1.8 "Times New Roman", "Noto Serif SC", serif !important;
  hyphens: none !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
*, *::before, *::after {
  box-sizing: inherit !important;
}
body, main, p, li, blockquote, table, th, td, h1, h2, h3, h4, h5, h6, figcaption, span {
  font-family: "Times New Roman", "Noto Serif SC", serif !important;
}
p, li, blockquote {
  overflow-wrap: normal !important;
  word-break: normal !important;
  ${paragraphAlignment}
}
p.mineru-reference {
  margin: 0 0 0.7em 0 !important;
  text-align: left !important;
  text-justify: auto !important;
}
.mineru-reference-list {
  margin: 0.8em 0 1.2em 0 !important;
}
h1, h2, h3 {
  line-height: 1.18 !important;
}
h1 .mineru-heading-math,
h1 .katex,
h1 math,
h1 math * {
  font-weight: 700 !important;
  font-style: normal !important;
}
table p, table li, pre, code {
  text-align: left !important;
}
pre, code {
  font-family: Consolas, "Courier New", monospace !important;
}
table {
  display: table !important;
  width: max-content !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  border-collapse: collapse !important;
  table-layout: auto !important;
  font-size: 0.95em !important;
  line-height: 1.35 !important;
  margin: 1.35em auto 0.7em auto !important;
  border-top: 2px solid #111 !important;
  border-bottom: 2px solid #111 !important;
  background: transparent !important;
}
table td, table th {
  min-width: 4.5em !important;
  vertical-align: top !important;
  white-space: normal !important;
  border: 0 !important;
  border-bottom: 1px solid #d6d6d6 !important;
  padding: 0.38em 0.95em !important;
  background: transparent !important;
}
table tbody tr:first-child td,
table thead th {
  font-weight: 700 !important;
  text-align: center !important;
  border-bottom: 1.5px solid #333 !important;
}
table tbody tr:last-child td {
  border-bottom: 0 !important;
}
table td:first-child,
table th:first-child {
  text-align: left !important;
}
table td:not(:first-child),
table th:not(:first-child) {
  text-align: center !important;
}
table.mineru-wide-table {
  width: 100% !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  font-size: 0.78em !important;
  line-height: 1.18 !important;
}
table.mineru-wide-table td,
table.mineru-wide-table th {
  min-width: 0 !important;
  padding: 0.28em 0.38em !important;
  overflow-wrap: anywhere !important;
  word-break: normal !important;
  hyphens: none !important;
}
img, svg {
  display: block !important;
  height: auto !important;
  max-width: 100% !important;
  margin: 1.25em auto !important;
}
main.mineru-markdown-document {
  max-width: 100% !important;
}
figure.mineru-image-block {
  margin: 1.5em auto !important;
  text-align: center !important;
}
figure.mineru-image-block img,
figure.mineru-image-block svg {
  margin: 0 auto !important;
}
figure.mineru-subfigure {
  margin: 1.5em auto !important;
  text-align: center !important;
}
figure.mineru-subfigure img,
figure.mineru-subfigure svg {
  margin: 0 auto 0.45em auto !important;
}
p.mineru-author-line {
  margin: 0.7em 0 0.75em 0 !important;
  text-align: left !important;
  text-justify: auto !important;
  line-height: 1.45 !important;
  font-weight: 500 !important;
}
p.mineru-author-line sup,
p.mineru-affiliation sup,
p.mineru-correspondence sup {
  font-size: 0.72em !important;
  line-height: 0 !important;
  vertical-align: super !important;
}
p.mineru-author-line sup,
p.mineru-affiliation sup {
  margin-left: 0.04em !important;
  margin-right: 0.18em !important;
}
figcaption.mineru-subcaption,
p.mineru-figure-caption,
p.mineru-table-caption {
  text-align: center !important;
  font-weight: 650 !important;
  margin: 0.45em auto 1.2em auto !important;
}
figcaption.mineru-subcaption *,
p.mineru-figure-caption *,
p.mineru-table-caption * {
  font-weight: 650 !important;
}
figcaption.mineru-subcaption math,
figcaption.mineru-subcaption math *,
p.mineru-figure-caption math,
p.mineru-figure-caption math *,
p.mineru-table-caption math,
p.mineru-table-caption math * {
  font-weight: 650 !important;
}
p.mineru-affiliation {
  margin: 0 0 0.25em 0 !important;
  text-align: left !important;
  text-justify: auto !important;
  line-height: 1.45 !important;
  font-style: italic !important;
}
p.mineru-correspondence {
  margin: 0 0 0.2em 0 !important;
  text-align: left !important;
  text-justify: auto !important;
  line-height: 1.35 !important;
  font-size: 0.95em !important;
  font-style: italic !important;
}
p.mineru-mdpi-author-line {
  margin: 0.85em 0 1.15em 0 !important;
  text-align: left !important;
  text-justify: auto !important;
  line-height: 1.45 !important;
  font-size: 1.05em !important;
  font-weight: 700 !important;
  font-style: normal !important;
}
p.mineru-mdpi-affiliation,
p.mineru-mdpi-correspondence {
  display: grid !important;
  grid-template-columns: 2.25em minmax(0, 1fr) !important;
  column-gap: 0.55em !important;
  align-items: baseline !important;
  margin: 0.18em 0 !important;
  text-align: left !important;
  text-justify: auto !important;
  line-height: 1.32 !important;
  font-size: 0.9em !important;
  font-style: normal !important;
}
p.mineru-mdpi-affiliation sup,
p.mineru-mdpi-correspondence sup {
  justify-self: end !important;
}
.mineru-inline-math {
  font-family: "Times New Roman", "Cambria Math", serif !important;
  font-style: italic !important;
  white-space: nowrap !important;
}
.mineru-formula-block {
  margin: 0.85em auto 1.1em auto !important;
  overflow-x: auto !important;
  text-align: center !important;
}
.katex,
math {
  font-family: "Times New Roman", "Cambria Math", serif !important;
}
.katex {
  font-size: 1em !important;
  line-height: 1.2 !important;
}
.mineru-inline-math sup,
.mineru-inline-math sub {
  font-style: normal !important;
  line-height: 0 !important;
}
pre {
  white-space: pre-wrap !important;
}
@media (max-width: 760px) {
  html {
    background: #fff !important;
  }
  body {
    width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 18px !important;
    box-shadow: none !important;
  }
}
@page {
  size: A4;
  margin: 18mm 16mm 20mm 16mm;
}
@media print {
  html {
    background: #fff !important;
  }
  body {
    width: auto !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
  a {
    color: inherit !important;
    text-decoration: none !important;
  }
}
</style>`;

      if (html.includes(marker)) {
        return html.replace(new RegExp(`<style\\s+id=["']${marker}["'][\\s\\S]*?<\\/style>`, "i"), style);
      }
      if (html.includes("</head>")) {
        return html.replace("</head>", `${style}\n</head>`);
      }
      if (html.includes("</style>")) {
        return html.replace("</style>", `</style>\n${style}`);
      }
      return `${style}\n${html}`;
    },

    suppressFigureOCRText(html) {
      let lines = html.split(/\r?\n/);
      let output = [];
      for (let index = 0; index < lines.length; index++) {
        let followsImage = this.previousOutputLineHasImage(output);
        let precedesImage = this.nextLineHasImage(lines, index);
        let protectedCaptionLine = this.isProtectedCaptionLine(lines[index], lines[index + 1] || "");
        let startsOCRBlock = this.isNoisyFigureOCRStart(lines[index])
          || this.isOCRBlockHeaderBeforeContinuation(lines[index], lines[index + 1] || "")
          || (followsImage && !protectedCaptionLine && this.isLooseImageOCRText(lines[index]))
          || (precedesImage && !protectedCaptionLine && this.isPreImageOCRText(lines[index]));
        if (!startsOCRBlock) {
          output.push(lines[index]);
          continue;
        }

        index++;
        while (
          index < lines.length
          && this.isSuppressibleFigureOCRLine(lines[index], lines[index + 1] || "")
        ) {
          if (this.isNoisyCaptionLabelBeforeCaption(lines[index], lines[index + 1] || "", lines[index + 2] || "")) {
            output.push("<p>");
            index++;
            break;
          }
          index++;
        }
        index--;
      }
      return output.join("\n");
    },

    removeLooseFigureOCRFragments(html) {
      let looseImageOCRFragment = "(?:this\\s+image\\s+may\\s+contain\\s+)?(?:text\\s+or\\s+symbols?|or\\s+symbols?|symbols?|text)\\)?";
      let imageParagraph = "(<p\\b[^>]*>\\s*<img\\b[^>]*>\\s*<\\/p>\\s*)";
      let captionParagraph = "(\\s*<p\\b(?:[^>]*class=[\"'][^\"']*mineru-(?:figure|table)-caption[^\"']*[\"'][^>]*|(?=[^>]*>\\s*(?:Figure|Table)\\s*\\d+\\s*[.:])[^>]*)>)";
      return html.replace(
        new RegExp(`${imageParagraph}\\s*${looseImageOCRFragment}\\s*${captionParagraph}`, "gi"),
        "$1$2"
      );
    },

    isNoisyCaptionLabelBeforeCaption(line, nextLine, followingLine) {
      let raw = line.trim();
      if (!/^<p\b[^>]*>[\s\S]{0,120}<br\s*\/?>\s*$/i.test(raw)) {
        return false;
      }
      let text = this.plainText(raw).replace(/\s+/g, " ").trim();
      if (!text || text.length > 80 || this.startsWithCaptionKeyword(text)) {
        return false;
      }
      let captionText = `${this.plainText(nextLine || "").trim()} ${this.plainText(followingLine || "").trim()}`.replace(/\s+/g, " ").trim();
      return this.isLikelyStandaloneFigureCaptionText(captionText);
    },

    isSuppressibleFigureOCRLine(line, nextLine) {
      if (this.isProtectedCaptionLine(line, nextLine)) {
        return false;
      }
      return this.isNoisyFigureOCRContinuation(line) || this.isLooseImageOCRText(line);
    },

    isProtectedCaptionLine(line, nextLine) {
      let text = this.plainText(line).replace(/\s+/g, " ").trim();
      let nextText = this.plainText(nextLine || "").replace(/\s+/g, " ").trim();
      if (!text) {
        return false;
      }
      if (this.startsWithCaptionKeyword(text) || this.rawStartsWithCaptionKeyword(line.trim())) {
        return true;
      }
      return this.isLikelyStandaloneFigureCaptionText(`${text} ${nextText}`.trim());
    },

    centerSubfigureCaptions(html) {
      html = html.replace(
        /<p>\s*([^<]{1,100}?)<br\s*\/?>\s*(<img\b[^>]*>)\s*<\/p>/gi,
        (match, labelHTML, image) => {
          let parsed = this.parseSubfigureLabel("type=\"a\"", labelHTML);
          if (!parsed) {
            return match;
          }
          return `<figure class="mineru-subfigure">${image}<figcaption class="mineru-subcaption">${this.escapeHTML(parsed.subcaption)}</figcaption></figure>`;
        }
      );

      html = html.replace(
        /<ol\b([^>]*)>\s*<li\b[^>]*>([\s\S]*?)<br\s*\/?>\s*(<img\b[^>]*>)\s*<\/li>\s*<\/ol>/gi,
        (match, olAttrs, labelHTML, image) => {
          let parsed = this.parseSubfigureLabel(olAttrs, labelHTML);
          if (!parsed) {
            return match;
          }
          return `<figure class="mineru-subfigure">${image}<figcaption class="mineru-subcaption">${this.escapeHTML(parsed.subcaption)}</figcaption></figure>`;
        }
      );

      html = html.replace(
        /<p>\s*(<img\b[^>]*>)\s*<\/p>\s*<ol\b([^>]*)>\s*<li\b[^>]*>([\s\S]*?)<\/li>\s*<\/ol>/gi,
        (match, image, olAttrs, itemHTML) => {
          let parsed = this.parseSubfigureListItem(olAttrs, itemHTML);
          if (!parsed) {
            return match;
          }

          let figure = `<figure class="mineru-subfigure">${image}<figcaption class="mineru-subcaption">${this.escapeHTML(parsed.subcaption)}</figcaption></figure>`;
          if (parsed.figureCaption) {
            return `${figure}\n<p class="mineru-figure-caption">${this.escapeHTML(parsed.figureCaption)}</p>`;
          }
          return figure;
        }
      );

      return html.replace(/<ol\b([^>]*)>\s*<li\b[^>]*>([\s\S]*?)<br\s*\/?>\s*([\s\S]*?)<\/li>\s*<\/ol>/gi, (match, olAttrs, labelHTML, captionHTML) => {
        if (/<(img|table|ol|ul)\b/i.test(captionHTML)) {
          return match;
        }
        let parsed = this.parseSubfigureLabel(olAttrs, labelHTML);
        let captionText = this.plainText(captionHTML).replace(/\s+/g, " ").trim();
        if (!parsed || !this.isFigureCaptionText(captionText)) {
          return match;
        }
        return `<p class="mineru-subcaption">${this.escapeHTML(parsed.subcaption)}</p>\n<p class="mineru-figure-caption">${this.escapeHTML(this.repairFigureCaptionText(captionText))}</p>`;
      });
    },

    normalizeSubfigureCaptionList(html) {
      return html.replace(/<ol\b([^>]*)>\s*<li\b[^>]*>([\s\S]*?)<br\s*\/?>\s*([\s\S]*?)(?:<\/li>)?\s*<\/ol>/gi, (match, olAttrs, labelHTML, captionHTML) => {
        if (/<(img|table|ol|ul)\b/i.test(captionHTML)) {
          return match;
        }
        let parsed = this.parseSubfigureLabel(olAttrs, labelHTML);
        let captionText = this.plainText(captionHTML).replace(/\s+/g, " ").trim();
        if (!parsed || !this.isFigureCaptionText(captionText)) {
          return match;
        }
        return `<p class="mineru-subcaption">${this.escapeHTML(parsed.subcaption)}</p>\n<p class="mineru-figure-caption">${this.escapeHTML(this.repairFigureCaptionText(captionText))}</p>`;
      });
    },

    normalizeLabelCaptionImageListItems(html) {
      return html.replace(/<ol\b([^>]*)>([\s\S]*?)<\/ol>/gi, (match, olAttrs, inner) => {
        if (!/\btype\s*=\s*["']?a["']?/i.test(olAttrs) || !/<img\b/i.test(inner)) {
          return match;
        }
        let startMatch = olAttrs.match(/\bstart\s*=\s*["']?(\d+)["']?/i);
        let startIndex = startMatch ? Math.max(1, parseInt(startMatch[1], 10)) : 1;
        let changed = false;
        let normalized = inner.replace(/<li\b[^>]*>\s*(?:<p>\s*)?((?:(?!<br\s*\/?>|<img\b|<\/li>)[\s\S]){1,120})<br\s*\/?>\s*((?:(?!<br\s*\/?>\s*<img\b|<\/li>)[\s\S]){1,1000})<br\s*\/?>\s*(<img\b[^>]*>)\s*(?:<\/p>)?\s*(?:<\/li>)?/gi, (item, labelHTML, captionHTML, image, offset) => {
          let label = this.plainText(labelHTML).replace(/\s+/g, " ").trim();
          let caption = this.plainText(captionHTML).replace(/\s+/g, " ").trim();
          if (!label || label.length > 80 || !this.isFigureCaptionText(caption)) {
            return item;
          }
          let priorItems = (inner.slice(0, offset).match(/<li\b/gi) || []).length;
          let letter = String.fromCharCode(96 + Math.min(startIndex + priorItems, 26));
          changed = true;
          return `<figure class="mineru-subfigure">${image}<figcaption class="mineru-subcaption">${this.escapeHTML(`${letter}. ${label}`)}</figcaption></figure>\n<p class="mineru-figure-caption">${this.escapeHTML(this.repairFigureCaptionText(caption))}</p>`;
        });
        if (!changed) {
          return match;
        }
        return normalized.replace(/<\/?li\b[^>]*>/gi, "").trim();
      });
    },

    markFigureAndTableCaptions(html) {
      html = html.replace(/<p(?![^>]*\bclass=)([^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*?)<br\s*\/?>\s*((?:(?!<p\b|<\/p>)[\s\S])*?)<\/p>\s*(?=<table\b)/gi, (match, attrs, figurePart, tablePart) => {
        let figureText = this.plainText(figurePart).replace(/\s+/g, " ").trim();
        let tableText = this.plainText(tablePart).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(figureText) || !this.isTableCaptionText(tableText)) {
          return match;
        }
        return `<p class="mineru-figure-caption"${attrs}>${figurePart}</p>\n<p class="mineru-table-caption">${tablePart}</p>`;
      });

      html = html.replace(/<p(?![^>]*\bclass=)([^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*)<\/p>\s*(?=<table\b)/gi, (match, attrs, inner) => {
        let text = this.plainText(inner).replace(/\s+/g, " ").trim();
        if (!this.isTableCaptionText(text) && !this.isLooseTableCaptionBeforeTable(text)) {
          return match;
        }
        return `<p class="mineru-table-caption"${attrs}>${inner}</p>`;
      });

      return html.replace(/<p(?![^>]*\bclass=)([^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*)<\/p>/gi, (match, attrs, inner) => {
        let text = this.plainText(inner).replace(/\s+/g, " ").trim();
        if (this.isFigureCaptionText(text)) {
          return `<p class="mineru-figure-caption"${attrs}>${inner}</p>`;
        }
        if (this.isTableCaptionText(text)) {
          return `<p class="mineru-table-caption"${attrs}>${inner}</p>`;
        }
        return match;
      });
    },

    removeCaptionAdjacentPipeNoise(html) {
      return html.replace(
        /(^|\n)[^\n<]{0,180}\|[^\n]*(?:-{3,}|={3,})[^\n]*\n(?=<ol\b[^>]*>\s*<li\b[^>]*>\s*(?:[a-z]\.\s*)?(?:fig\.|figure|table)\s*\d+\s*\.)/gi,
        "$1"
      );
    },

    normalizeCaptionLists(html) {
      return html.replace(/<ol\b([^>]*)>\s*<li\b[^>]*>([\s\S]*?)<\/li>\s*<\/ol>/gi, (match, olAttrs, inner) => {
        if (/<(img|table|ol|ul)\b/i.test(inner)) {
          return match;
        }
        let text = this.plainText(inner).replace(/\s+/g, " ").trim();
        if (this.isFigureCaptionText(text)) {
          return `<p class="mineru-figure-caption">${this.escapeHTML(this.repairFigureCaptionText(text))}</p>`;
        }
        if (this.isTableCaptionText(text)) {
          return `<p class="mineru-table-caption">${this.escapeHTML(text)}</p>`;
        }
        if (/^\s*$/.test(text)) {
          return "";
        }
        return match;
      });
    },

    splitLooseCaptionImageParagraphs(html) {
      return html.replace(/<p([^>]*)>((?:(?!<p\b|<\/p>|<img\b)[\s\S])*?)<br\s*\/?>\s*(<img\b[^>]*>)\s*(?:<br\s*\/?>)?/gi, (match, attrs, beforeImage, image) => {
        if (this.shouldPreserveImageGroupFragment(match)) {
          return match;
        }
        let text = this.plainText(beforeImage).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(text) && !this.isTableCaptionText(text)) {
          return match;
        }
        let captionClass = this.isFigureCaptionText(text) ? "mineru-figure-caption" : "mineru-table-caption";
        let captionText = captionClass === "mineru-figure-caption" ? this.repairFigureCaptionText(text) : text;
        return `<p class="${captionClass}">${this.escapeHTML(captionText)}</p>\n<p${attrs}>${image}</p>`;
      });
    },

    splitCaptionParagraphImages(html) {
      return html.replace(/<p([^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*?)(<br\s*\/?>\s*)?(<img\b[^>]*>)\s*<\/p>/gi, (match, attrs, beforeImage, br, image) => {
        if (this.shouldPreserveImageGroupFragment(match)) {
          return match;
        }
        let text = this.plainText(beforeImage).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(text) && !this.isTableCaptionText(text)) {
          return match;
        }
        let captionClass = this.isFigureCaptionText(text) ? "mineru-figure-caption" : "mineru-table-caption";
        let captionText = captionClass === "mineru-figure-caption" ? this.repairFigureCaptionText(text) : text;
        return `<p class="${captionClass}">${this.escapeHTML(captionText)}</p>\n<p>${image}</p>`;
      });
    },

    splitImageCaptionParagraphs(html) {
      return html.replace(/<p([^>]*)>\s*(<img\b[^>]*>)\s*(?:<br\s*\/?>\s*)?((?:(?!<p\b|<\/p>)[\s\S])+?)<\/p>/gi, (match, attrs, image, afterImage) => {
        if (this.shouldPreserveImageGroupFragment(match)) {
          return match;
        }
        let text = this.plainText(afterImage).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(text) && !this.isTableCaptionText(text)) {
          return match;
        }
        let captionClass = this.isFigureCaptionText(text) ? "mineru-figure-caption" : "mineru-table-caption";
        let captionText = captionClass === "mineru-figure-caption" ? this.repairFigureCaptionText(text) : text;
        return `<p${attrs}>${image}</p>\n<p class="${captionClass}">${this.escapeHTML(captionText)}</p>`;
      });
    },

    closeCaptionParagraphsBeforeImages(html) {
      return html.replace(/<p(?![^>]*\bclass=)([^>]*)>((?:(?!<p\b|<\/p>|<img\b)[\s\S])*?)(?=\s*<p\b[^>]*>\s*<img\b)/gi, (match, attrs, captionHTML) => {
        let text = this.plainText(captionHTML).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(text) && !this.isTableCaptionText(text)) {
          return match;
        }
        let captionClass = this.isFigureCaptionText(text) ? "mineru-figure-caption" : "mineru-table-caption";
        let captionText = captionClass === "mineru-figure-caption" ? this.repairFigureCaptionText(text) : text;
        return `<p class="${captionClass}"${attrs}>${this.escapeHTML(captionText)}</p>\n`;
      });
    },

    wrapBareFigureCaptionLines(html) {
      let lines = html.split(/\r?\n/);
      let output = [];
      for (let index = 0; index < lines.length; index++) {
        let line = lines[index];
        let text = this.plainText(line).replace(/\s+/g, " ").trim();
        if (/^\s*</.test(line) || !this.previousOutputLineHasImage(output) || !this.isFigureCaptionText(text)) {
          output.push(line);
          continue;
        }

        let buffer = [line];
        let cursor = index;
        while (!/<\/p>\s*$/i.test(buffer[buffer.length - 1]) && cursor + 1 < lines.length && buffer.length < 8) {
          let nextLine = lines[cursor + 1];
          if (/^\s*<(?:p|img|table|tbody|tr|td|th|ol|ul|li|h[1-6])\b/i.test(nextLine)) {
            break;
          }
          buffer.push(nextLine);
          cursor++;
        }

        let fragment = buffer.join("\n");
        let captionText = this.plainText(fragment.replace(/<\/p>\s*$/i, "")).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(captionText)) {
          output.push(line);
          continue;
        }
        output.push(`<p class="mineru-figure-caption">${this.escapeHTML(this.repairFigureCaptionText(captionText))}</p>`);
        index = cursor;
      }
      return output.join("\n");
    },

    demoteFigureReferenceParagraphs(html) {
      return html.replace(/<p([^>]*\bclass\s*=\s*(["'])(?=[^"']*\bmineru-figure-caption\b)([^"']*)\2[^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*)<\/p>/gi, (match, attrs, quote, classValue, inner) => {
        let text = this.plainText(inner).replace(/\s+/g, " ").trim();
        if (!this.isFigureReferenceParagraphText(text)) {
          return match;
        }
        let cleanedAttrs = this.removeClassFromAttributes(attrs, "mineru-figure-caption");
        return `<p${cleanedAttrs}>${inner}</p>`;
      });
    },

    demoteNarrativeTableLeadIns(html) {
      return html.replace(/<p([^>]*\bclass\s*=\s*(["'])(?=[^"']*\bmineru-table-caption\b)([^"']*)\2[^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*)<\/p>(\s*<table\b)/gi, (match, attrs, quote, classValue, inner, tableStart) => {
        let text = this.plainText(inner).replace(/\s+/g, " ").trim();
        if (/^(?:[a-z]\.\s*)?table\s*\d+\b/i.test(text)) {
          return match;
        }
        let cleanedAttrs = this.removeClassFromAttributes(attrs, "mineru-table-caption");
        return `<p${cleanedAttrs}>${inner}</p>${tableStart}`;
      });
    },

    removeClassFromAttributes(attrs, className) {
      return String(attrs || "").replace(/\sclass\s*=\s*(["'])([^"']*)\1/i, (match, quote, classValue) => {
        let remaining = classValue
          .split(/\s+/)
          .filter(value => value && value !== className)
          .join(" ");
        return remaining ? ` class=${quote}${remaining}${quote}` : "";
      });
    },

    addClassToAttributes(attrs, className) {
      let value = String(attrs || "");
      if (new RegExp(`\\b${this.escapeRegExp(className)}\\b`).test(value)) {
        return value;
      }
      if (/\sclass\s*=\s*(["'])([^"']*)\1/i.test(value)) {
        return value.replace(/\sclass\s*=\s*(["'])([^"']*)\1/i, (match, quote, classValue) => {
          let classes = `${classValue} ${className}`.trim().replace(/\s+/g, " ");
          return ` class=${quote}${classes}${quote}`;
        });
      }
      return `${value} class="${className}"`;
    },

    isFigureCaptionText(text) {
      if (!text || text.length > 2200) {
        return false;
      }
      if (this.isFigureReferenceParagraphText(text)) {
        return false;
      }
      if (/^(?:[a-z]\.\s*)?fig\.\s*\d+(?:\s*[.:])?(?=\s|$)/i.test(text)) {
        return true;
      }
      if (/^(?:[a-z]\.\s*)?figure\s*\d+\s*[.:](?=\s|$)/i.test(text)) {
        return true;
      }
      let looseFigure = text.match(/^(?:[a-z]\.\s*)?figure\s*\d+\s+([A-Za-z][A-Za-z-]*)/i);
      if (looseFigure && !/^(?:shows?|showed|shown|presents?|presented|indicates?|illustrates?|demonstrates?|depicts?|is|are|was|were|has|have|can|will)$/i.test(looseFigure[1])) {
        return true;
      }
      if (this.isLikelyStandaloneFigureCaptionText(text)) {
        return true;
      }
      let embeddedFigure = text.match(/\bfigure\s+\d+\.\s*/i);
      return !!embeddedFigure && embeddedFigure.index <= 40 && !/[.!?]\s+[A-Z]/.test(text.slice(0, embeddedFigure.index));
    },

    isFigureReferenceParagraphText(text) {
      let value = String(text || "").trim();
      let referenceLead = value.match(/^(?:fig\.|figure)\s*\d+(?:\s*(?:and|,)\s*(?:fig\.|figure|table)\s*\d+)?\s+(?:(?:clearly|also|further|mainly|generally|schematically|respectively)\s+)?([A-Za-z][A-Za-z-]*)\b/i);
      if (referenceLead && /^(?:is|are|was|were|shows?|illustrates?|presents?|presented|demonstrates?|indicates?|reveals?|suggests?|confirms?|compares?|describes?|displays?|reports?|summari[sz]es?|elucidates?|depicts?|provides?|gives?|lists?)$/i.test(referenceLead[1])) {
        return true;
      }
      if (/^(?:fig\.|figure)\s*\d+(?:(?:\s*[\(\[]?\s*[a-z0-9]+\s*[\)\]]?)(?:\s*(?:-|\u2013|\u2014|to)\s*[\(\[]?\s*[a-z0-9]+\s*[\)\]]?)?(?:\s*(?:,|and)\s*[\(\[]?\s*[a-z0-9]+\s*[\)\]]?)*)?\s+(?:clearly|also|further|mainly|generally|schematically|respectively\s+)?(?:is|are|was|were|shows?|illustrates?|presents?|presented|demonstrates?|indicates?|reveals?|suggests?|confirms?|compares?|describes?|displays?|reports?|summari[sz]es?)\b/i.test(value)) {
        return true;
      }
      return /^(?:fig\.|figure)\s*\d+(?:(?:\s*[\(\[]\s*[a-z0-9]+\s*[\)\]])(?:\s*(?:-|–|—|to)\s*[\(\[]\s*[a-z0-9]+\s*[\)\]])?(?:\s*(?:,|and)\s*[\(\[]\s*[a-z0-9]+\s*[\)\]])*)?\s+(?:is|are|was|were|shows?|illustrates?|presents?|presented|demonstrates?|indicates?|reveals?|suggests?|confirms?|compares?|describes?|displays?|reports?|summari[sz]es?)\b/i.test(String(text || "").trim());
    },

    isLikelyStandaloneFigureCaptionText(text) {
      if (!text || text.length < 24 || text.length > 520) {
        return false;
      }
      if (/[.!?]\s+[A-Z]/.test(text)) {
        return false;
      }
      let panelMatches = text.match(/\([a-z]\)/gi) || [];
      if (panelMatches.length < 2) {
        return false;
      }
      return /\b(macrographs?|micrographs?|fractographs?|morpholog(?:y|ies|ical)|distribution|characteristics?|observations?|profiles?|curves?|maps?|images?|results?|specimens?|samples?|welds?|joints?)\b/i.test(text);
    },

    isTableCaptionText(text) {
      if (!text) {
        return false;
      }
      if (/^(?:[a-z]\.\s*)?(table)\s*\d+\s*[.:](?=\s|$)/i.test(text)) {
        return true;
      }
      if (text.length > 180) {
        return false;
      }
      if (/\b(?:we|our|this|these|those)\b/i.test(text)) {
        return false;
      }
      if (/[.!?]\s+[A-Z]/.test(text)) {
        return false;
      }
      return /(\bcomposition\b|\bparameters?\b|\bproperties\b|\bresults?\b|\bspacing\b|\bcontent\b|\bvalues?\b|\bdimensions?\b|\bconditions?\b)/i.test(text);
    },

    isLooseTableCaptionBeforeTable(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value || value.length > 220) {
        return false;
      }
      if (!/^(?:[a-z]\.\s*)?table\s*\d+\s+\S/i.test(value)) {
        return false;
      }
      if (/[.!?]\s+[A-Z]/.test(value)) {
        return false;
      }
      return /\b(?:details?|composition|parameters?|properties|results?|spacing|content|values?|dimensions?|conditions?|characteristics?|summary|comparison|data)\b/i.test(value);
    },

    parseSubfigureListItem(olAttrs, itemHTML) {
      if (/<(img|table|ol|ul)\b/i.test(itemHTML)) {
        return null;
      }

      let parts = itemHTML.split(/<br\s*\/?>/i);
      let parsed = this.parseSubfigureLabel(olAttrs, parts.shift() || "");
      if (!parsed) {
        return null;
      }

      let rest = parts.join(" ").replace(/\s+/g, " ").trim();
      let figureCaption = rest ? this.repairFigureCaptionText(rest) : "";

      return { subcaption: parsed.subcaption, figureCaption };
    },

    parseSubfigureLabel(olAttrs, labelHTML) {
      if (!/\btype\s*=\s*["']?a["']?/i.test(olAttrs)) {
        return null;
      }
      let label = this.plainText(labelHTML).replace(/\s+/g, " ").trim();
      label = this.repairSubfigureLabelText(label);
      if (!label || label.length > 80 || /^(fig\.|figure|table)\b/i.test(label)) {
        return null;
      }
      let startMatch = olAttrs.match(/\bstart\s*=\s*["']?(\d+)["']?/i);
      let letterIndex = startMatch ? Math.max(1, parseInt(startMatch[1], 10)) : 1;
      let letter = String.fromCharCode(96 + Math.min(letterIndex, 26));
      return { subcaption: `${letter}. ${label}` };
    },

    repairSubfigureLabelText(label) {
      let value = String(label || "").replace(/\s+/g, " ").trim();
      value = value.replace(/^([a-z])\s*\(\s*\)\s*/i, "$1. ");
      value = value.replace(/\bl\s*resa\b/i, "Laser");
      value = value.replace(/\bresaL\b/g, "Laser");
      value = value.replace(/\bH\s*d\s*\(\s*\)\s*LM\b/i, "HLM");
      value = value.replace(/^\(?([a-z])\)?\s+/, "$1. ");
      value = value.replace(/^[a-z]\.\s+([a-z]\.\s+)/i, "$1");
      return value.trim();
    },

    repairFigureCaptionText(text) {
      let value = this.plainText(text).replace(/\s+/g, " ").trim();
      value = value.replace(/^[a-z]\.\s+(?=(fig\.|figure)\s*\d+\b)/i, "");
      value = value.replace(/^(?:laser|hlt|hlm|base material|laser weld|hlt weld|hlm weld|hlm\s+\d+x)\s+(?=(?:the\s+)?(?:macrographs?|micrographs?|fractographs?|hardness|tensile)\b)/i, "");
      value = value.replace(/^(.*?)\bpro-\s*Figure\s+(\d+)\.\s*cesses:(.*)$/i, (match, before, figureNumber, after) => {
        return `Figure ${figureNumber}. ${before}processes:${after}`;
      });
      value = value.replace(/\bFigure\s+(\d+)\.\s*([A-Za-z])/g, "Figure $1. $2");
      if (!/^(fig\.\s*\d+(?:\s*[.:])?|figure\s*\d+\s*[.:])(?=\s|$)/i.test(value)) {
        let embeddedFigure = value.match(/\bFigure\s+(\d+)\.\s*/i);
        if (embeddedFigure) {
          value = value.replace(/\s*\bFigure\s+\d+\.\s*/i, " ");
          value = value.replace(/\(\s*([a-z])\s*\)\s+/gi, "($1) ");
          value = `Figure ${embeddedFigure[1]}. ${value}`;
        }
      }
      return value;
    },

    shouldPreserveImageGroupFragment(fragment) {
      let value = String(fragment || "");
      return /\bmineru-(?:image-group|markdown-image-group|fallback-image-group)\b/i.test(value)
        || /<figure\b/i.test(value)
        || /<(?:ol|ul|li)\b/i.test(value)
        || this.countMatches(value, /<img\b/gi) > 1;
    },

    isOCRBlockHeaderBeforeContinuation(line, nextLine) {
      let text = this.plainText(line).trim();
      let nextText = this.plainText(nextLine).trim();
      if (!/^(surface_?3d|natural_image|text_image|area|line|bar)$/i.test(text)) {
        return false;
      }
      if (!nextText) {
        return false;
      }
      return this.pipeCount(nextText) >= 2
        || this.numericTokenCount(nextText) >= 4
        || /^(surface_?3d|natural_image|text_image|area|line|bar)\b/i.test(nextText);
    },

    startsWithCaptionKeyword(text) {
      return /^(?:fig\.|fig\b|figure\b|table\b)/i.test(text);
    },

    rawStartsWithCaptionKeyword(raw) {
      return /^<p>\s*(?:fig\.|fig\b|figure\b|table\b)/i.test(raw);
    },

    isNoisyFigureOCRStart(line) {
      let text = this.plainText(line).trim();
      if (!text) {
        return false;
      }
      if (/^(surface_?3d|natural_image|text_image)\b/i.test(text)) {
        return true;
      }
      if (/^(surface_?3d|area|line|bar)\b/i.test(text) && this.pipeCount(text) >= 2) {
        return true;
      }
      return this.pipeCount(text) >= 10 && this.numericTokenCount(text) >= 8;
    },

    isNoisyFigureOCRContinuation(line) {
      let text = this.plainText(line).trim();
      if (!text) {
        return false;
      }
      if (/^(natural_image|text_image)\b/i.test(text)) {
        return true;
      }
      if (this.rawStartsWithCaptionKeyword(line.trim())) {
        return false;
      }
      if (this.isLikelyStandaloneFigureCaptionText(text)) {
        return false;
      }
      if (/^<\/?(p|h[1-6]|table|tbody|tr|td|th|ol|ul|li|div|section|img|svg)\b/i.test(line.trim()) && this.pipeCount(text) < 4) {
        return false;
      }
      if (/^[\s|\-:]+$/.test(text) && this.pipeCount(text) >= 2) {
        return true;
      }
      return this.pipeCount(text) >= 4 || this.numericTokenCount(text) >= 8;
    },

    previousOutputLineHasImage(output) {
      for (let index = output.length - 1; index >= 0; index--) {
        let line = output[index].trim();
        if (!line) {
          continue;
        }
        if (/<img\b/i.test(line)) {
          return true;
        }
        if (this.isEmptyContainerLine(line)) {
          continue;
        }
        return false;
      }
      return false;
    },

    nextLineHasImage(lines, index) {
      let limit = Math.min(lines.length, index + 10);
      for (let cursor = index + 1; cursor < limit; cursor++) {
        let line = lines[cursor].trim();
        if (!line) {
          continue;
        }
        if (/<img\b/i.test(line)) {
          return true;
        }
        if (this.isEmptyContainerLine(line)) {
          continue;
        }
        return false;
      }
      return false;
    },

    isEmptyContainerLine(line) {
      if (/^<\/?(p|figure|div|section|span|center)\b[^>]*>\s*$/i.test(line)) {
        return true;
      }
      return !this.plainText(line).trim() && !/<(img|table|math)\b/i.test(line);
    },

    isPreImageOCRText(line) {
      let raw = line.trim();
      let text = this.plainText(raw).trim();
      if (!text) {
        return false;
      }
      if (this.startsWithCaptionKeyword(text) || this.rawStartsWithCaptionKeyword(raw)) {
        return false;
      }
      if (this.isLikelyStandaloneFigureCaptionText(text)) {
        return false;
      }
      if (this.isStandaloneFigureOCRNoise(text)) {
        return true;
      }
      if (/<(img|table|tbody|tr|td|th|ol|ul|li|h[1-6])\b/i.test(raw)) {
        return false;
      }
      if (this.isFigureOCRMeasurementLine(text) || this.isDenseFigureOCRLabel(text)) {
        return true;
      }
      return /^[a-z]\.?$/i.test(text)
        || this.isShortFigureLabel(text)
        || this.isShortFigureFragment(text);
    },

    isLooseImageOCRText(line) {
      let raw = line.trim();
      let text = this.plainText(raw).trim();
      if (!text) {
        return false;
      }
      if (this.startsWithCaptionKeyword(text) || this.rawStartsWithCaptionKeyword(raw)) {
        return false;
      }
      if (this.isLikelyStandaloneFigureCaptionText(text)) {
        return false;
      }
      if (this.isStandaloneFigureOCRNoise(text)) {
        return true;
      }
      if (/<(img|table|tbody|tr|td|th|ol|ul|li|h[1-6])\b/i.test(raw)) {
        return false;
      }
      if (this.isShortInlineMathLine(raw, text)) {
        return true;
      }
      if (this.isFigureOCRMeasurementLine(text) || this.isDenseFigureOCRLabel(text)) {
        return true;
      }
      if (text.length > 320) {
        return false;
      }
      if (/^[a-z]\.?$/i.test(text)) {
        return true;
      }
      if (this.isShortFigureLabel(text)) {
        return true;
      }
      if (this.isShortFigureFragment(text)) {
        return true;
      }
      let words = text.match(/[A-Za-z][A-Za-z0-9\-]*/g) || [];
      if (words.length < 2 || words.length > 40) {
        return false;
      }
      if (/[.!?]\s+[A-Z]/.test(text)) {
        return false;
      }
      return true;
    },

    isStandaloneFigureOCRNoise(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value || value.length > 220) {
        return false;
      }
      if (/^`{2,}$/.test(value)) {
        return true;
      }
      if (/^(?:this\s+image\s+may\s+contain\s+)?(?:text\s+or\s+symbols?|or\s+symbols?|symbols?|text)\)?$/i.test(value)) {
        return true;
      }
      if (/^labels?\.?$/i.test(value)) {
        return true;
      }
      if (
        /\b(?:kernel\s+aver\.?|misorient\.?|misorien\.?|misorientation|kam|ipf)\b/i.test(value)
        && /(?:\b\d+\s*(?:µm|μm|um)\b|\(\+\)|[<>]\s*\d+|\b\d+\s*(?:°|º|掳|◦))/i.test(value)
      ) {
        return true;
      }
      if (this.pipeCount(value) >= 2 && this.numericTokenCount(value) >= 2) {
        return true;
      }
      if (/^\|\s*[~<>+\-]?\s*\d+(?:\.\d+)?\s*(?:(?:-|~)\s*\d+(?:\.\d+)?)?\s*(?:%|mm|cm|\u00B5m|\u03BCm|um|MPa|kJ\/mm)?\s*\|$/i.test(value)) {
        return true;
      }
      let normalized = value.toLowerCase();
      let words = normalized.match(/[a-z][a-z0-9-]*/g) || [];
      if (
        /\b(?:porosity|pore|before optimization|after optimization)\b/i.test(value)
        && words.length >= 3
        && words.length <= 24
        && !/^(?:fig\.|figure)\s*\d+\b/i.test(value)
      ) {
        return true;
      }
      if (/(?:气孔|姘斿瓟)/.test(value) && this.numericTokenCount(value) >= 1) {
        return true;
      }
      return false;
    },

    isShortInlineMathLine(raw, text) {
      if (!/<math\b/i.test(raw)) {
        return false;
      }
      let cleaned = String(text || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned || cleaned.length > 120) {
        return false;
      }
      return !/[.!?]\s+[A-Z]/.test(cleaned);
    },

    isFigureOCRMeasurementLine(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value || value.length > 90 || /[.!?]\s+[A-Z]/.test(value)) {
        return false;
      }
      let numericCount = this.numericTokenCount(value);
      if (!numericCount) {
        return false;
      }
      let hasFigureUnit = /\b(?:mm|cm|m|min|s|ms|us|µs|渭s|kJ|J|W|kW|A|V|fps)\b/i.test(value)
        || /(?:°|掳|%)/.test(value)
        || /\/\s*(?:min|s|mm|m)\b/i.test(value);
      if (!hasFigureUnit) {
        return false;
      }
      let words = value.match(/[A-Za-z][A-Za-z0-9\-]*/g) || [];
      return words.length <= 6;
    },

    isDenseFigureOCRLabel(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value || value.length > 120 || /[.!?]\s+[A-Z]/.test(value)) {
        return false;
      }
      if (this.numericTokenCount(value) < 3) {
        return false;
      }
      let words = value.match(/[A-Za-z][A-Za-z0-9\-]*/g) || [];
      if (words.length > 8) {
        return false;
      }
      let compact = value
        .replace(/\b(?:mm|cm|m|min|s|ms|us|µs|渭s|kJ|J|W|kW|A|V|fps)\b/gi, "")
        .replace(/[0-9%.,+\-鈥撯€斆梮()°掳\s/]/g, "")
        .trim();
      return compact.length <= 12;
    },

    isShortFigureFragment(text) {
      if (text.length > 60) {
        return false;
      }
      if (this.startsWithCaptionKeyword(text)) {
        return false;
      }
      if (/[.!?]/.test(text)) {
        return false;
      }
      let words = text.match(/[A-Za-z][A-Za-z0-9\-]*/g) || [];
      if (words.length === 1 && /^[A-Za-z][A-Za-z0-9\-]{1,24}\)?$/.test(text)) {
        return true;
      }
      return false;
    },

    isShortFigureLabel(text) {
      if (text.length > 80) {
        return false;
      }
      if (this.numericTokenCount(text) < 1) {
        return false;
      }
      let compact = text
        .replace(/\b(mm|cm|m|um|µm|μm|mpa|pa|hz|w|j|s|wt|vol|at|pmz|fz|bm)\b/gi, "")
        .replace(/[0-9%.,+\-–—×x()\s]/g, "")
        .trim();
      return compact.length <= 2;
    },

    pipeCount(text) {
      return (text.match(/\|/g) || []).length;
    },

    numericTokenCount(text) {
      return (text.match(/[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || []).length;
    },

    plainText(line) {
      return line.replace(/<[^>]+>/g, " ");
    },

    escapeHTML(text) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },

    escapeAttribute(text) {
      return this.escapeHTML(String(text || ""))
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    escapeRegExp(text) {
      return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    normalizeCaptionMathOCR(html) {
      return html.replace(/(<(?:p|figcaption)\b[^>]*class="[^"]*\bmineru-(?:(?:figure|table)-caption|subcaption)\b[^"]*"[^>]*>)([\s\S]*?)(<\/(?:p|figcaption)>)/gi, (match, open, content, close) => {
        return open + this.normalizeCaptionMathText(content) + close;
      });
    },

    normalizeCaptionMathText(content) {
      if (!/[\uD835\uDC9F]|\\mathcal/.test(content)) {
        return content;
      }

      let normalized = content
        .replace(/\uD835\uDC9F\s*(t\s*a\s*r|a\s*u\s*x)(?=\s|[,.;:)]|\||$)/gi, (match, script) => {
          return this.datasetFormulaHTML(script);
        })
        .replace(/(?:\{\s*)?\\mathcal\s*\{\s*D\s*\}\s*(?:\}\s*)?\^\s*\{\s*\\mathrm\s*\{\s*([A-Za-z\s]{3,9})\s*\}\s*\}/g, (match, script) => {
          return this.datasetFormulaHTML(script) || match;
        })
        .replace(/(?:\{\s*)?\\mathcal\s*\{\s*D\s*\}\s*(?:\}\s*)?\^\s*\{\s*([A-Za-z\s]{3,9})\s*\}/g, (match, script) => {
          return this.datasetFormulaHTML(script) || match;
        })
        .replace(/\b\d(?:\s+\d){1,8}\b/g, digits => digits.replace(/\s+/g, ""));

      for (let kind of ["tar", "aux"]) {
        let span = this.escapeRegExp(this.datasetFormulaHTML(kind));
        normalized = normalized
          .replace(new RegExp(`(\\|\\s*${span}\\s*\\|\\s*=\\s*(\\d+))(?:\\s+\\|\\s*${span}\\s*\\|\\s*=\\s*\\2)+`, "g"), "$1")
          .replace(new RegExp(`(${span})(?:\\s+${span})+`, "g"), "$1");
      }

      return normalized
        .replace(/\s+([,.;:])/g, "$1")
        .trim();
    },

    datasetFormulaHTML(script) {
      let kind = String(script || "").replace(/\s+/g, "").toLowerCase();
      if (!["tar", "aux"].includes(kind)) {
        return "";
      }
      return `<span class="mineru-inline-math mineru-dataset" data-dataset="${kind}">&#x1D49F;<sup>${kind}</sup></span>`;
    },

    cleanupSimpleLatex(html) {
      let updated = html.replace(/\$\$([\s\S]{1,3000}?)\$\$/g, (match, expression) => {
        return `<div class="mineru-formula-block">${this.renderFormulaHTML(expression, true)}</div>`;
      });
      updated = updated.replace(/\$([^$\n]{1,500})\$/g, (match, expression) => {
        let rendered = this.renderFormulaHTML(expression, false);
        if (rendered) {
          return rendered;
        }
        let cleaned = this.cleanLatexExpression(expression);
        return cleaned || match;
      });
      return this.normalizeSpacedScientificUnits(updated);
    },

    renderFormulaHTML(expression, displayMode = false) {
      let raw = String(expression || "").trim();
      if (!raw) {
        return "";
      }
      let stripped = this.stripMathDelimiters(raw);
      let normalizedExpression = this.normalizeMathExpressionForRender(stripped.expression);
      let renderer = globalThis.MinerUHTMLKaTeX;
      if (renderer?.renderToString) {
        try {
          let rendered = renderer.renderToString(normalizedExpression.trim(), {
            throwOnError: false,
            output: "mathml",
            displayMode: displayMode || stripped.displayMode,
            strict: "ignore"
          });
          if (rendered && !/\bkatex-error\b/i.test(rendered)) {
            return rendered;
          }
        }
        catch (error) {
          log(`KaTeX render failed: ${error?.message || error}`);
        }
      }
      let cleaned = this.cleanLatexExpression(normalizedExpression);
      return cleaned || this.escapeHTML(raw);
    },

    normalizeMathExpressionForRender(expression) {
      return this.decodeMathHTMLEntities(String(expression || ""))
        .replace(/\b(\d)\s*\.\s*((?:\d\s*){1,6})\b/g, (match, integer, decimals) => `${integer}.${decimals.replace(/\s+/g, "")}`)
        .replace(/\b(\d(?:\s+\d){1,8})(?=\s*(?:\\(?:mathrm|text)\s*\{|[A-Za-z%]|\\mu|\\circ|\\times|\\cdot|\^|_|$))/g, digits => digits.replace(/\s+/g, ""))
        .replace(/~+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    decodeMathHTMLEntities(text) {
      return String(text || "")
        .replace(/&amp;(gt|lt|le|ge|nbsp|times|micro|mu|deg|minus);/gi, "&$1;")
        .replace(/&gt;/gi, ">")
        .replace(/&lt;/gi, "<")
        .replace(/&le;/gi, "\\le ")
        .replace(/&ge;/gi, "\\ge ")
        .replace(/&times;/gi, "\\times ")
        .replace(/&micro;|&mu;/gi, "\\mu ")
        .replace(/&deg;/gi, "^ { \\circ }")
        .replace(/&minus;/gi, "-")
        .replace(/&nbsp;/gi, " ");
    },

    stripMathDelimiters(expression) {
      let value = String(expression || "").trim();
      if (value.startsWith("$$") && value.endsWith("$$") && value.length >= 4) {
        return { expression: value.slice(2, -2), displayMode: true };
      }
      if (value.startsWith("$") && value.endsWith("$") && value.length >= 2) {
        return { expression: value.slice(1, -1), displayMode: false };
      }
      if (value.startsWith("\\[") && value.endsWith("\\]")) {
        return { expression: value.slice(2, -2), displayMode: true };
      }
      if (value.startsWith("\\(") && value.endsWith("\\)")) {
        return { expression: value.slice(2, -2), displayMode: false };
      }
      return { expression: value, displayMode: false };
    },

    normalizePlainTableMathNotation(html) {
      return html.replace(/<td>\s*([A-Za-z])_([A-Za-z](?:,?[A-Za-z]){0,5})\s*<\/td>/g, (match, base, subscript) => {
        return `<td><span class="mineru-inline-math">${base}<sub>${subscript}</sub></span></td>`;
      });
    },

    normalizeFrontMatterHeadings(html) {
      let updated = String(html || "").replace(/(<main\b[^>]*>\s*)<h1\b[^>]*>[^<]{20,}?\s-\s[^<]*?\s-\s(?:19|20)\d{2}\s*<\/h1>\s*(?=<h1\b)/i, "$1");
      return updated.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, (match, attrs, inner) => {
        let normalizedInner = inner.replace(/<span\b[^>]*class=["'][^"']*\bkatex\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, span => {
          return this.headingMathText(span) || span;
        });
        normalizedInner = normalizedInner
          .replace(/\b(\d+)\s+mm\s+(\d+)\s+L\b/g, "$1 mm $2L")
          .replace(/\b(\d+)\s+mm(\d+L)\b/g, "$1 mm $2");
        return `<h1${attrs}>${normalizedInner}</h1>`;
      });
    },

    headingMathText(html) {
      let annotation = String(html || "").match(/<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i);
      if (!annotation) {
        return "";
      }
      let expression = annotation[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
      let stainless = expression.match(/^((?:\d\s*)+)\s*\\+\s*\\mathrm\s*\{\s*mm\s*\}\s*\\*\s*((?:\d\s*)+)\s*\\mathrm\s*\{\s*L\s*\}$/i);
      if (stainless) {
        return this.headingMathStrong(`${stainless[1].replace(/\s+/g, "")} mm ${stainless[2].replace(/\s+/g, "")}L`);
      }
      let compact = expression
        .replace(/\\mathrm\s*\{\s*([^{}]+?)\s*\}/gi, "$1")
        .replace(/\\/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      stainless = compact.match(/^((?:\d\s*)+)\s+mm\s+((?:\d\s*)+)\s*L$/i);
      if (stainless) {
        return this.headingMathStrong(`${stainless[1].replace(/\s+/g, "")} mm ${stainless[2].replace(/\s+/g, "")}L`);
      }
      return "";
    },

    headingMathStrong(text) {
      return `<strong class="mineru-heading-math">${this.escapeHTML(String(text || ""))}</strong>`;
    },

    formatAuthorAffiliationBlock(html) {
      html = this.formatMDPIFrontMatterBlock(html);
      return html.replace(/((?:<h1\b[^>]*>[\s\S]*?<\/h1>\s*)+)<p([^>]*)>((?:(?!<p\b|<\/p>|<h[1-6]\b)[\s\S])*)<\/p>\s*<p([^>]*)>((?:(?!<p\b|<\/p>|<h[1-6]\b)[\s\S])*)<\/p>(?:\s*<p([^>]*)>((?:(?!<p\b|<\/p>|<h[1-6]\b)[\s\S])*)<\/p>)?(\s*<h1\b[^>]*>\s*(?:Abstract|a\s+r\s+t\s+i\s+c\s+l\s+e\s+i\s+n\s+f\s+o|a\s+b\s+s\s+t\s+r\s+a\s+c\s+t)\s*<\/h1>)/i, (match, heading, authorAttrs, authorInner, affiliationAttrs, affiliationInner, correspondenceAttrs, correspondenceInner, abstractHeading) => {
        let authorText = this.normalizeFrontMatterAuthorText(authorInner);
        let affiliationText = this.normalizeFrontMatterText(this.plainText(affiliationInner));
        if (!this.isLikelyAuthorLineText(authorText) || !this.isLikelyFrontMatterAffiliationText(affiliationText)) {
          return match;
        }
        let authorHTML = this.formatAuthorLineHTML(authorText);
        let parts = this.splitFrontMatterAffiliationAndEmails(affiliationText);
        let formatted = [
          `<p${this.addClassToAttributes(authorAttrs, "mineru-author-line")}>${authorHTML}</p>`
        ];
        for (let affiliation of parts.affiliations) {
          formatted.push(`<p${this.addClassToAttributes(affiliationAttrs, "mineru-affiliation")}>${this.formatAffiliationLineHTML(affiliation)}</p>`);
        }
        for (let email of parts.emails) {
          formatted.push(`<p class="mineru-correspondence"><sup>${this.escapeHTML(email.marker)}</sup> ${this.escapeHTML(email.address)}</p>`);
        }
        if (correspondenceInner) {
          let correspondenceText = this.normalizeCorrespondenceText(this.plainText(correspondenceInner));
          if (this.isLikelyCorrespondenceText(correspondenceText)) {
            formatted.push(`<p${this.addClassToAttributes(correspondenceAttrs || "", "mineru-correspondence")}>${this.formatCorrespondenceLineHTML(correspondenceText)}</p>`);
          }
          else {
            formatted.push(`<p${correspondenceAttrs || ""}>${correspondenceInner}</p>`);
          }
        }
        return `${heading}${formatted.join("\n")}${abstractHeading}`;
      });
    },

    normalizeFrontMatterAuthorText(authorHTML) {
      let text = this.plainText(String(authorHTML || "")
        .replace(/<span\b[^>]*class=["'][^"']*\bkatex\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, match => {
          return this.extractLatexSuperscriptMarker(match);
        }));
      return this.normalizeFrontMatterText(text
        .replace(/\)\s+(?=[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+)+)/gu, ", ")
        .replace(/((?:\d+|[a-z])(?:\s*,\s*(?:\d+|[a-z]|\*))*)\s+(?=[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+)+)/giu, "$1, ")
        .replace(/\s+,/g, ",")
        .replace(/,\s*,+/g, ","));
    },

    extractLatexSuperscriptMarker(html) {
      let annotation = String(html || "").match(/<annotation\b[^>]*encoding=["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i);
      if (!annotation) {
        return " ";
      }
      let marker = annotation[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .match(/\^\s*\{\s*([^{}]+?)\s*\}/);
      if (!marker) {
        return " ";
      }
      return ` ${marker[1].replace(/\s+/g, "")} `;
    },

    formatMDPIFrontMatterBlock(html) {
      return html.replace(/(<h1\b[^>]*>\s*Article\s+[\s\S]*?<\/h1>\s*)<p([^>]*)>((?:(?!<p\b|<\/p>|<h[1-6]\b)[\s\S])*)<\/p>((?:\s*<p\b[^>]*>\s*(?:Citation:|Academic Editor:|Received:)[\s\S]*?<\/p>)+)\s*<p([^>]*)>((?:(?!<p\b|<\/p>|<h[1-6]\b)[\s\S])*)<\/p>(\s*<p\b[^>]*>\s*Abstract:)/i, (match, heading, authorAttrs, authorInner, metadataHTML, affiliationAttrs, affiliationInner, abstractStart) => {
        let authorText = this.normalizeMDPIAuthorText(authorInner);
        let affiliationText = this.normalizeMDPIAffiliationText(affiliationInner);
        if (!this.isLikelyMDPIAuthorLineText(authorText) || !this.isLikelyMDPIAffiliationText(affiliationText)) {
          return match;
        }
        let formatted = [
          `<p${this.addClassToAttributes(authorAttrs, "mineru-author-line mineru-mdpi-author-line")}>${this.formatMDPIAuthorLineHTML(authorText)}</p>`,
          metadataHTML
        ];
        let parts = this.splitMDPIAffiliationBlock(affiliationText);
        for (let affiliation of parts.affiliations) {
          formatted.push(`<p${this.addClassToAttributes(affiliationAttrs, "mineru-affiliation mineru-mdpi-affiliation")}><sup>${this.escapeHTML(affiliation.marker)}</sup><span>${this.escapeHTML(affiliation.text)}</span></p>`);
        }
        if (parts.correspondence) {
          formatted.push(`<p class="mineru-correspondence mineru-mdpi-correspondence"><sup>*</sup><span>Correspondence: ${this.escapeHTML(parts.correspondence)}</span></p>`);
        }
        return `${heading}${formatted.join("\n")}${abstractStart}`;
      });
    },

    normalizeMDPIAuthorText(authorHTML) {
      return String(this.plainText(String(authorHTML || "")
        .replace(/\\<em>/gi, "*")
        .replace(/\\<\/em>/gi, "*")))
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:])/g, "$1")
        .replace(/\\+/g, "*")
        .replace(/\s*\*\s*/g, "*")
        .replace(/,\s*\*/g, ",*")
        .replace(/\s+and\s+/gi, " and ")
        .trim();
    },

    normalizeMDPIAffiliationText(affiliationHTML) {
      return this.normalizeFrontMatterText(this.plainText(String(affiliationHTML || "")
        .replace(/&amp;/g, "&")))
        .replace(/\\\*/g, "*")
        .replace(/\s+([;:,.])/g, "$1")
        .trim();
    },

    isLikelyMDPIAuthorLineText(text) {
      let value = String(text || "").trim();
      return value.length >= 20
        && value.length <= 350
        && /\b[A-Z][\p{L}.'-]+\s+[A-Z][\p{L}.'-]+\s+\d/iu.test(value)
        && /\*/.test(value)
        && !/@|\b(?:Citation|University|Abstract)\b/i.test(value);
    },

    isLikelyMDPIAffiliationText(text) {
      let value = String(text || "").trim();
      return value.length >= 80
        && value.length <= 1400
        && /\bCorrespondence:\s*\S+@\S+/i.test(value)
        && /\b(?:University|Institution|Laboratory|Research)\b/i.test(value)
        && /(?:^|\s)2\s+\p{Lu}/u.test(value);
    },

    formatMDPIAuthorLineHTML(text) {
      let value = String(text || "").trim();
      let tokenPattern = /([A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+)+)\s+(\d+(?:\s*,\s*\d+)*(?:\s*,\s*\*)?|\d+\s*,?\s*\*)/gu;
      let output = "";
      let lastIndex = 0;
      let match;
      while ((match = tokenPattern.exec(value))) {
        output += this.escapeHTML(value.slice(lastIndex, match.index));
        output += `${this.escapeHTML(match[1])}<sup>${this.escapeHTML(match[2].replace(/\s+/g, ""))}</sup>`;
        lastIndex = tokenPattern.lastIndex;
      }
      output += this.escapeHTML(value.slice(lastIndex));
      return output.replace(/\s+,/g, ",").replace(/\s+and\s+/g, " and ");
    },

    splitMDPIAffiliationBlock(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      let correspondence = "";
      value = value.replace(/\*+\s*Correspondence:\s*([\s\S]+)$/i, (match, correspondenceText) => {
        correspondence = correspondenceText.replace(/\s+([;:,.])/g, "$1").trim();
        return "";
      }).trim();
      let markers = [{ start: 0, marker: "1" }];
      let markerPattern = /(?:^|\s)([2-9]\d?)\s+(?=(?:[A-Z][A-Za-z&.-]+|Key\s+Laboratory|School|College|Department|Faculty|Institute|Laboratory|University|Jiangsu|Hebei)\b)/g;
      let match;
      while ((match = markerPattern.exec(value))) {
        markers.push({
          start: match.index + (/^\s/.test(match[0]) ? 1 : 0),
          marker: match[1]
        });
      }
      markers = markers
        .filter((marker, index, all) => index === 0 || marker.start > all[index - 1].start)
        .sort((a, b) => a.start - b.start);
      let affiliations = [];
      for (let index = 0; index < markers.length; index++) {
        let start = markers[index].start;
        let end = index + 1 < markers.length ? markers[index + 1].start : value.length;
        let segment = value.slice(start, end).trim();
        segment = segment.replace(new RegExp(`^${this.escapeRegExp(markers[index].marker)}\\s+`), "");
        segment = segment.replace(/\s+([;:,.])/g, "$1").trim();
        if (segment) {
          affiliations.push({ marker: markers[index].marker, text: segment });
        }
      }
      return { affiliations, correspondence };
    },

    normalizeFrontMatterText(text) {
      return String(text || "")
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:])/g, "$1")
        .replace(/\\\*/g, "*")
        .replace(/[⁎∗]/g, "*")
        .replace(/,\s*(\d)(?=\s|$)/g, "$1")
        .replace(/\bKo\s+vács\b/g, "Kovács")
        .replace(/\bFa\s+bi\s+an\b/gi, "Fábián")
        .trim();
    },

    isLikelyAuthorLineText(text) {
      let value = String(text || "").trim();
      if (value.length < 8 || value.length > 260 || !/(?:\d|[a-z](?:\s*,\s*(?:[a-z]|\*))?\b|\*)/i.test(value)) {
        return false;
      }
      if (/@|\b(?:University|Institute|Department|Faculty|Laboratory|Abstract)\b/i.test(value)) {
        return false;
      }
      return /[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,4}\s*,?\s*(?:\d+|[a-z](?:\s*,\s*(?:[a-z]|\*))*)\b/iu.test(value);
    },

    isLikelyFrontMatterAffiliationText(text) {
      let value = String(text || "").trim();
      return value.length >= 25
        && value.length <= 900
        && (/@/.test(value) || /(?:^|[;\s])[a-z]\s+\p{Lu}/u.test(value))
        && /\b(?:University|School|College|Department|Faculty|Institute|Laborator(?:y|ies)|Center|Centre|Division|Group)\b/i.test(value);
    },

    formatAuthorLineHTML(text) {
      let value = String(text || "").replace(/\\\*/g, "*").trim();
      value = value.replace(/[⁎∗]/g, "*");
      let segments = this.splitAuthorLineSegments(value);
      if (segments.length >= 2) {
        return segments.map(segment => this.formatAuthorSegmentHTML(segment)).join(", ");
      }
      let tokenPattern = /(\b(?:[A-Z]\.?\s*)?(?:[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,4})),?\s*((?:\d+(?:\s*,\s*\d+)*|[a-z](?:\s*,\s*(?:[a-z]|\*))*))\b/giu;
      let output = "";
      let lastIndex = 0;
      let match;
      while ((match = tokenPattern.exec(value))) {
        output += this.escapeHTML(value.slice(lastIndex, match.index));
        output += `${this.escapeHTML(match[1])}<sup>${this.escapeHTML(match[2].replace(/\s+/g, ""))}</sup>`;
        lastIndex = tokenPattern.lastIndex;
      }
      output += this.escapeHTML(value.slice(lastIndex));
      return output;
    },

    splitAuthorLineSegments(text) {
      return String(text || "")
        .split(/\s*,\s*(?=(?:[A-Z]\.?\s*)?[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+)+)/u)
        .map(segment => segment.trim())
        .filter(Boolean);
    },

    formatAuthorSegmentHTML(segment) {
      let value = String(segment || "")
        .replace(/\\\*/g, "*")
        .replace(/[⁎∗]/g, "*")
        .replace(/\s+([,;:])/g, "$1")
        .trim();
      let markerMatch = value.match(/^(.+?)(\d+(?:\s*,\s*(?:\d+|\*))*(?:\s*,\s*\*)?|[a-z](?:\s*,\s*(?:[a-z]|\*))*)$/iu);
      if (!markerMatch) {
        return this.escapeHTML(value);
      }
      let name = markerMatch[1].replace(/[,\s]+$/g, "").trim();
      let marker = markerMatch[2].replace(/\s+/g, "");
      if (!name || !marker || !/[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+)+$/u.test(name)) {
        return this.escapeHTML(value);
      }
      return `${this.escapeHTML(name)}<sup>${this.escapeHTML(marker)}</sup>`;
    },

    formatAffiliationLineHTML(text) {
      let value = String(text || "").trim();
      let marker = value.match(/^((?:\d+|[a-z])(?:\s*,\s*(?:\d+|[a-z]))*)\s+(.+)$/i);
      if (!marker) {
        return this.escapeHTML(value);
      }
      return `<sup>${this.escapeHTML(marker[1].replace(/\s+/g, ""))}</sup> ${this.escapeHTML(marker[2].trim())}`;
    },

    splitFrontMatterAffiliationAndEmails(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      let emailPattern = /(?:^|\s)(\d+)\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?=\s|$)/gi;
      let emails = [];
      let firstEmailIndex = -1;
      let match;
      while ((match = emailPattern.exec(value))) {
        if (firstEmailIndex < 0) {
          firstEmailIndex = match.index + (/^\s/.test(match[0]) ? 1 : 0);
        }
        emails.push({
          marker: match[1],
          address: match[2]
        });
      }
      let affiliation = firstEmailIndex >= 0 ? value.slice(0, firstEmailIndex).trim() : value;
      affiliation = affiliation
        .replace(/\s+\d+\s*$/g, "")
        .replace(/\s+([,.;:])/g, "$1")
        .trim();
      let affiliations = this.splitFrontMatterAffiliationSegments(affiliation);
      return { affiliations, emails };
    },

    splitFrontMatterAffiliationSegments(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value) {
        return [];
      }
      let markerSegments = this.splitAffiliationText(value);
      if (markerSegments.length >= 2) {
        return markerSegments;
      }
      let segments = value
        .split(/\s*;\s*(?=(?:\d+|[a-z])\s+\p{Lu})/u)
        .map(segment => segment.trim())
        .filter(Boolean);
      return segments.length ? segments : [value];
    },

    normalizeCorrespondenceText(text) {
      return String(text || "")
        .replace(/\s+/g, " ")
        .replace(/\\\*/g, "*")
        .replace(/^(\*+\s*)?esponding\s+author\b/i, "* Corresponding author")
        .replace(/^(\*+\s*)?corresponding\s+author\b/i, "* Corresponding author")
        .replace(/\s+([,.;:])/g, "$1")
        .trim();
    },

    isLikelyCorrespondenceText(text) {
      let value = String(text || "").trim();
      return value.length >= 18
        && value.length <= 500
        && /\b(?:Corresponding author|E-?mail address|Email address|Tel\.?|fax)\b/i.test(value);
    },

    formatCorrespondenceLineHTML(text) {
      let value = this.normalizeCorrespondenceText(text);
      let marker = "";
      value = value.replace(/^\*+\s*/, () => {
        marker = "*";
        return "";
      }).trim();
      let prefix = marker ? `<sup>${this.escapeHTML(marker)}</sup> ` : "";
      return `${prefix}${this.escapeHTML(value)}`;
    },

    splitAffiliationParagraphs(html) {
      return html.replace(/<p([^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*)<\/p>/gi, (match, attrs, inner) => {
        if (/<(?:img|figure|table|math|h[1-6]|ol|ul|li)\b/i.test(inner)) {
          return match;
        }
        let text = this.plainText(inner).replace(/\s+/g, " ").trim();
        let segments = this.splitAffiliationText(text);
        if (segments.length < 2) {
          return match;
        }
        let affiliationAttrs = this.addClassToAttributes(attrs, "mineru-affiliation");
        return segments.map(segment => `<p${affiliationAttrs}>${this.escapeHTML(segment)}</p>`).join("\n");
      });
    },

    splitAffiliationText(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      if (!this.isLikelyAffiliationParagraphText(value)) {
        return [];
      }
      let markerPattern = /(?:^|\s)([a-z])\s+(?=(?:School|College|Department|Faculty|Institute|Laboratory|Key Laboratory|State\s+Key\s+Lab|University|West Pipeline|PipeChina|[A-Z][A-Za-z&.-]*(?:\s+[A-Z][A-Za-z&.-]*){0,7}\s+(?:University|Company|Corporation|Institute|Laboratory|Center|Centre|Co\.?|Ltd\.?))\b)/g;
      let markers = /^[a-z]\s+\p{Lu}/u.test(value) ? [0] : [];
      let match;
      while ((match = markerPattern.exec(value))) {
        let offset = /^\s/.test(match[0]) ? 1 : 0;
        let start = match.index + offset;
        if (!markers.includes(start)) {
          markers.push(start);
        }
      }
      markers.sort((a, b) => a - b);
      if (markers.length < 2 || markers[0] !== 0) {
        return [];
      }
      let segments = [];
      for (let index = 0; index < markers.length; index++) {
        let start = markers[index];
        let end = index + 1 < markers.length ? markers[index + 1] : value.length;
        let segment = value.slice(start, end).trim().replace(/\s+([,.;:])/g, "$1");
        if (segment) {
          segments.push(segment);
        }
      }
      return segments.length >= 2 ? segments : [];
    },

    isLikelyAffiliationParagraphText(text) {
      let value = String(text || "").trim();
      if (value.length < 45 || value.length > 1200) {
        return false;
      }
      if (!/^[a-z]\s+[A-Z]/.test(value)) {
        return false;
      }
      if (!/\b(?:University|School|College|Department|Institute|Laborator(?:y|ies)|Company|Corporation|PipeChina|Pipeline|Co\.,?\s*Ltd|Ltd\.?)\b/i.test(value)) {
        return false;
      }
      if (!/\b(?:China|USA|United States|UK|Germany|Japan|Korea|France|Italy|Canada|Australia|India)\b/i.test(value)) {
        return false;
      }
      return /(?:^|\s)[b-z]\s+(?:[A-Z][A-Za-z&.-]*|School|College|Department|Institute|Laboratory)\b/.test(value);
    },

    markWideTables(html) {
      return html.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (match, attrs, inner) => {
        if (/\bmineru-wide-table\b/i.test(attrs || "")) {
          return match;
        }
        let maxColumns = this.maxTableColumns(inner);
        if (maxColumns < 7) {
          return match;
        }
        return `<table${this.addClassToAttributes(attrs, "mineru-wide-table")}>${inner}</table>`;
      });
    },

    maxTableColumns(tableInnerHTML) {
      let maxColumns = 0;
      String(tableInnerHTML || "").replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (rowMatch, rowInner) => {
        let columns = 0;
        rowInner.replace(/<t[dh]\b([^>]*)>/gi, (cellMatch, attrs) => {
          let colspan = String(attrs || "").match(/\bcolspan\s*=\s*(["']?)(\d+)\1/i);
          columns += colspan ? Math.max(1, parseInt(colspan[2], 10) || 1) : 1;
          return cellMatch;
        });
        maxColumns = Math.max(maxColumns, columns);
        return rowMatch;
      });
      return maxColumns;
    },

    restoreSequentialNumberedListItems(html) {
      return String(html || "").replace(/(<p\b[^>]*>\s*1\.\s+[\s\S]*?<\/p>)\s*<ul>\s*<li>\s*((?:Schematic diagram|The dimensions|The samples|Other variables)\b[\s\S]*?)\s*<\/li>\s*<\/ul>/gi, (match, firstItem, secondItem) => {
        return `${firstItem}\n<p>2. ${secondItem.trim()}</p>`;
      });
    },

    splitReferenceParagraphs(html) {
      html = this.repairMisplacedBareReferenceBlock(html);
      html = this.repairTrailingReferenceContinuationList(html);
      html = html.replace(/(<h[1-6]\b[^>]*>\s*References\s*<\/h[1-6]>\s*)<p([^>]*)>\s*([\s\S]*?)\s*<\/p>/gi, (match, heading, attrs, content) => {
        let parts = this.separateNomenclatureTail(content);
        let entries = this.splitBareNumberedReferenceEntries(parts.referenceText);
        if (entries.length < 3) {
          return match;
        }
        let tail = parts.tail ? `<p>${this.escapeHTML(parts.tail)}</p>` : "";
        return `${heading}${this.renderReferenceEntriesBlock(entries, entry => entry)}${tail}`;
      });
      return html.replace(/<p([^>]*)>\s*(\[\d{1,3}\]\s+[\s\S]*?\[\d{1,3}\]\s+[\s\S]*?)\s*<\/p>/gi, (match, attrs, content) => {
        let entries = this.splitReferenceEntries(content);
        if (entries.length < 2) {
          return match;
        }
        return this.renderReferenceListBlock(content, entry => entry);
      });
    },

    repairMisplacedBareReferenceBlock(html) {
      return html.replace(/(<h[1-6]\b[^>]*>\s*References\s*<\/h[1-6]>\s*)<ul>\s*<li>([\s\S]*?)<\/li>\s*<\/ul>\s*(<h[1-6]\b[^>]*>\s*Acknowledg(?:e)?ments\s*<\/h[1-6]>\s*)<p([^>]*)>\s*([\s\S]*?)\s*<\/p>/gi, (match, heading, firstReference, acknowledgmentsHeading, paragraphAttrs, paragraphContent) => {
        let parts = this.separateNomenclatureTail(paragraphContent);
        let entries = this.splitBareNumberedReferenceEntries(`1. Placeholder reference. ${parts.referenceText}`).slice(1);
        if (entries.length < 3 || !/^2\.\s+/.test(this.plainText(entries[0]).trim())) {
          return match;
        }
        let first = `1. ${this.plainText(firstReference).replace(/\s+/g, " ").trim()}`;
        if (first.length < 12) {
          return match;
        }
        let referenceList = this.renderReferenceEntriesBlock([first, ...entries], entry => this.escapeHTML(entry));
        let tail = parts.tail ? `<p${paragraphAttrs || ""}>${this.escapeHTML(parts.tail)}</p>` : "";
        return `${heading}${referenceList}${acknowledgmentsHeading}${tail}`;
      });
    },

    repairTrailingReferenceContinuationList(html) {
      return String(html || "").replace(/(<h[1-6]\b[^>]*>\s*References\s*<\/h[1-6]>\s*<ul\b[^>]*>[\s\S]*<li\b[^>]*>)([\s\S]*?)(<\/li>\s*<\/ul>\s*)<p([^>]*)>\s*([\s\S]*?)\s*<\/p>/gi, (match, beforeLastReference, lastReference, afterList, paragraphAttrs, paragraphContent) => {
        let continuation = String(paragraphContent || "").replace(/\s+/g, " ").trim();
        if (!continuation || this.isReferenceTailParagraph(continuation)) {
          return match;
        }
        let plainContinuation = this.plainText(continuation).trim();
        if (!/^[a-z(]/.test(plainContinuation) || !/\b\d{1,3}\.\s+(?=[A-Z]|\p{Lu})/u.test(plainContinuation)) {
          return match;
        }

        let marker = this.firstEmbeddedNumberedReferenceMarker(continuation);
        if (!marker) {
          return match;
        }
        let mergedLast = `${lastReference.replace(/\s+$/g, "")} ${continuation.slice(0, marker.index).trim()}`.trim();
        let numberedEntries = this.splitEmbeddedNumberedReferenceEntries(continuation.slice(marker.index));
        if (!mergedLast || !numberedEntries.length) {
          return match;
        }
        let repairedEntries = numberedEntries.map(entry => `<li>${entry}</li>`).join("\n");
        return `${beforeLastReference}${mergedLast}</li>\n${repairedEntries}</ul>`;
      });
    },

    isReferenceTailParagraph(content) {
      let value = this.plainText(content).replace(/\s+/g, " ").trim();
      return /^(?:Publisher'?s Note|Springer Nature|Elsevier|Copyright|Open Access)\b/i.test(value);
    },

    firstEmbeddedNumberedReferenceMarker(content) {
      let value = String(content || "");
      let markerPattern = /\s(\d{1,3})\.\s+(?=(?:[A-Z]|\p{Lu}))/gu;
      let match;
      while ((match = markerPattern.exec(value))) {
        let prefix = value.slice(Math.max(0, match.index - 16), match.index + 1);
        if (/\bdoi\.org\/10\.\d{3,9}\/?$/i.test(prefix) || /\b10\.\d{3,9}\/?$/i.test(prefix)) {
          continue;
        }
        return {
          index: match.index + 1,
          number: parseInt(match[1], 10)
        };
      }
      return null;
    },

    splitEmbeddedNumberedReferenceEntries(content) {
      let value = String(content || "").replace(/\s+/g, " ").trim();
      let markers = [];
      let markerPattern = /(^|\s)(\d{1,3})\.\s+(?=(?:[A-Z]|\p{Lu}))/gu;
      let match;
      while ((match = markerPattern.exec(value))) {
        let start = match.index + match[1].length;
        let prefix = value.slice(Math.max(0, start - 16), start);
        if (/\bdoi\.org\/10\.\d{3,9}\/?$/i.test(prefix) || /\b10\.\d{3,9}\/?$/i.test(prefix)) {
          continue;
        }
        markers.push({ start, number: parseInt(match[2], 10) });
      }
      if (!markers.length || markers[0].start !== 0) {
        return [];
      }
      let entries = [];
      for (let index = 0; index < markers.length; index++) {
        let start = markers[index].start;
        let end = index + 1 < markers.length ? markers[index + 1].start : value.length;
        let entry = value.slice(start, end).trim();
        if (entry) {
          entries.push(entry);
        }
      }
      return entries;
    },

    separateNomenclatureTail(content) {
      let value = String(content || "").replace(/\s+/g, " ").trim();
      let tailPattern = /\s+(?=(?:ANN|ANOVA|BR|BW|DP|EMs|GA|GMSELOO|LAW|LOO|MOGA|NN|NSGA|NSGA-II|RBF|RBFNN|RMAE|RMSE|SVM|SVR)\s+(?:Artificial|Analysis|Bead|Depth|Ensemble|Genetic|Generalized|Laser|Leave|Multi|Neural|Non|Improved|Radial|Relative|Root|Support)\b)/;
      let tailMatch = value.match(tailPattern);
      if (!tailMatch) {
        return { referenceText: value, tail: "" };
      }
      let tailStart = tailMatch.index + tailMatch[0].length;
      return {
        referenceText: value.slice(0, tailMatch.index).trim(),
        tail: value.slice(tailStart).trim()
      };
    },

    splitBareNumberedReferenceEntries(content) {
      let value = String(content || "").replace(/\s+/g, " ").trim();
      if (!value || !/^\d{1,3}\.\s+/.test(this.plainText(value))) {
        return [];
      }
      let markers = [];
      let markerPattern = /(^|\s)(\d{1,3})\.\s+(?=(?:[A-ZÀ-ÖØ-ÞÅÄÖÜÉÈÁÂÃÇÑÓŚŠŽŻŁ]|\p{Lu}|Md\.|Å\.))/gu;
      let match;
      while ((match = markerPattern.exec(value))) {
        let start = match.index + match[1].length;
        let number = parseInt(match[2], 10);
        if (!Number.isFinite(number)) {
          continue;
        }
        markers.push({ start, number });
      }
      if (markers.length < 3 || markers[0].start !== 0 || markers[0].number !== 1) {
        return [];
      }
      let ascending = 0;
      for (let index = 1; index < markers.length; index++) {
        if (markers[index].number > markers[index - 1].number) {
          ascending++;
        }
      }
      if (ascending < Math.max(2, Math.floor(markers.length * 0.6))) {
        return [];
      }
      let entries = [];
      for (let index = 0; index < markers.length; index++) {
        let start = markers[index].start;
        let end = index + 1 < markers.length ? markers[index + 1].start : value.length;
        let entry = value.slice(start, end).trim();
        if (entry) {
          entries.push(entry);
        }
      }
      return entries.length >= 3 ? entries : [];
    },

    cleanLatexExpression(expression) {
      let value = expression.trim();
      if (!value || /</.test(value)) {
        return "";
      }
      let underline = value.match(/^\\underline\s*\{\s*([\s\S]+?)\s*\}$/);
      if (underline) {
        let cleanedUnderline = this.cleanLatexExpression(underline[1]);
        return cleanedUnderline ? `<u class="mineru-inline-math">${cleanedUnderline}</u>` : "";
      }
      if (/\\(frac|partial|nabla|begin|end|left|right|sqrt|overrightarrow|tag|sum|int|lim)\b/.test(value)) {
        return "";
      }

      value = value
        .replace(/\\(?:mathrm|mathbf|mathit|mathsf|mathsfit|text|textrm|textsf)\s*\{\s*([^{}]+?)\s*\}/g, (match, inner) => {
          return this.normalizeMathTokenText(inner);
        })
        .replace(/\\mathcal\s*\{\s*([A-Za-z])\s*\}/g, (match, letter) => this.mathcalSymbol(letter))
        .replace(/_\s*\{\s*\}/g, "")
        .replace(/\\times/g, "&times;")
        .replace(/\\cdot/g, "&middot;")
        .replace(/\\pm/g, "&plusmn;")
        .replace(/\\circ/g, "\u00B0")
        .replace(/\\%/g, "%")
        .replace(/\\lambda/g, "&lambda;")
        .replace(/\\mu/g, "&mu;")
        .replace(/\\sigma/g, "&sigma;")
        .replace(/\\rho/g, "&rho;")
        .replace(/\\eta/g, "&eta;")
        .replace(/\\alpha/g, "&alpha;")
        .replace(/\\beta/g, "&beta;")
        .replace(/\\epsilon|\\varepsilon/g, "&epsilon;")
        .replace(/\\Delta/g, "&Delta;")
        .replace(/\\\s*([A-Za-z]+)/g, (match, command) => {
          return this.normalizeMathTokenText(command);
        });

      value = value
        .replace(/\^\s*\u00B0/g, "\u00B0")
        .replace(/\s*\u00B0\s*C\b/g, "\u00B0C");

      value = value.replace(/([A-Za-z0-9&;]+)\s*_\s*\{\s*([^{}]+?)\s*\}/g, (match, base, subscript) => {
        return `${base}<sub>${this.cleanScriptText(subscript)}</sub>`;
      });
      value = value.replace(/([A-Za-z0-9&;]+)\s*\^\s*\{\s*([^{}]+?)\s*\}/g, (match, base, superscript) => {
        return `${base}<sup>${this.cleanScriptText(superscript)}</sup>`;
      });
      value = value.replace(/\^\s*\{\s*([^{}]+?)\s*\}/g, (match, superscript) => {
        return `<sup>${this.cleanScriptText(superscript)}</sup>`;
      });
      value = value.replace(/\{\s*([^{}]+?)\s*\}/g, "$1");

      if (/[\\{}]/.test(value)) {
        return "";
      }
      value = this.normalizeSpacedScientificUnits(value);
      return value
        .replace(/\s+/g, " ")
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s*\u00B0\s*C\b/g, "\u00B0C")
        .replace(/\s+([,;:)])/g, "$1")
        .replace(/\s+\.(?!\d)/g, ".")
        .replace(/([(])\s+/g, "$1")
        .trim();
    },

    normalizeSpacedScientificUnits(text) {
      return String(text || "")
        .replace(/\b(\d(?:\s+\d){1,8})(?=\s*(?:M\s*P\s*a|MPa|k\s*J|kJ|c\s*m|cm|m\s*m|mm|\u00B0?\s*C|%|\/))/gi, digits => digits.replace(/\s+/g, ""))
        .replace(/\b(\d(?:\s+\d){1,8})\b(?=\s*(?:<sup>|&times;|\u00D7|x\s*\d))/gi, digits => digits.replace(/\s+/g, ""))
        .replace(/\bM\s*P\s*a\b/gi, "MPa")
        .replace(/\bk\s*J\b/g, "kJ")
        .replace(/\bc\s*m\b/gi, "cm")
        .replace(/\bm\s*m\b/gi, "mm")
        .replace(/\s*\/\s*(?=(?:cm|mm|m|s)\b)/gi, "/")
        .replace(/\b(kJ|J|MPa|GPa|Pa|N|W|kW)\s*\/\s*(cm|mm|m|s)\b/g, "$1/$2")
        .replace(/(\d)\s+(?=(?:kJ|J|MPa|GPa|Pa|cm|mm|m|s|\u00B0C|%)(?:\b|\/))/g, "$1 ")
        .replace(/(\d)\s+\u00B0\s*C\b/g, "$1\u00B0C")
        .replace(/\u00B0\s*C\b/g, "\u00B0C");
    },

    normalizeMathTokenText(text) {
      return this.normalizeSpacedScientificUnits(String(text || ""))
        .replace(/\s+/g, "")
        .replace(/Mpa/gi, "MPa")
        .replace(/KJ/g, "kJ");
    },

    cleanScriptText(text) {
      return text
        .replace(/\\(?:mathrm|mathbf|mathit|mathsf|mathsfit|text|textrm|textsf)\s*\{\s*([^{}]+?)\s*\}/g, (match, inner) => this.normalizeMathTokenText(inner))
        .replace(/\\mathcal\s*\{\s*([A-Za-z])\s*\}/g, (match, letter) => this.mathcalSymbol(letter))
        .replace(/\s+/g, "")
        .replace(/MMR/i, "MMR")
        .replace(/\\lambda/g, "&lambda;")
        .replace(/\\mu/g, "&mu;")
        .replace(/\\sigma/g, "&sigma;")
        .replace(/\\eta/g, "&eta;")
        .replace(/\\alpha/g, "&alpha;")
        .replace(/\\beta/g, "&beta;");
    },

    mathcalSymbol(letter) {
      let symbols = {
        D: "&#x1D49F;",
        X: "&#x1D4B3;",
        Y: "&#x1D4B4;",
        Z: "&#x1D4B5;"
      };
      return symbols[String(letter || "").toUpperCase()] || letter;
    },

    async attachHTML({ htmlPath, pdfItem, parentItem }) {
      let title = `${this.basename(await pdfItem.getFilePathAsync()).replace(/\.pdf$/i, "")}.mineru.html`;
      return await this.attachFile({ filePath: htmlPath, title, contentType: "text/html", pdfItem, parentItem });
    },

    async attachPostprocessReport({ reportPath, pdfItem, parentItem }) {
      let title = `${this.basename(await pdfItem.getFilePathAsync()).replace(/\.pdf$/i, "")}.mineru-postprocess.txt`;
      return await this.attachFile({ filePath: reportPath, title, contentType: "text/plain", pdfItem, parentItem });
    },

    async attachFile({ filePath, title, contentType, pdfItem, parentItem }) {
      let options = {
        file: this.localFile(filePath),
        title,
        contentType
      };
      if (parentItem) {
        options.parentItemID = parentItem.id;
      }
      else {
        options.libraryID = pdfItem.libraryID;
        if (pdfItem.getCollections) {
          options.collections = pdfItem.getCollections();
        }
      }

      try {
        return await Zotero.Attachments.importFromFile(options);
      }
      catch (error) {
        options.file = filePath;
        return await Zotero.Attachments.importFromFile(options);
      }
    },

    async openAttachmentInZotero(attachment) {
      if (!attachment?.id) {
        log("Generated HTML attachment was imported, but no attachment item was returned to open.");
        return false;
      }

      try {
        let pane = Zotero.getActiveZoteroPane?.();
        if (!pane?.viewAttachment) {
          let win = Services.wm.getMostRecentWindow("navigator:browser");
          pane = win?.ZoteroPane;
        }
        if (!pane?.viewAttachment) {
          log("ZoteroPane.viewAttachment is unavailable; generated HTML will remain attached but unopened.");
          return false;
        }
        await pane.viewAttachment(attachment.id);
        return true;
      }
      catch (error) {
        log(`Failed to open generated HTML attachment: ${error?.stack || error}`);
        return false;
      }
    },

    async validatePDF(filePath) {
      if (!/\.pdf$/i.test(filePath)) {
        throw new Error("The selected attachment is not a PDF file.");
      }

      let stat = await IOUtils.stat(filePath);
      if (stat.size > this.MAX_FILE_SIZE) {
        throw new Error("MinerU precise parsing supports files up to 200 MB.");
      }

      let pageCount = await this.estimatePDFPageCount(filePath, stat.size);
      if (pageCount && pageCount > this.MAX_PAGES) {
        throw new Error(`MinerU precise parsing supports PDFs up to 200 pages. This file appears to have ${pageCount} pages.`);
      }
    },

    async estimatePDFPageCount(filePath, size) {
      if (size > 50 * 1024 * 1024) {
        return null;
      }
      try {
        let bytes = await IOUtils.read(filePath);
        let text = new TextDecoder("windows-1252", { fatal: false }).decode(bytes);
        let matches = text.match(/\/Type\s*\/Page\b/g);
        return matches ? matches.length : null;
      }
      catch (error) {
        log(`Unable to estimate PDF page count: ${error}`);
        return null;
      }
    },

    resolvePDFTargetSync(context) {
      let items = this.contextItems(context);
      if (items.length !== 1) {
        return null;
      }
      let item = items[0];
      if (this.isPDFAttachment(item)) {
        let parentItem = item.parentItemID ? Zotero.Items.get(item.parentItemID) : null;
        return { pdfItem: item, parentItem };
      }
      if (!item.isRegularItem?.()) {
        return null;
      }

      let pdfAttachments = this.getPDFAttachmentsForItemSync(item);
      if (pdfAttachments.length !== 1) {
        return null;
      }
      return { pdfItem: pdfAttachments[0], parentItem: item };
    },

    async resolvePDFTarget(context) {
      return this.resolvePDFTargetSync(context);
    },

    contextItems(context) {
      if (Array.isArray(context?.items)) {
        return context.items;
      }
      if (context?.item) {
        return [context.item];
      }
      let win = Services.wm.getMostRecentWindow("navigator:browser");
      let selected = win?.ZoteroPane?.getSelectedItems?.();
      return Array.isArray(selected) ? selected : [];
    },

    getPDFAttachmentsForItemSync(item) {
      let attachmentIDs = item.getAttachments?.() || [];
      return attachmentIDs
        .map(id => Zotero.Items.get(id))
        .filter(attachment => this.isPDFAttachment(attachment));
    },

    isPDFAttachment(item) {
      if (!item?.isAttachment?.()) {
        return false;
      }
      if (item.isPDFAttachment?.()) {
        return true;
      }
      let contentType = item.attachmentContentType || item.getField?.("contentType");
      if (contentType === "application/pdf") {
        return true;
      }
      let title = item.getField?.("title") || "";
      return /\.pdf$/i.test(title);
    },

    async fetchJSON(url, options) {
      let response = await this.fetchWithTimeout(url, options);
      let text = await response.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      }
      catch (error) {
        throw new Error(`MinerU returned non-JSON response from ${url}: ${text.slice(0, 200)}`);
      }
      if (!response.ok) {
        throw new Error(`MinerU request failed with HTTP ${response.status}: ${json.msg || text.slice(0, 200)}`);
      }
      if (json.code !== 0) {
        let code = String(json.code);
        throw new Error(`${this.errorMessageForCode(code)} MinerU code ${code}: ${json.msg || "no message"}`);
      }
      return json;
    },

    async fetchWithTimeout(url, options = {}, timeoutMS = 120000) {
      if (typeof AbortController === "undefined") {
        return await fetch(url, options);
      }

      let controller = new AbortController();
      let timeout = setTimeout(() => controller.abort(), timeoutMS);
      try {
        return await fetch(url, {
          ...options,
          signal: controller.signal
        });
      }
      finally {
        clearTimeout(timeout);
      }
    },

    errorMessageForCode(code) {
      let messages = {
        A0202: "MinerU token is invalid or expired.",
        A0211: "MinerU token is missing or malformed.",
        "-60005": "MinerU rejected the file type or file content.",
        "-60006": "MinerU rejected the file size or page count.",
        "-60010": "MinerU service quota or task limit was reached."
      };
      return messages[code] || "MinerU API error.";
    },

    async getToken() {
      let login = this.findTokenLoginSafe();
      return login?.password || this.pref("apiTokenFallback", "");
    },

    async saveToken(token) {
      Zotero.Prefs.set(this.PREF_BRANCH + "apiTokenFallback", token);

      try {
        for (let login of this.findTokenLoginsSafe()) {
          Services.logins.removeLogin(login);
        }
        if (!token) {
          return;
        }
        let { LoginInfo } = ChromeUtils.importESModule("resource://gre/modules/LoginInfo.sys.mjs");
        Services.logins.addLogin(new LoginInfo(
          this.LOGIN_ORIGIN,
          null,
          this.LOGIN_REALM,
          this.LOGIN_USERNAME,
          token,
          "",
          ""
        ));
      }
      catch (error) {
        log(`LoginManager token save failed; using preference fallback. ${error}`);
      }
    },

    findTokenLoginSafe() {
      return this.findTokenLoginsSafe()[0] || null;
    },

    findTokenLoginsSafe() {
      try {
        return Services.logins
          .findLogins(this.LOGIN_ORIGIN, null, this.LOGIN_REALM)
          .filter(login => login.username === this.LOGIN_USERNAME);
      }
      catch (error) {
        log(`LoginManager token lookup failed. ${error}`);
        return [];
      }
    },

    pref(key, fallback) {
      let value = Zotero.Prefs.get(this.PREF_BRANCH + key);
      return value === undefined ? fallback : value;
    },

    formatError(error) {
      let message = error?.message || String(error);
      return `MinerU HTML Parser failed:\n\n${message}`;
    },

    createProgress(headline) {
      if (!Zotero.ProgressWindow) {
        return null;
      }

      try {
        let title = headline || "MinerU HTML Parser";
        let win = new Zotero.ProgressWindow({ closeOnClick: true });
        win.changeHeadline(title);
        win.show();
        let tick = "chrome://zotero/skin/tick.png";
        let cross = "chrome://zotero/skin/cross.png";
        let current = null;
        let lastMessage = "";
        let styleWindow = () => {
          try {
            let doc = win._window?.document || win.window?.document || win.document;
            if (!doc) {
              return;
            }
            let root = doc.documentElement;
            root.style.border = "0";
            root.style.boxShadow = "0 8px 22px rgba(0, 0, 0, 0.16)";
            root.style.background = "transparent";
            for (let node of doc.querySelectorAll("window, body, panel, .progress-window, #progress-window")) {
              node.style.border = "0";
              node.style.outline = "0";
              node.style.boxShadow = "none";
              node.style.backgroundClip = "padding-box";
            }
          }
          catch (_) {}
        };
        let setItemText = message => {
          if (!current) {
            current = new win.ItemProgress(tick, message);
          }
          else if (typeof current.setText === "function") {
            current.setText(message);
          }
          else if (current._itemText) {
            current._itemText.textContent = message;
          }
          else if (current.itemText) {
            current.itemText.textContent = message;
          }
          else if (message !== lastMessage) {
            win.changeHeadline(`${title} - ${message}`);
          }
          lastMessage = message;
          styleWindow();
        };
        let setItemIcon = icon => {
          if (current && typeof current.setIcon === "function") {
            current.setIcon(icon);
          }
        };
        styleWindow();

        return {
          step(message, percent = 0) {
            try {
              setItemText(message);
              setItemIcon(tick);
              current.setProgress(Math.max(0, Math.min(100, percent)));
            }
            catch (error) {
              log(`Progress step failed: ${error}`);
            }
          },

          update(message, percent = 0) {
            try {
              setItemText(message);
              setItemIcon(tick);
              current.setProgress(Math.max(0, Math.min(100, percent)));
            }
            catch (error) {
              log(`Progress update failed: ${error}`);
            }
          },

          success(message) {
            try {
              setItemText(message);
              setItemIcon(tick);
              current.setProgress(100);
              win.startCloseTimer(5000);
            }
            catch (error) {
              log(`Progress success failed: ${error}`);
            }
          },

          error(message) {
            try {
              setItemText(message);
              setItemIcon(cross);
              current.setProgress(100);
              win.startCloseTimer(12000);
            }
            catch (error) {
              log(`Progress error failed: ${error}`);
            }
          }
        };
      }
      catch (error) {
        log(`Failed to create progress window: ${error}`);
        return null;
      }
    },

    translateMinerUState(state) {
      let states = {
        "waiting-file": "等待文件上传",
        pending: "排队中",
        running: "解析中",
        converting: "转换结果中",
        done: "已完成",
        failed: "失败"
      };
      return states[state] || state || "未知";
    },

    alert(message) {
      Services.prompt.alert(null, "MinerU HTML Parser", message);
    },

    async ensureTempDir() {
      let tempDir = PathUtils.join(PathUtils.tempDir, "zotero-mineru-html");
      await IOUtils.makeDirectory(tempDir, { ignoreExisting: true });
      return tempDir;
    },

    localFile(path) {
      let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      file.initWithPath(path);
      return file;
    },

    basename(path) {
      return String(path).split(/[\\/]/).pop();
    },

    safeFileName(name) {
      return String(name).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").slice(0, 120) || "mineru";
    },

    normalizeMinerUFileName(name) {
      let trimmed = String(name || "").trim() || "document.pdf";
      let extMatch = trimmed.match(/(\.[A-Za-z0-9]+)$/);
      let ext = (extMatch?.[1] || ".pdf").toLowerCase();
      let base = extMatch ? trimmed.slice(0, -extMatch[1].length) : trimmed;
      let normalized = base
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/[^A-Za-z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
      return `${normalized || "document"}${ext}`;
    },

    uuid() {
      return Services.uuid.generateUUID().toString().replace(/[{}]/g, "");
    }
  };

  Zotero.MinerUHTML = MinerUHTML;
  await MinerUHTML.init();
}

function shutdown() {
  if (MinerUHTML) {
    MinerUHTML.shutdown();
    if (Zotero.MinerUHTML === MinerUHTML) {
      delete Zotero.MinerUHTML;
    }
    MinerUHTML = undefined;
  }
}

function onMainWindowLoad({ window }) {
  MinerUHTML?.addToWindow(window);
}

function onMainWindowUnload({ window }) {
  MinerUHTML?.removeFromWindow(window);
}

function uninstall() {
  log("Uninstalled");
}
