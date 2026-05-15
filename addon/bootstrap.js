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
      maxPollSeconds: 100,
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
        introStepsText: "填写解析密钥，选择解析模型和语言后保存；在条目或 PDF 附件上右键选择“用 MinerU 解析为 HTML”。",
        tokenLabel: "解析密钥",
        tokenHelp: "解析密钥是 MinerU 精准解析 API 的 Token，用于提交 PDF 解析任务。没有密钥时可点击下方“免费申请密钥”到 MinerU 官网申请，申请和基础额度免费。基础额度完全足够科研论文阅读的使用。",
        modelLabel: "解析模型",
        modelHelp: "vlm：推荐的高精度视觉语言模型，适合复杂版面、图表、多栏 PDF\npipeline：通用管线模型，适合常规 PDF，通常更偏稳定/传统解析\nMinerU-HTML：用于对 HTML 文件进行解析并输入，解析 HTML 文件时才需要指定它",
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
        unknownModel: "未知模型：{model}",
        unknownLanguage: "未知语言：{language}",
        configAvailable: "当前配置可用：{model} / {language}，HTML 输出与清理规则已启用。",
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
        introStepsText: "Enter your parsing key, choose the parsing model and document language, then save. Right-click an item or PDF attachment and choose “Parse with MinerU to HTML”.",
        tokenLabel: "Parsing Key",
        tokenHelp: "The parsing key is your MinerU precise parsing API token. It is used to submit PDF parsing jobs. If you do not have one, click “Apply for Free Key” below to request it on the MinerU website. Applying is free, and the basic quota is free. The basic quota is fully enough for reading research papers.",
        modelLabel: "Parsing Model",
        modelHelp: "vlm: Recommended high-accuracy vision-language model for complex layouts, charts, and multi-column PDFs.\npipeline: General pipeline model for regular PDFs, usually more stable and traditional.\nMinerU-HTML: For parsing and inputting HTML files. Use it only when parsing HTML files.",
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
        unknownModel: "Unknown model: {model}",
        unknownLanguage: "Unknown language: {language}",
        configAvailable: "Current config is valid: {model} / {language}. HTML output and cleanup rules are enabled.",
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
      this.setPrefsValue(win, "mineru-html-model", this.pref("modelVersion", "vlm"));
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
        Zotero.Prefs.set(this.PREF_BRANCH + "modelVersion", this.getPrefsValue(win, "mineru-html-model") || "vlm");
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
        let model = this.getPrefsValue(win, "mineru-html-model") || "vlm";
        let language = this.getPrefsValue(win, "mineru-html-language") || "ch";
        if (!["vlm", "pipeline", "MinerU-HTML"].includes(model)) {
          throw new Error(this.t("unknownModel", { model }));
        }
        if (!["ch", "en"].includes(language)) {
          throw new Error(this.t("unknownLanguage", { language }));
        }
        this.writeFixedPrefs();
        this.setPrefsStatus(win, this.t("configAvailable", { model, language: this.displayLanguage(language) }));
      }
      catch (error) {
        log(`Preference pane config test failed: ${error?.stack || error}`);
        this.setPrefsStatus(win, this.t("configInvalid", { message: error?.message || error }));
      }
    },

    async testPrefsPaneConnection(win) {
      try {
        this.setPrefsStatus(win, this.t("testingConnection"));
        Zotero.Prefs.set(this.PREF_BRANCH + "modelVersion", this.getPrefsValue(win, "mineru-html-model") || "vlm");
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
      let dataID = this.uuid();
      let json = await this.fetchJSON(`${this.API_BASE}/file-urls/batch`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "*/*"
        },
        body: JSON.stringify({
          files: [
            {
              name: "mineru-html-connection-test.pdf",
              data_id: dataID
            }
          ],
          model_version: this.pref("modelVersion", "vlm"),
          extra_formats: ["html"],
          language: this.pref("language", "ch"),
          enable_formula: true,
          enable_table: true,
          is_ocr: false
        })
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
      this.setPrefsAttribute(win, "mineru-html-model-label", "value", this.t("modelLabel"));
      this.setPrefsAttribute(win, "mineru-html-model-help", "tooltiptext", this.t("modelHelp"));
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
      let { batchID, uploadURL } = await this.requestUploadURL({ token, fileName, dataID });

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
      progress?.step("正在提取 HTML 文件...", 84);
      await this.extractHTMLFromZip(zipPath, htmlPath);
      progress?.step("正在优化 HTML 显示样式...", 88);
      let report = await this.postprocessHTML(htmlPath, { reportPath, sourceFileName: fileName, dataID });
      return { htmlPath, reportPath: report?.reportPath || null };
    },

    async requestUploadURL({ token, fileName, dataID }) {
      let body = {
        files: [
          {
            name: fileName,
            data_id: dataID
          }
        ],
        model_version: this.pref("modelVersion", "vlm"),
        extra_formats: ["html"],
        language: this.pref("language", "ch"),
        enable_formula: this.pref("enableFormula", true),
        enable_table: this.pref("enableTable", true),
        is_ocr: this.pref("isOCR", false)
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
      let maxPollSeconds = this.pref("maxPollSeconds", 100);
      let deadline = Date.now() + maxPollSeconds * 1000;
      let started = Date.now();

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

        let elapsedSeconds = Math.floor((Date.now() - started) / 1000);
        let percent = Math.min(75, 35 + Math.floor((elapsedSeconds / maxPollSeconds) * 40));
        progress?.update(`MinerU 状态：${this.translateMinerUState(state)}，已等待 ${elapsedSeconds}s`, percent);
        await Zotero.Promise.delay(intervalSeconds * 1000);
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
        originalHTML: html
      });
      let updated = this.runPostprocessStep(report, "injectReadableStyles", html, value => this.injectReadableStyles(value));
      if (this.pref("suppressFigureOCRText", true)) {
        updated = this.runPostprocessStep(report, "suppressFigureOCRText", updated, value => this.suppressFigureOCRText(value));
      }
      updated = this.runPostprocessStep(report, "centerSubfigureCaptions", updated, value => this.centerSubfigureCaptions(value));
      updated = this.runPostprocessStep(report, "normalizeSubfigureCaptionList", updated, value => this.normalizeSubfigureCaptionList(value));
      updated = this.runPostprocessStep(report, "normalizeLabelCaptionImageListItems", updated, value => this.normalizeLabelCaptionImageListItems(value));
      updated = this.runPostprocessStep(report, "unwrapImageOnlyLists", updated, value => this.unwrapImageOnlyLists(value));
      updated = this.runPostprocessStep(report, "removeCaptionAdjacentPipeNoise", updated, value => this.removeCaptionAdjacentPipeNoise(value));
      updated = this.runPostprocessStep(report, "normalizeCaptionLists", updated, value => this.normalizeCaptionLists(value));
      updated = this.runPostprocessStep(report, "splitLooseCaptionImageParagraphs", updated, value => this.splitLooseCaptionImageParagraphs(value));
      updated = this.runPostprocessStep(report, "splitCaptionParagraphImages", updated, value => this.splitCaptionParagraphImages(value));
      updated = this.runPostprocessStep(report, "splitImageCaptionParagraphs", updated, value => this.splitImageCaptionParagraphs(value));
      updated = this.runPostprocessStep(report, "wrapBareFigureCaptionLines", updated, value => this.wrapBareFigureCaptionLines(value));
      updated = this.runPostprocessStep(report, "demoteFigureReferenceParagraphs", updated, value => this.demoteFigureReferenceParagraphs(value));
      updated = this.runPostprocessStep(report, "markFigureAndTableCaptions", updated, value => this.markFigureAndTableCaptions(value));
      if (this.pref("cleanupSimpleLatex", true)) {
        updated = this.runPostprocessStep(report, "cleanupSimpleLatex", updated, value => this.cleanupSimpleLatex(value));
      }

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

    createPostprocessReport({ htmlPath, sourceFileName, dataID, originalHTML }) {
      return {
        createdAt: new Date().toISOString(),
        sourceFileName: sourceFileName || "",
        dataID: dataID || "",
        htmlPath,
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
        `Created at: ${report.createdAt}`,
        `Source PDF: ${report.sourceFileName}`,
        `MinerU data_id: ${report.dataID}`,
        `HTML path: ${report.htmlPath}`,
        `HTML changed: ${report.changed ? "yes" : "no"}`,
        "",
        "Summary",
        `Characters: ${report.initial.characters} -> ${report.final.characters}`,
        `Images: ${report.initial.images} -> ${report.final.images}`,
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
      if (html.includes(marker)) {
        return html;
      }
      let paragraphAlignment = this.pref("justifyText", true)
        ? "text-align: justify !important;\n  text-justify: inter-word !important;"
        : "text-align: left !important;";

      let style = `
<style id="${marker}">
body {
  max-width: min(1120px, calc(100vw - 96px)) !important;
  padding: 48px !important;
  margin: 0 auto !important;
  line-height: 1.58 !important;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  hyphens: none !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
p, li, blockquote {
  overflow-wrap: normal !important;
  word-break: normal !important;
  ${paragraphAlignment}
}
h1, h2, h3 {
  line-height: 1.18 !important;
}
table p, table li, pre, code {
  text-align: left !important;
}
table {
  display: block !important;
  width: max-content !important;
  max-width: 100% !important;
  overflow-x: auto !important;
  table-layout: auto !important;
  font-size: 0.95em !important;
  margin: 1.25em auto !important;
}
table td, table th {
  min-width: 4.5em !important;
  vertical-align: top !important;
  white-space: normal !important;
}
img, svg {
  display: block !important;
  height: auto !important;
  max-width: 100% !important;
  margin: 1.25em auto !important;
}
figure.mineru-subfigure {
  margin: 1.5em auto !important;
  text-align: center !important;
}
figure.mineru-subfigure img,
figure.mineru-subfigure svg {
  margin: 0 auto 0.45em auto !important;
}
figcaption.mineru-subcaption,
p.mineru-figure-caption,
p.mineru-table-caption {
  text-align: center !important;
  font-weight: 650 !important;
  margin: 0.45em auto 1.2em auto !important;
}
pre {
  white-space: pre-wrap !important;
}
@media (max-width: 760px) {
  body {
    max-width: none !important;
    padding: 18px !important;
  }
}
</style>`;

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
        if (!this.isTableCaptionText(text)) {
          return match;
        }
        return `<p class="mineru-table-caption"${attrs}>${inner}</p>`;
      });

      return html.replace(/<p(?![^>]*\bclass=)([^>]*)>((?:(?!<p\b|<\/p>)[\s\S])*)<\/p>/gi, (match, attrs, inner) => {
        let text = this.plainText(inner).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(text)) {
          return match;
        }
        return `<p class="mineru-figure-caption"${attrs}>${inner}</p>`;
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
        let text = this.plainText(afterImage).replace(/\s+/g, " ").trim();
        if (!this.isFigureCaptionText(text) && !this.isTableCaptionText(text)) {
          return match;
        }
        let captionClass = this.isFigureCaptionText(text) ? "mineru-figure-caption" : "mineru-table-caption";
        let captionText = captionClass === "mineru-figure-caption" ? this.repairFigureCaptionText(text) : text;
        return `<p${attrs}>${image}</p>\n<p class="${captionClass}">${this.escapeHTML(captionText)}</p>`;
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

    removeClassFromAttributes(attrs, className) {
      return String(attrs || "").replace(/\sclass\s*=\s*(["'])([^"']*)\1/i, (match, quote, classValue) => {
        let remaining = classValue
          .split(/\s+/)
          .filter(value => value && value !== className)
          .join(" ");
        return remaining ? ` class=${quote}${remaining}${quote}` : "";
      });
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
      if (!text || text.length > 180) {
        return false;
      }
      if (/^(?:[a-z]\.\s*)?(table)\s*\d+\b/i.test(text)) {
        return true;
      }
      if (/[.!?]\s+[A-Z]/.test(text)) {
        return false;
      }
      return /(\bcomposition\b|\bparameters?\b|\bproperties\b|\bresults?\b|\bspacing\b|\bcontent\b|\bvalues?\b|\bdimensions?\b|\bconditions?\b)/i.test(text);
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

    unwrapImageOnlyLists(html) {
      return html.replace(/<(ol|ul)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, inner) => {
        let images = [];
        let rest = inner.replace(/<li\b[^>]*>\s*(?:<p>\s*)?(<img\b[^>]*>)\s*(?:<\/p>\s*)?<\/li>/gi, (item, image) => {
          images.push(image);
          return "";
        });
        if (!images.length || rest.replace(/\s+/g, "")) {
          return match;
        }
        return images.map(image => `<p>${image}</p>`).join("\n");
      });
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
      if (this.pipeCount(value) >= 2 && this.numericTokenCount(value) >= 2) {
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

    cleanupSimpleLatex(html) {
      return html.replace(/\$([^$\n]{1,120})\$/g, (match, expression) => {
        let cleaned = this.cleanLatexExpression(expression);
        return cleaned || match;
      });
    },

    cleanLatexExpression(expression) {
      let value = expression.trim();
      if (!value || /[<>]/.test(value)) {
        return "";
      }
      if (/\\(frac|partial|nabla|begin|end|left|right|sqrt|overrightarrow|tag|sum|int|lim)\b/.test(value)) {
        return "";
      }

      value = value
        .replace(/\\mathrm\s*\{\s*([^{}]+?)\s*\}/g, "$1")
        .replace(/\\mathbf\s*\{\s*([^{}]+?)\s*\}/g, "$1")
        .replace(/\\mathit\s*\{\s*([^{}]+?)\s*\}/g, "$1")
        .replace(/\\times/g, "&times;")
        .replace(/\\cdot/g, "&middot;")
        .replace(/\\pm/g, "&plusmn;")
        .replace(/\\circ/g, "&deg;")
        .replace(/\\%/g, "%")
        .replace(/\\sigma/g, "&sigma;")
        .replace(/\\rho/g, "&rho;")
        .replace(/\\eta/g, "&eta;")
        .replace(/\\alpha/g, "&alpha;")
        .replace(/\\beta/g, "&beta;")
        .replace(/\\epsilon|\\varepsilon/g, "&epsilon;")
        .replace(/\\Delta/g, "&Delta;");

      value = value.replace(/([A-Za-z0-9&;]+)\s*_\s*\{\s*([^{}]+?)\s*\}/g, (match, base, subscript) => {
        return `${base}<sub>${this.cleanScriptText(subscript)}</sub>`;
      });
      value = value.replace(/([A-Za-z0-9&;]+)\s*\^\s*\{\s*([^{}]+?)\s*\}/g, (match, base, superscript) => {
        return `${base}<sup>${this.cleanScriptText(superscript)}</sup>`;
      });
      value = value.replace(/\^\s*\{\s*([^{}]+?)\s*\}/g, (match, superscript) => {
        return `<sup>${this.cleanScriptText(superscript)}</sup>`;
      });

      if (/[\\{}]/.test(value)) {
        return "";
      }
      return value
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:)])/g, "$1")
        .replace(/([(])\s+/g, "$1")
        .trim();
    },

    cleanScriptText(text) {
      return text
        .replace(/\\mathrm\s*\{\s*([^{}]+?)\s*\}/g, "$1")
        .replace(/\\mathbf\s*\{\s*([^{}]+?)\s*\}/g, "$1")
        .replace(/\s+/g, "")
        .replace(/\\sigma/g, "&sigma;")
        .replace(/\\eta/g, "&eta;")
        .replace(/\\alpha/g, "&alpha;")
        .replace(/\\beta/g, "&beta;");
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
        let win = new Zotero.ProgressWindow({ closeOnClick: true });
        win.changeHeadline(headline || "MinerU HTML Parser");
        win.show();
        let tick = "chrome://zotero/skin/tick.png";
        let cross = "chrome://zotero/skin/cross.png";
        let current = null;
        let lastMessage = "";

        return {
          step(message, percent = 0) {
            try {
              current = new win.ItemProgress(tick, message);
              current.setProgress(Math.max(0, Math.min(100, percent)));
              lastMessage = message;
            }
            catch (error) {
              log(`Progress step failed: ${error}`);
            }
          },

          update(message, percent = 0) {
            try {
              if (!current || message !== lastMessage) {
                current = new win.ItemProgress(tick, message);
                lastMessage = message;
              }
              current.setProgress(Math.max(0, Math.min(100, percent)));
            }
            catch (error) {
              log(`Progress update failed: ${error}`);
            }
          },

          success(message) {
            try {
              current = new win.ItemProgress(tick, message);
              current.setProgress(100);
              win.startCloseTimer(5000);
            }
            catch (error) {
              log(`Progress success failed: ${error}`);
            }
          },

          error(message) {
            try {
              current = new win.ItemProgress(cross, message);
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
