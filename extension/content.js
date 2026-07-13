// ─────────────────────────────────────────────
// content.js — injected into the Flow tab
// ─────────────────────────────────────────────

(function () {
  if (window.__zapiSimpleLoaded) return;
  window.__zapiSimpleLoaded = true;

  let stopRequested = false;

  // ── Selectors (inline) ───────────────────────
  const SELECTORS = {
    promptTextarea: [
      "textarea[placeholder*='prompt' i]",
      "textarea[placeholder*='describe' i]",
      "textarea[aria-label*='prompt' i]",
      "div[contenteditable='true'][aria-label*='prompt' i]",
      "textarea",
    ],
    generateButton: [
      "button[aria-label*='generate' i]",
      "button[aria-label*='create' i]",
      "button[type='submit']",
      "button:has(svg[aria-label*='generate' i])",
    ],
    imageTiles: [
      "[data-testid*='generated']",
      "[class*='generated-image']",
      "[class*='result-tile']",
      "[class*='output-tile']",
      "[class*='tile']",
    ],
    failedTile: [
      "[class*='error']",
      "[class*='failed']",
      "[aria-label*='failed' i]",
      "[aria-label*='error' i]",
    ],
  };

  // ── Helpers ──────────────────────────────────
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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

  function getAllImageSrcs() {
    const imgs = [...document.querySelectorAll("img")];
    return [
      ...new Set(
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
      ),
    ];
  }

  function getTileSnapshot() {
    const tiles = findAllEls(SELECTORS.imageTiles);
    const failCount = findAllEls(SELECTORS.failedTile).length;
    const srcs = getAllImageSrcs();
    return { count: tiles.length, srcs, failCount };
  }

  // ── Submit a single prompt ────────────────────
  async function submitPrompt(text) {
    const textarea = findEl(SELECTORS.promptTextarea);
    if (!textarea) return { error: "Prompt input not found" };

    textarea.focus();
    await sleep(150);

    textarea.dispatchEvent(new Event("focus", { bubbles: true }));
    document.execCommand("selectAll", false, null);
    await sleep(80);
    document.execCommand("delete", false, null);
    await sleep(80);

    textarea.value = text;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(300);

    const btn = findEl(SELECTORS.generateButton);
    if (!btn) {
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
    const before = new Set(beforeSrcs || []);

    while (Date.now() < deadline) {
      if (stopRequested) return { stopped: true };

      await sleep(3000);

      const failed = findEl(SELECTORS.failedTile);
      if (failed) return { failed: true };

      const currentSrcs = getAllImageSrcs();
      const newUrls = currentSrcs.filter((s) => !before.has(s));

      if (newUrls.length > 0) return { newUrls };
    }

    return { timeout: true };
  }

  // ── Message handler ───────────────────────────
  // Matches the protocol used by sidepanel.js
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      switch (msg.type) {
        case "FLOW_BATCH_PING": {
          sendResponse({ ok: true });
          return;
        }

        case "FLOW_BATCH_STOP": {
          stopRequested = true;
          sendResponse({ ok: true });
          return;
        }

        case "FLOW_BATCH_RUN": {
          stopRequested = false;
          const prompt = Array.isArray(msg.prompts) ? msg.prompts[0] : msg.prompt;
          const result = await submitPrompt(prompt);
          sendResponse(result);
          return;
        }

        case "FLOW_GET_TILE_COUNT": {
          const snap = getTileSnapshot();
          sendResponse({
            count: snap.count,
            srcs: snap.srcs,
            failCount: snap.failCount,
            videoCount: 0,
            videoSrcs: [],
          });
          return;
        }

        case "FLOW_WAIT_GENERATION": {
          const result = await waitForGeneration(msg.beforeSrcs, msg.timeoutMs);
          sendResponse(result);
          return;
        }

        // Not implemented in this simplified content script — respond
        // harmlessly so the side panel doesn't hang waiting for a reply.
        case "FLOW_GET_AGENT_MODE": {
          sendResponse({ found: false });
          return;
        }

        case "FLOW_APPLY_GEN_SETTINGS": {
          sendResponse({ ok: false, missed: ["mode"], reason: "not supported" });
          return;
        }

        default:
          // Unknown message — no response needed
          return;
      }
    })();

    return true; // keep the message channel open for the async response
  });
})();