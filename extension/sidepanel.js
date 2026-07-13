// ─────────────────────────────────────────────
// sidepanel.js — ZAPI Simple
// ─────────────────────────────────────────────

const jsonInputEl      = document.getElementById("jsonInput");
const listSection      = document.getElementById("listSection");
const promptListEl     = document.getElementById("promptList");
const listCountEl      = document.getElementById("listCount");
const statusEl         = document.getElementById("status");
const runBtn           = document.getElementById("runBtn");
const stopBtn          = document.getElementById("stopBtn");
const connBar          = document.getElementById("connBar");
const connDot          = document.getElementById("connDot");
const connMsg          = document.getElementById("connMsg");
const connLink         = document.getElementById("connLink");
const downloadFolderEl = document.getElementById("downloadFolder");
const waitMinEl        = document.getElementById("waitMin");
const waitMaxEl        = document.getElementById("waitMax");

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let parsedFrames  = [];   // [{ id, prompt }, ...]
let frameStatuses = [];   // mirrors parsedFrames with a .status field
let isRunning     = false;
let flowTabId     = null;
const downloadedUrls = new Set();

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function randomDelay(minSec, maxSec) {
  const min = Number(minSec) || 0;
  const max = Number(maxSec) || 0;
  return (min + Math.random() * Math.max(0, max - min)) * 1000;
}

function setStatus(text) { statusEl.textContent = text; }

function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function safeFolderName(raw) {
  const cleaned = (raw || "")
    .replace(/\\/g, "/")
    .split("/")
    .map(p => p.trim())
    .filter(p => p && p !== "." && p !== "..")
    .map(p => p.replace(/[:*?"<>|]/g, "-"))
    .join("/");
  return cleaned || "zapi-frames";
}

function safeFilename(text) {
  return (text || "")
    .slice(0, 40)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 35) || "frame";
}

function fileExt(url) {
  try {
    const p = new URL(url).pathname;
    const e = p.split(".").pop().toLowerCase();
    if (["mp4","webm","mov","png","webp","jpg","jpeg"].includes(e)) return e;
  } catch {}
  return "jpg";
}

// ─────────────────────────────────────────────
// JSON parser — tolerant of the python-style format
// frames = [ {...}, {...} ]
// ─────────────────────────────────────────────
function parseFramesJson(raw) {
  let text = raw.trim();

  // Strip optional "frames = " / "frames=" prefix
  text = text.replace(/^frames\s*=\s*/, "");

  // The format sometimes has unquoted keys and missing commas between keys.
  // Strategy: extract valid JSON by fixing common issues.

  // 1. Quote bare keys:  id: 0  →  "id": 0
  text = text.replace(/([{,\n\r]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):/g, '$1"$2"$3:');

  // 2. Remove trailing commas before } or ]
  text = text.replace(/,\s*([}\]])/g, "$1");

  // 3. Add missing commas between values on adjacent lines
  //    e.g.  "id": 0\n  "time_start"  →  add comma after 0
  text = text.replace(/([\d"'truefalsenull\]}])\s*\n(\s*")/g, "$1,\n$2");

  // Parse
  const parsed = JSON.parse(text); // throws on bad JSON

  if (!Array.isArray(parsed)) throw new Error("Top-level value must be an array.");

  const frames = parsed
    .filter(f => f && typeof f === "object" && f.prompt !== undefined && f.prompt !== "")
    .map(f => ({
      id:     f.id ?? f.id_scene_relative ?? 0,
      prompt: String(f.prompt).trim(),
    }));

  if (!frames.length) throw new Error("No frames with a non-empty prompt found.");

  return frames;
}

// ─────────────────────────────────────────────
// Queue preview
// ─────────────────────────────────────────────
function rebuildList() {
  // Remove stale error box
  document.querySelector(".parse-error")?.remove();

  const raw = jsonInputEl.value.trim();
  if (!raw) {
    listSection.style.display = "none";
    parsedFrames = [];
    runBtn.disabled = true;
    return;
  }

  try {
    parsedFrames  = parseFramesJson(raw);
    frameStatuses = parsedFrames.map(f => ({ ...f, status: "pending" }));
    renderList();
    listSection.style.display = "";
    listCountEl.textContent   = `${parsedFrames.length} frame${parsedFrames.length === 1 ? "" : "s"}`;
    runBtn.disabled = !connBar.classList.contains("is-connected");
  } catch (e) {
    parsedFrames = [];
    listSection.style.display = "none";
    runBtn.disabled = true;

    const errEl = document.createElement("div");
    errEl.className = "parse-error";
    errEl.textContent = `⚠ Could not parse JSON — ${e.message}`;
    jsonInputEl.insertAdjacentElement("afterend", errEl);
  }
}

function renderList() {
  promptListEl.innerHTML = "";
  frameStatuses.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = `prompt-item${statusClass(item.status)}`;
    row.id = `fr-${i}`;
    row.innerHTML =
      `<span class="prompt-num">${i + 1}</span>` +
      `<span class="prompt-id">id ${escHtml(item.id)}</span>` +
      `<span class="prompt-text" title="${escHtml(item.prompt)}">${escHtml(item.prompt)}</span>` +
      `<span class="prompt-status s-${item.status}">${item.status}</span>`;
    promptListEl.appendChild(row);
  });
}

