(function () {
  function start() {
    try {
      if (typeof Zotero !== "undefined" && Zotero.MinerUHTML && Zotero.MinerUHTML.onPrefsLoad) {
        Zotero.MinerUHTML.onPrefsLoad({ window });
        return;
      }
      let status = document.getElementById("mineru-html-status");
      if (status) {
        status.textContent = "正在等待插件初始化...";
        status.setAttribute("value", "正在等待插件初始化...");
      }
    }
    catch (error) {
      let status = document.getElementById("mineru-html-status");
      if (status) {
        let message = `Init failed: ${error?.message || error}`;
        status.textContent = message;
        status.setAttribute("value", message);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
  else {
    start();
  }
})();
