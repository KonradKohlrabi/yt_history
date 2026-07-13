// ─────────────────────────────────────────────
// content.js — injected into the Flow tab
// ─────────────────────────────────────────────

(function () {
  // Guard against double-injection
  if (window.__zapiSimpleLoaded) return;
  window.__zapiSimpleLoaded = true;

  let stopRequested = false;

  // ── Helpers ──────────────────────────────────

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function findEl(selectorList) {
    for (const sel of selectorList) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {}
    }
    return null;
  }

  function findAllEls(selectorList) {
    for (const sel of selectorList) {
      try {
        const els = [...document.querySelectorAll(sel)];
        if (els.length) return els;
      } catch {}
    }
    return [];
  }

  // Snapshot every generated image src currently on the page
  function getAllImageSrcs() {
    const imgs = [...document.querySelectorAll("img")];
    return new Set(
      imgs
        .map((i) => i.src)
        .filter(
          (s) =>
            s &&
            (s.includes("storage.googleapis") ||
              s.includes("aiusercontent") ||
              s.includes("labs.google")) &&
            !s.includes("icon") &&
            !s.includes("logo") &&
            s.length > 60
        )
    );
  }

  // Count all tile-like containers
  function getTileSnapshot() {
    const tiles = findAllEls(SELECTORS.imageTiles);
    const srcs  = getAllImageSrcs();
    return { count: tiles.length, srcs };
  }

  // ── Submit a single prompt ────────────────────

  async function submitPrompt(text) {
    // Find textarea
    const textarea = findEl(SELECTORS.promptTextarea);
    if (!textarea) return { error: "Prompt input not found" };

    // Clear + fill
    textarea.focus();
    await sleep(150);

    // Select all and delete
    textarea.dispatchEvent(new Event("focus", { bubbles: true }));
    document.execCommand("selectAll", false, null);
    await sleep(80);
    document.execCommand("delete", false, null);
    await sleep(80);

    // Type character by character (some SPAs need this)
    textarea.value = text;
    textarea.dispatchEvent(new Event("input",  { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(300);

    // Click generate
    const btn = findEl(SELECTORS.generateButton);
    if (!btn) {
      // Try Enter key as fallback
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    } else {
      btn.click();
    }

    await sleep(500);
    return { ok: true };
  }

  // ── Wait for generation to finish ────────────

  async function waitForGeneration(beforeSrcs, timeoutMs = 300000) {
    const deadline = Date.now() + timeoutMs;
    const before   = new Set(beforeSrcs);

    while (Date.now() < deadline) {
      if (stopRequested) return { stopped: true };

      await sleep(3000);

      // Check for failure indicators
      const failed = findEl(SELECTORS.failedTile);
      if (failed) return { failed: true };

      const currentSrcs = getAllImageSrcs();
      const newUrls = [...currentSrcs].filter((s) => !before.has(s));

      if (newUrls.length > 0) {
        return { newUrls };
      }
    }

    return { timeout: true };
  }

  // ── Message handler ───────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      if (msg.type === "ZAPI_PING") {
        return sendResponse({ ok: true });
      }

      if (msg.type === "ZAPI_STOP") {
        stopRequested = true;
        return sendResponse({ ok: true });
      }

      if (msg.type === "ZAPI_SUBMIT") {
        stopRequested = false;
        const result = await submitPrompt(msg.prompt);
        return sendResponse(result);
      }

      if (msg.type === "ZAPI_WAIT") {
        const result = await waitForGeneration(
          msg.beforeSrcs,
          msg.timeoutMs || 300000
        );
        return sendResponse(result);
      }

      if (msg.type === "ZAPI_SNAPSHOT") {
        const snap = getTileSnapshot();
        sendResponse({ srcs: [...snap.srcs], count: snap.count });
        return;
      }
    })();

    return true; // keep channel open for async
  });
})();