function statusClass(s) {
  return s === "generating" ? " is-running"
       : s === "done"       ? " is-done"
       : s === "failed"     ? " is-failed"
       : s === "stopped"    ? " is-stopped" : "";
}

function updateRow(index, status) {
  if (index < 0 || index >= frameStatuses.length) return;
  frameStatuses[index].status = status;
  const row = document.getElementById(`fr-${index}`);
  if (!row) return;
  row.className = `prompt-item${statusClass(status)}`;
  const badge = row.querySelector(".prompt-status");
  if (badge) { badge.className = `prompt-status s-${status}`; badge.textContent = status; }
  if (status === "generating") row.scrollIntoView({ block: "nearest" });
}

// Update list live as user types
jsonInputEl.addEventListener("input", () => { if (!isRunning) rebuildList(); });

// ─────────────────────────────────────────────
// Connection check
// ─────────────────────────────────────────────
const FLOW_PROJECT_RE = /labs\.google\/fx(?:\/[a-z]{2,}(?:-[a-zA-Z]{2,})?)?\/tools\/flow\/project\//;
const FLOW_BASE_RE    = /labs\.google\/fx(?:\/[a-z]{2,}(?:-[a-zA-Z]{2,})?)?\/tools\/flow/;
const FLOW_BASE       = "https://labs.google/fx/tools/flow";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function checkConnection() {
  const tab = await getActiveTab();
  const url = tab?.url || "";

  if (FLOW_PROJECT_RE.test(url)) {
    connBar.className  = "conn-bar is-connected";
    connMsg.textContent = "Connected to Google Flow project";
    connLink.style.display = "none";
    if (!isRunning) runBtn.disabled = parsedFrames.length === 0;
  } else if (FLOW_BASE_RE.test(url)) {
    connBar.className  = "conn-bar is-warn";
    connMsg.textContent = "Open a project to continue";
    connLink.style.display = "none";
    if (!isRunning) runBtn.disabled = true;
  } else {
    connBar.className  = "conn-bar is-off";
    connMsg.textContent = "Not on Google Flow";
    connLink.style.display = "";
    connLink.href = FLOW_BASE;
    if (!isRunning) runBtn.disabled = true;
  }
}

checkConnection();
chrome.tabs.onActivated.addListener(() => checkConnection());
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url || info.status === "complete") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id === tabId) checkConnection();
    });
  }
});

// ─────────────────────────────────────────────
// Content script injection
// ─────────────────────────────────────────────
async function ensureContentScript(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: "ZAPI_PING" });
    if (res?.ok) return true;
  } catch {}

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["selectors.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await sleep(800);
    return true;
  } catch (e) {
    console.warn("[ZAPI Simple] Injection failed:", e);
    return false;
  }
}

// ─────────────────────────────────────────────
// Messaging helpers
// ─────────────────────────────────────────────
async function send(tabId, message, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      if (attempt < retries) {
        await ensureContentScript(tabId);
        await sleep(1500);
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Download
// ─────────────────────────────────────────────
async function downloadImages(urls, frameId, promptText) {
  const folder = safeFolderName(downloadFolderEl.value);
  const idStr  = String(frameId).padStart(3, "0");

  for (let j = 0; j < urls.length; j++) {
    let url = urls[j];
    if (!url.startsWith("http")) url = "https://labs.google" + url;

    const suffix = urls.length > 1 ? `_${j + 1}` : "";
    const ext    = fileExt(url);
    const name   = `${idStr}_${safeFilename(promptText)}${suffix}.${ext}`;
    const filename = `${folder}/${name}`;

    try {
      await chrome.downloads.download({ url, filename, saveAs: false });
    } catch (e) {
      console.warn("[ZAPI Simple] Download failed:", e);
    }
  }
}

// ─────────────────────────────────────────────
// Countdown helper
// ─────────────────────────────────────────────
async function countdown(seconds) {
  for (let s = Math.round(seconds); s > 0 && isRunning; s--) {
    setStatus(`Next frame in ${s}s…`);
    await sleep(1000);
  }
}

// ─────────────────────────────────────────────
// Main queue runner
// ─────────────────────────────────────────────
async function startQueue() {
  if (!parsedFrames.length) { setStatus("No frames to process."); return; }

  const tab = await getActiveTab();
  if (!tab?.id) { setStatus("No active tab found."); return; }

  flowTabId = tab.id;
  await ensureContentScript(flowTabId);

  // Reset all statuses
  frameStatuses = parsedFrames.map(f => ({ ...f, status: "pending" }));
  renderList();
  downloadedUrls.clear();

  isRunning = true;
  runBtn.disabled = true;
  listSection.style.display = "";

  const total = parsedFrames.length;
  setStatus(`Starting ${total} frame(s)…`);

  try {
    for (let i = 0; i < parsedFrames.length; i++) {
      if (!isRunning) {
        for (let j = i; j < parsedFrames.length; j++) updateRow(j, "stopped");
        break;
      }

      const frame = parsedFrames[i];
      updateRow(i, "generating");
      setStatus(`[${i + 1}/${total}] Submitting frame id=${frame.id}…`);

      // ── Snapshot before ──────────────────────
      const snapRes = await send(flowTabId, { type: "ZAPI_SNAPSHOT" });
      const beforeSrcs = snapRes?.srcs ?? [];

      // ── Submit (with 1 retry) ─────────────────
      let submitted = false;
      for (let attempt = 0; attempt <= 1; attempt++) {
        if (!isRunning) break;

        if (attempt === 1) {
          setStatus(`[${i + 1}/${total}] Retrying submission…`);
          await sleep(3000);
        }

        const submitRes = await send(flowTabId, {
          type:   "ZAPI_SUBMIT",
          prompt: frame.prompt,
        });

        if (submitRes?.ok) { submitted = true; break; }
      }

      if (!isRunning) break;

      if (!submitted) {
        updateRow(i, "failed");
        setStatus(`[${i + 1}/${total}] Could not submit — skipping.`);
        await sleep(2000);
        continue;
      }

      // ── Wait for generation ──────────────────
      setStatus(`[${i + 1}/${total}] Waiting for generation…`);
      const genRes = await send(flowTabId, {
        type:       "ZAPI_WAIT",
        beforeSrcs,
        timeoutMs:  300000,
      });

      if (!isRunning) break;

      if (!genRes) {
        updateRow(i, "failed");
        setStatus(`[${i + 1}/${total}] Connection lost mid-generation.`);
        await sleep(2000);
        continue;
      }

      if (genRes.stopped) { updateRow(i, "stopped"); break; }

      if (genRes.failed || genRes.timeout) {
        updateRow(i, "failed");
        setStatus(`[${i + 1}/${total}] ${genRes.timeout ? "Timed out" : "Generation failed"} — moving on.`);
        await sleep(2000);
        continue;
      }

      // ── Download ──────────────────────────────
      const newUrls = (genRes.newUrls || []).filter(u => !downloadedUrls.has(u));
      if (newUrls.length) {
        setStatus(`[${i + 1}/${total}] Downloading ${newUrls.length} image(s)…`);
        await downloadImages(newUrls, frame.id, frame.prompt);
        newUrls.forEach(u => downloadedUrls.add(u));
      }

      updateRow(i, "done");

      // ── Delay before next ────────────────────
      if (i < parsedFrames.length - 1 && isRunning) {
        const delaySec = randomDelay(waitMinEl.value, waitMaxEl.value) / 1000;
        await countdown(delaySec);
      }
    }
  } catch (err) {
    setStatus(`Unexpected error — ${err?.message || "unknown"}`);
  } finally {
    isRunning    = false;
    flowTabId    = null;
    runBtn.disabled = parsedFrames.length === 0;
    const done    = frameStatuses.filter(f => f.status === "done").length;
    const failed  = frameStatuses.filter(f => f.status === "failed").length;
    const stopped = frameStatuses.filter(f => f.status === "stopped").length;
    if (!statusEl.textContent.startsWith("Unexpected")) {
      setStatus(
        stopped > 0
          ? `Stopped — ${done} done, ${failed} failed, ${stopped} skipped.`
          : failed > 0
          ? `Done — ${done} succeeded, ${failed} failed.`
          : `✓ All ${done} frame(s) generated and downloaded.`
      );
    }
  }
}

// ─────────────────────────────────────────────
// Button listeners
// ─────────────────────────────────────────────
runBtn.addEventListener("click",  () => startQueue());
stopBtn.addEventListener("click", async () => {
  isRunning = false;
  if (flowTabId) {
    await send(flowTabId, { type: "ZAPI_STOP" });
    flowTabId = null;
  }
  setStatus("Stopped.");
  runBtn.disabled = parsedFrames.length === 0;
});

// ─────────────────────────────────────────────
// Persist settings
// ─────────────────────────────────────────────
chrome.storage.local.get(
  ["zapiFolder", "zapiWaitMin", "zapiWaitMax"],
  (r) => {
    if (r.zapiFolder)  downloadFolderEl.value = r.zapiFolder;
    if (r.zapiWaitMin) waitMinEl.value         = r.zapiWaitMin;
    if (r.zapiWaitMax) waitMaxEl.value         = r.zapiWaitMax;
  }
);

function persist() {
  chrome.storage.local.set({
    zapiFolder:  downloadFolderEl.value,
    zapiWaitMin: waitMinEl.value,
    zapiWaitMax: waitMaxEl.value,
  });
}

downloadFolderEl.addEventListener("change", persist);
waitMinEl.addEventListener("change", persist);
waitMaxEl.addEventListener("change", persist);