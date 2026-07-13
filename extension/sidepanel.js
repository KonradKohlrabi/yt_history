const CHAR_DELAY_MS = 0;

// Auto-download is always on, serial numbers always off — no UI toggle needed
const AUTO_DOWNLOAD = true;
const INCLUDE_SERIAL = false;

// ─────────────────────────────────────────────
// Update banner
// ─────────────────────────────────────────────
const LATEST_VERSION = "1.2.3"; // ← bump this each release

const promptsEl = document.getElementById("prompts");
const waitMinEl = document.getElementById("waitMin");
const waitMaxEl = document.getElementById("waitMax");
const statusEl = document.getElementById("status");
const appEl = document.getElementById("app");
const versionTagEl = document.getElementById("versionTag");
const txtUploadEl = document.getElementById("txtUpload");
const runBtn = document.getElementById("run");
const continueBtn = document.getElementById("continueBtn");
const stopBtn = document.getElementById("stop");
const connBar = document.getElementById("connBar");
const connDot = document.getElementById("connDot");
const connMsg = document.getElementById("connMsg");
const connLink = document.getElementById("connLink");
const helpDialog = document.getElementById("helpDialog");
const helpOpen = document.getElementById("helpOpen");
const helpClose = document.getElementById("helpClose");
const helpBodyEl = document.getElementById("helpBody");
const listSection = document.getElementById("listSection");
const promptListEl = document.getElementById("promptList");
const listCountEl = document.getElementById("listCount");
const downloadFolderEl = document.getElementById("downloadFolder");
const langSelectEl = document.getElementById("langSelect");
const openDlSettings = document.getElementById("openDlSettings");

// ─────────────────────────────────────────────
// Version from manifest
const { version } = chrome.runtime.getManifest();
if (versionTagEl) versionTagEl.textContent = `v${version}`;

// Show update banner if installed version is behind LATEST_VERSION
(function checkUpdateBanner() {
  const updateBar = document.getElementById("updateBar");
  const updateDismiss = document.getElementById("updateDismiss");
  if (!updateBar) return;

  function versionIsOlder(installed, latest) {
    const a = installed.split(".").map(Number);
    const b = latest.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((a[i] || 0) < (b[i] || 0)) return true;
      if ((a[i] || 0) > (b[i] || 0)) return false;
    }
    return false;
  }

  if (!versionIsOlder(version, LATEST_VERSION)) return;

  chrome.storage.local.get("zapUpdateDismissed", (r) => {
    if (r.zapUpdateDismissed === LATEST_VERSION) return;
    updateBar.style.display = "";
  });

  updateDismiss.addEventListener("click", () => {
    updateBar.style.display = "none";
    chrome.storage.local.set({ zapUpdateDismissed: LATEST_VERSION });
  });
})();

// ─────────────────────────────────────────────
// TXT file upload
// ─────────────────────────────────────────────
if (txtUploadEl) {
  txtUploadEl.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result || "";
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      promptsEl.value = lines.join("\n");
      rebuildList();
      persist();
    };
    reader.readAsText(file);
    txtUploadEl.value = "";
  });
}

// ─────────────────────────────────────────────
// i18n strings
// ─────────────────────────────────────────────
const LANGS = {
  en: {
    promptQueueLabel: "Prompt queue",
    promptQueueHint: "One prompt per line · list updates as you type",
    queueTitle: "Queue",
    promptCount: (n) => `${n} prompt${n === 1 ? "" : "s"}`,
    delayFrom: "Random delay from",
    delayTo: "To",
    delaySec: "sec",
    downloadFolderLabel: "Download folder",
    autoDownload: "Auto-save",
    checkPage: "Check page",
    runQueue: "Start Generation",
    stop: "Stop",
    statusPending: "Pending",
    statusGenerating: "Generating…",
    statusDone: "Done ✓",
    statusFailed: "Failed ✗",
    statusStopped: "Skipped",
    helpTitle: "Getting Started",
    helpClose: "Got it",
    helpDelayTitle: "Random delay",
    helpDelayBody: "After each generation, ZAPI FLOW waits a random number of seconds within your set range before starting the next prompt.",
    helpBody: `<p class="lede">① Go to your Google Flow project:<br/> <a class="path-link" href="https://labs.google/fx/tools/flow/project/" target="_blank"> https://labs.google/fx/tools/flow/project/ </a> </p> <p class="lede">② Enter your prompts below — one per line. Your queue updates as you type.</p> <p class="lede">③ Click <strong>Run queue</strong>. ZAPI FLOW generates each image one at a time and downloads it automatically.</p>`,
    msgStarting: (n) => `Starting ${n} prompt(s)…`,
    msgSubmitting: (i,n) => `Submitting prompt ${i} of ${n}…`,
    msgWaiting: (i) => `Prompt ${i} submitted — waiting for generation…`,
    msgDownloading: (i) => `Prompt ${i} done ✓ — downloading image…`,
    msgDone: (i) => `Next prompt in ${i}s…`,
    msgAllDone: (n) => `✓ All ${n} prompt(s) generated.`,
    msgStopped: "Stopped.",
    msgNoTab: "No active tab.",
    msgNotReady: "Content script not ready. Open a Flow project tab and refresh.",
    msgError: (i,e) => `Error on prompt ${i}: ${e}`,
    msgAddPrompt: "Add at least one prompt.",
  },
  vi: {
    promptQueueLabel: "Hàng đợi prompt",
    promptQueueHint: "Mỗi dòng một prompt · danh sách cập nhật khi bạn gõ",
    queueTitle: "Hàng đợi",
    promptCount: (n) => `${n} prompt`,
    delayFrom: "Độ trễ ngẫu nhiên từ",
    delayTo: "đến",
    delaySec: "giây",
    downloadFolderLabel: "Thư mục tải xuống",
    autoDownload: "Tự động lưu",
    checkPage: "Kiểm tra trang",
    runQueue: "Chạy hàng đợi",
    stop: "Dừng",
    statusPending: "Chờ",
    statusGenerating: "Đang tạo…",
    statusDone: "Hoàn thành ✓",
    statusFailed: "Lỗi ✗",
    statusStopped: "Đã bỏ qua",
    helpTitle: "Hướng dẫn sử dụng",
    helpClose: "Đã hiểu",
    helpDelayTitle: "Độ trễ ngẫu nhiên",
    helpDelayBody: "Sau mỗi lần tạo ảnh, ZAPI FLOW chờ một khoảng thời gian ngẫu nhiên trong phạm vi bạn đặt trước khi bắt đầu prompt tiếp theo.",
    helpBody: `<p class="lede">① Truy cập dự án Google Flow của bạn:<br/> <a class="path-link" href="https://labs.google/fx/tools/flow/project/" target="_blank"> https://labs.google/fx/tools/flow/project/ </a> </p> <p class="lede">② Nhập prompt bên dưới — mỗi dòng một cái.</p> <p class="lede">③ Nhấn <strong>Chạy hàng đợi</strong>.</p>`,
    msgStarting: (n) => `Đang bắt đầu ${n} prompt…`,
    msgSubmitting: (i,n) => `Đang gửi prompt ${i}/${n}…`,
    msgWaiting: (i) => `Đã gửi prompt ${i} — đang chờ tạo ảnh…`,
    msgDownloading: (i) => `Prompt ${i} xong ✓ — đang tải xuống…`,
    msgDone: (i) => `Prompt tiếp theo sau ${i} giây…`,
    msgAllDone: (n) => `✓ Đã hoàn thành ${n} prompt.`,
    msgStopped: "Đã dừng.",
    msgNoTab: "Không có tab nào đang mở.",
    msgNotReady: "Chưa sẵn sàng. Mở trang dự án Flow và làm mới.",
    msgError: (i,e) => `Lỗi prompt ${i}: ${e}`,
    msgAddPrompt: "Hãy thêm ít nhất một prompt.",
  },
  zh: {
    promptQueueLabel: "提示词队列",
    promptQueueHint: "每行一个提示词 · 输入即更新",
    queueTitle: "队列",
    promptCount: (n) => `${n} 个提示词`,
    delayFrom: "随机延迟从",
    delayTo: "到",
    delaySec: "秒",
    downloadFolderLabel: "下载文件夹",
    autoDownload: "自动保存",
    checkPage: "检查页面",
    runQueue: "运行队列",
    stop: "停止",
    statusPending: "等待中",
    statusGenerating: "生成中…",
    statusDone: "完成 ✓",
    statusFailed: "失败 ✗",
    statusStopped: "已跳过",
    helpTitle: "使用指南",
    helpClose: "明白了",
    helpDelayTitle: "随机延迟",
    helpDelayBody: "每次生成完成后，ZAPI FLOW 会在您设定的范围内随机等待一段时间，然后开始下一个提示词。",
    helpBody: `<p class="lede">① 前往您的 Google Flow 项目。</p> <p class="lede">② 在下方输入提示词。</p> <p class="lede">③ 点击<strong>运行队列</strong>。</p>`,
    msgStarting: (n) => `开始处理 ${n} 个提示词…`,
    msgSubmitting: (i,n) => `正在提交第 ${i}/${n} 个提示词…`,
    msgWaiting: (i) => `第 ${i} 个已提交 — 等待生成…`,
    msgDownloading: (i) => `第 ${i} 个完成 ✓ — 正在下载…`,
    msgDone: (i) => `${i} 秒后开始下一个…`,
    msgAllDone: (n) => `✓ 全部 ${n} 个提示词已完成。`,
    msgStopped: "已停止。",
    msgNoTab: "没有活动标签页。",
    msgNotReady: "内容脚本未就绪。请打开 Flow 项目页面并刷新。",
    msgError: (i,e) => `第 ${i} 个出错：${e}`,
    msgAddPrompt: "请至少添加一个提示词。",
  },
  ko: {
    promptQueueLabel: "프롬프트 큐",
    promptQueueHint: "한 줄에 하나씩",
    queueTitle: "큐",
    promptCount: (n) => `${n}개 프롬프트`,
    delayFrom: "무작위 지연",
    delayTo: "~",
    delaySec: "초",
    downloadFolderLabel: "다운로드 폴더",
    autoDownload: "자동 저장",
    checkPage: "페이지 확인",
    runQueue: "큐 실행",
    stop: "정지",
    statusPending: "대기 중",
    statusGenerating: "생성 중…",
    statusDone: "완료 ✓",
    statusFailed: "실패 ✗",
    statusStopped: "건너뜀",
    helpTitle: "시작하기",
    helpClose: "확인",
    helpDelayTitle: "무작위 지연",
    helpDelayBody: "각 생성 완료 후 ZAPI FLOW는 설정한 범위 내에서 무작위 시간 동안 대기한 후 다음 프롬프트를 시작합니다.",
    helpBody: `<p class="lede">① Google Flow 프로젝트로 이동하세요.</p> <p class="lede">② 아래에 프롬프트를 입력하세요.</p> <p class="lede">③ <strong>큐 실행</strong>을 클릭하세요.</p>`,
    msgStarting: (n) => `${n}개 프롬프트 시작 중…`,
    msgSubmitting: (i,n) => `${n}개 중 ${i}번째 제출 중…`,
    msgWaiting: (i) => `${i}번째 제출됨 — 생성 대기 중…`,
    msgDownloading: (i) => `${i}번째 완료 ✓ — 다운로드 중…`,
    msgDone: (i) => `${i}초 후 다음 프롬프트…`,
    msgAllDone: (n) => `✓ ${n}개 프롬프트 모두 완료.`,
    msgStopped: "정지됨.",
    msgNoTab: "활성 탭이 없습니다.",
    msgNotReady: "준비되지 않았습니다. Flow 프로젝트 탭을 열고 새로고침하세요.",
    msgError: (i,e) => `${i}번째 오류: ${e}`,
    msgAddPrompt: "프롬프트를 하나 이상 추가하세요.",
  },
  es: {
    promptQueueLabel: "Cola de prompts",
    promptQueueHint: "Un prompt por línea",
    queueTitle: "Cola",
    promptCount: (n) => `${n} prompt${n === 1 ? "" : "s"}`,
    delayFrom: "Demora aleatoria de",
    delayTo: "a",
    delaySec: "seg",
    downloadFolderLabel: "Carpeta de descarga",
    autoDownload: "Guardado auto",
    checkPage: "Verificar página",
    runQueue: "Ejecutar cola",
    stop: "Detener",
    statusPending: "Pendiente",
    statusGenerating: "Generando…",
    statusDone: "Listo ✓",
    statusFailed: "Error ✗",
    statusStopped: "Omitido",
    helpTitle: "Cómo empezar",
    helpClose: "Entendido",
    helpDelayTitle: "Demora aleatoria",
    helpDelayBody: "Tras cada generación, ZAPI FLOW espera un tiempo aleatorio dentro del rango configurado antes de iniciar el siguiente prompt.",
    helpBody: `<p class="lede">① Ve a tu proyecto de Google Flow.</p> <p class="lede">② Escribe tus prompts abajo.</p> <p class="lede">③ Haz clic en <strong>Ejecutar cola</strong>.</p>`,
    msgStarting: (n) => `Iniciando ${n} prompt(s)…`,
    msgSubmitting: (i,n) => `Enviando prompt ${i} de ${n}…`,
    msgWaiting: (i) => `Prompt ${i} enviado — esperando generación…`,
    msgDownloading: (i) => `Prompt ${i} listo ✓ — descargando…`,
    msgDone: (i) => `Siguiente en ${i}s…`,
    msgAllDone: (n) => `✓ ${n} prompt(s) generados.`,
    msgStopped: "Detenido.",
    msgNoTab: "No hay pestaña activa.",
    msgNotReady: "Script no listo. Abre la página del proyecto Flow y recarga.",
    msgError: (i,e) => `Error en prompt ${i}: ${e}`,
    msgAddPrompt: "Añade al menos un prompt.",
  },
  ja: {
    promptQueueLabel: "プロンプトキュー",
    promptQueueHint: "1行に1つ",
    queueTitle: "キュー",
    promptCount: (n) => `${n}件`,
    delayFrom: "ランダム遅延",
    delayTo: "〜",
    delaySec: "秒",
    downloadFolderLabel: "ダウンロードフォルダ",
    autoDownload: "自動保存",
    checkPage: "ページ確認",
    runQueue: "キュー実行",
    stop: "停止",
    statusPending: "待機中",
    statusGenerating: "生成中…",
    statusDone: "完了 ✓",
    statusFailed: "失敗 ✗",
    statusStopped: "スキップ",
    helpTitle: "はじめかた",
    helpClose: "わかった",
    helpDelayTitle: "ランダム遅延",
    helpDelayBody: "各生成が完了した後、ZAPI FLOWは設定した範囲内でランダムな秒数を待ってから次のプロンプトを開始します。",
    helpBody: `<p class="lede">① Google Flowプロジェクトへ移動。</p> <p class="lede">② プロンプトを1行ずつ入力。</p> <p class="lede">③ <strong>キュー実行</strong>をクリック。</p>`,
    msgStarting: (n) => `${n}件のプロンプトを開始…`,
    msgSubmitting: (i,n) => `プロンプト ${i}/${n} を送信中…`,
    msgWaiting: (i) => `プロンプト ${i} 送信済 — 生成を待機中…`,
    msgDownloading: (i) => `プロンプト ${i} 完了 ✓ — ダウンロード中…`,
    msgDone: (i) => `次のプロンプトまで ${i} 秒…`,
    msgAllDone: (n) => `✓ ${n}件すべて完了。`,
    msgStopped: "停止しました。",
    msgNoTab: "アクティブなタブがありません。",
    msgNotReady: "準備ができていません。Flowプロジェクトを開いて更新してください。",
    msgError: (i,e) => `プロンプト ${i} エラー: ${e}`,
    msgAddPrompt: "プロンプトを1つ以上入力してください。",
  },
};

// ─────────────────────────────────────────────
// Language / i18n
// ─────────────────────────────────────────────
let currentLang = "en";

function t(key, ...args) {
  const s = LANGS[currentLang]?.[key] ?? LANGS.en[key];
  return typeof s === "function" ? s(...args) : (s ?? key);
}

function applyLanguage() {
  const L = LANGS[currentLang] || LANGS.en;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const val = L[key];
    if (val && typeof val === "string") el.textContent = val;
  });

  if (helpBodyEl) helpBodyEl.innerHTML = L.helpBody || LANGS.en.helpBody;

  rebuildList();
}

langSelectEl.addEventListener("change", () => {
  currentLang = langSelectEl.value;
  applyLanguage();
  chrome.storage.local.set({ zapLang: currentLang });
});

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function randomWait(minMs, maxMs) {
  return minMs + Math.floor(Math.random() * Math.max(1, maxMs - minMs + 1));
}

function setStatus(text) {
  statusEl.textContent = text;
  statusIsConnError = false;
}

let flowTabId = null;
let resumeFromIdx = null;
let statusIsConnError = false;

function setInputsDisabled(disabled) {
  promptsEl.disabled = disabled;
  downloadFolderEl.disabled = disabled;
  openDlSettings.disabled = disabled;
  waitMinEl.disabled = disabled;
  waitMaxEl.disabled = disabled;
  txtUploadEl.disabled = disabled;
  if (langSelectEl) langSelectEl.disabled = disabled;
  const channelSel = document.getElementById("channelSelect");
  if (channelSel) channelSel.disabled = disabled;
  setGenControlsDisabled(disabled);
  const opacity = disabled ? "0.45" : "";
  [promptsEl, downloadFolderEl, openDlSettings, waitMinEl, waitMaxEl, txtUploadEl]
    .forEach(el => el.style.opacity = opacity);
  const uploadLabel = document.querySelector(".btn-txt-upload");
  if (uploadLabel) uploadLabel.style.opacity = opacity;
  if (langSelectEl) langSelectEl.style.opacity = opacity;
}

function showContinue(fromIndex) {
  resumeFromIdx = fromIndex;
  continueBtn.style.display = "";
  continueBtn.textContent = `▶ Continue from #${fromIndex + 1}`;
  runBtn.disabled = true;
}

function hideContinue() {
  resumeFromIdx = null;
  continueBtn.style.display = "none";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function injectContentScripts(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: "FLOW_BATCH_PING" });
    if (ping?.ok) { checkConnection(); return; }
  } catch {}

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["selectors.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await sleep(800);
    checkConnection();
  } catch (e) {}
}

async function sendToFlowTab(message, { retries = 5, retryDelayMs = 3000, silent = false } = {}) {
  const tabId = flowTabId || (await getActiveTab())?.id;
  if (!tabId) { if (!silent) setStatus(t("msgNoTab")); return null; }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, message);
      if (statusIsConnError && !isRunning) {
        setStatus("");
        statusIsConnError = false;
      }
      checkConnection();
      return result;
    } catch {
      if (attempt === retries) {
        if (!isRunning && !silent) {
          setStatus(t("msgNotReady"));
          statusIsConnError = true;
        }
        return null;
      }
      if (!isRunning) {
        if (!connBar.classList.contains("is-connected")) {
          setStatus(`Connecting… (${attempt + 1}/${retries})`);
          statusIsConnError = true;
        }
        await injectContentScripts(tabId);
      }
      await sleep(retryDelayMs);
    }
  }
}

// ─────────────────────────────────────────────
// Help dialog
// ─────────────────────────────────────────────
if (helpOpen && helpDialog?.showModal) helpOpen.addEventListener("click", () => helpDialog.showModal());
if (helpClose && helpDialog?.close) helpClose.addEventListener("click", () => helpDialog.close());

// ─────────────────────────────────────────────
// Auto-download settings link
// ─────────────────────────────────────────────
openDlSettings?.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://settings/downloads" });
});

// ─────────────────────────────────────────────
// html escape
// ─────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────
// Prompt list
// ─────────────────────────────────────────────
let promptStatuses = [];
let isRunning = false;

function statusLabel(s) {
  return t("status" + s.charAt(0).toUpperCase() + s.slice(1));
}

function parsePrompts() {
  return promptsEl.value.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
}

function rebuildList() {
  const lines = parsePrompts();
  if (!lines.length) { listSection.style.display = "none"; return; }

  const prev = promptStatuses;
  promptStatuses = lines.map((text, i) => ({
    text,
    status: (prev[i] && prev[i].text === text) ? prev[i].status : "pending",
  }));

  renderList();
  listSection.style.display = "";
  listCountEl.textContent = t("promptCount", lines.length);
}

function renderList() {
  promptListEl.innerHTML = "";
  promptStatuses.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "prompt-item" + statusClass(item.status);
    row.id = `pr-${i}`;
    row.innerHTML =
      `<span class="prompt-num">${i + 1}</span>` +
      `<span class="prompt-text" title="${escHtml(item.text)}">${escHtml(item.text)}</span>` +
      `<span class="prompt-status s-${item.status}">${statusLabel(item.status)}</span>`;
    promptListEl.appendChild(row);
  });
}

function statusClass(s) {
  return s === "generating" ? " is-running"
    : s === "done" ? " is-done"
    : s === "failed" ? " is-failed"
    : s === "stopped" ? " is-stopped" : "";
}

function updateStatus(index, status) {
  if (index < 0 || index >= promptStatuses.length) return;
  promptStatuses[index].status = status;
  const row = document.getElementById(`pr-${index}`);
  if (!row) return;
  row.className = "prompt-item" + statusClass(status);
  const badge = row.querySelector(".prompt-status");
  if (badge) { badge.className = `prompt-status s-${status}`; badge.textContent = statusLabel(status); }
  if (status === "generating") row.scrollIntoView({ block: "nearest" });
}

promptsEl.addEventListener("input", () => {
  if (!isRunning) {
    rebuildList();
    hideContinue();
    const hasPrompts = parsePrompts().length > 0;
    runBtn.disabled = !connBar.classList.contains("is-connected") || !hasPrompts;
  }
});

// ─────────────────────────────────────────────
// Countdown
// ─────────────────────────────────────────────
async function countdown(seconds) {
  for (let s = seconds; s > 0 && isRunning; s--) {
    setStatus(t("msgDone", s));
    await sleep(1000);
  }
}

// ─────────────────────────────────────────────
// Download
// ─────────────────────────────────────────────
function safePromptName(text) {
  const name = text
    .slice(0, 30)
    .replace(/:/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^\w\[\]-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 25);
  return name || "image";
}

function fileExtFromUrl(url) {
  try {
    const ext = new URL(url).pathname.split(".").pop().toLowerCase();
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return ext;
  } catch {}
  return "jpg";
}

function safeFolderName(raw) {
  const cleaned = (raw || "")
    .replace(/\\/g, "/")
    .split("/")
    .map(part => part.trim())
    .filter(part => part && part !== "." && part !== "..")
    .map(part => part.replace(/[:*?"<>|]/g, "-"))
    .join("/");
  return cleaned || "zapi-img";
}

async function downloadGeneratedImages(newUrls, serialNum, promptText) {
  const folder = safeFolderName(downloadFolderEl.value);
  const name = safePromptName(promptText);

  for (let j = 0; j < newUrls.length; j++) {
    let url = newUrls[j];
    if (!url.startsWith("http")) url = "https://labs.google" + url;
    const suffix = newUrls.length > 1 ? `_${j + 1}` : "";
    const ext = fileExtFromUrl(url);
    const filename = `${folder}/${name}${suffix}.${ext}`;
    try { await chrome.downloads.download({ url, filename, saveAs: false }); }
    catch (e) { console.warn("[ZAPI FLOW] Download failed:", e); }
  }
}

// ─────────────────────────────────────────────
// Auto connection check
// ─────────────────────────────────────────────
const FLOW_BASE = "https://labs.google/fx/tools/flow";
const FLOW_PROJECT_RE = /labs\.google\/fx(?:\/[a-z]{2,}(?:-[a-zA-Z]{2,})?)?\/tools\/flow\/project\//;
const FLOW_BASE_RE = /labs\.google\/fx(?:\/[a-z]{2,}(?:-[a-zA-Z]{2,})?)?\/tools\/flow\//;

function setConnected() {
  connBar.className = "conn-bar is-connected";
  connMsg.textContent = "Connected to Google Flow project";
  connLink.style.display = "none";
  if (!isRunning) runBtn.disabled = parsePrompts().length === 0;
}

function setOpenProject() {
  connBar.className = "conn-bar is-warn";
  connMsg.textContent = "Open a project to continue";
  connLink.style.display = "none";
  if (!isRunning) runBtn.disabled = true;
}

function setGoToFlow() {
  connBar.className = "conn-bar is-off";
  connMsg.textContent = "Not on Google Flow";
  connLink.style.display = "";
  connLink.textContent = "Go to Google Flow →";
  connLink.href = FLOW_BASE;
  if (!isRunning) runBtn.disabled = true;
}

async function checkConnection() {
  const tab = await getActiveTab();
  const url = tab?.url || "";
  if (FLOW_PROJECT_RE.test(url)) {
    setConnected();
  } else if (FLOW_BASE_RE.test(url)) {
    setOpenProject();
  } else {
    setGoToFlow();
  }
}

checkConnection();

chrome.tabs.onActivated.addListener(() => checkConnection());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id === tabId) checkConnection();
    });
  }
});

// ─────────────────────────────────────────────
// Run queue
// ─────────────────────────────────────────────
const sessionDownloadedUrls = new Set();

async function startQueue(startIndex = 0) {
  const lines = parsePrompts();
  if (!lines.length) { setStatus(t("msgAddPrompt")); return; }

  if (startIndex === 0) sessionDownloadedUrls.clear();

  let waitMinMs = Math.round(Number(waitMinEl.value) * 1000) || 0;
  let waitMaxMs = Math.round(Number(waitMaxEl.value) * 1000) || 0;
  if (waitMaxMs < waitMinMs) [waitMinMs, waitMaxMs] = [waitMaxMs, waitMinMs];

  const activeTab = await getActiveTab();
  if (!activeTab?.id) { setStatus(t("msgNoTab")); return; }
  flowTabId = activeTab.id;

  await injectContentScripts(activeTab.id);

  if (startIndex === 0) {
    promptStatuses = lines.map(text => ({ text, status: "pending" }));
  } else {
    for (let j = startIndex; j < lines.length; j++) {
      if (promptStatuses[j]) promptStatuses[j].status = "pending";
    }
  }
  renderList();
  listSection.style.display = "";

  isRunning = true;
  runBtn.disabled = true;
  hideContinue();
  setInputsDisabled(true);
  appEl.classList.add("is-running");
  let completed = 0;
  setStatus(t("msgStarting", lines.length));

  try {
    if (isBeta() && genSettings.sync) {
      setStatus("Applying generation settings in Flow…");
      const applyRes = await sendToFlowTab({
        type: "FLOW_APPLY_GEN_SETTINGS",
        settings: {
          mode: genSettings.mode,
          videoType: genSettings.videoType,
          aspect: genSettings.mode === "video" ? genSettings.aspectVideo : genSettings.aspectImage,
          outputs: genSettings.mode === "video" ? genSettings.outputsVideo : genSettings.outputsImage,
          model: genSettings.mode === "video" ? genSettings.modelVideo : genSettings.modelImage,
          duration: genSettings.duration,
        },
      });
      const criticalMiss = !applyRes ||
        applyRes.missed?.includes("popup") ||
        applyRes.missed?.includes("mode");
      if (criticalMiss) {
        const detail = !applyRes
          ? " — no response from the page, refresh the Flow tab and try again"
          : applyRes.reason
            ? ` — ${applyRes.reason}`
            : ` — couldn't set: ${applyRes.missed.join(", ")}`;
        setStatus(`⚠ Couldn't apply generation settings${detail}. Set them manually in Flow or turn off Generation Settings, then start again.`);
        runBtn.disabled = parsePrompts().length === 0;
        return;
      }
      if (!applyRes.ok) {
        setStatus(`⚠ Applied with gaps — couldn't set: ${applyRes.missed.join(", ")}. Continuing with Flow's current value for those.`);
        await sleep(2000);
      } else if (applyRes.chip) {
        setStatus(`Settings applied ✓ (${applyRes.chip})`);
      }
    }

    const genTimeoutMs = isBeta() && genSettings.sync && genSettings.mode === "video" ? 600000 : 300000;

    for (let i = startIndex; i < lines.length; i++) {
      if (!isRunning) {
        for (let j = i; j < lines.length; j++) updateStatus(j, "stopped");
        showContinue(i);
        break;
      }

      updateStatus(i, "generating");
      let promptDone = false;

      setStatus(t("msgSubmitting", i + 1, lines.length));
      const countRes         = await sendToFlowTab({ type: "FLOW_GET_TILE_COUNT" });
      const beforeCount      = countRes?.count      ?? 0;
      const beforeVideoCount = countRes?.videoCount ?? 0;
      const beforeFailCount  = countRes?.failCount  ?? 0;
      const beforeSrcs       = countRes?.srcs       ?? [];
      const beforeVideoSrcs  = countRes?.videoSrcs  ?? [];

      for (let attempt = 0; attempt <= 1; attempt++) {
        if (!isRunning) break;

        if (attempt === 1) {
          for (let s = 3; s > 0 && isRunning; s--) {
            setStatus(`Prompt ${i + 1} failed — retrying in ${s}s…`);
            await sleep(1000);
          }
          if (!isRunning) break;
          updateStatus(i, "generating");
          setStatus(`Prompt ${i + 1} — retrying…`);
        }

        const submitRes = await sendToFlowTab({
            type: "FLOW_BATCH_RUN",
            prompts: [lines[i]],
            waitMinMs: 0, waitMaxMs: 0,
            charDelayMs: CHAR_DELAY_MS,
            refAssetNames: [], // content.js still expects this field — always empty now
        });

        if (!isRunning) break;

        if (!submitRes || submitRes.error) {
          if (attempt < 1) continue;
          updateStatus(i, "stopped");
          setStatus(t("msgError", i + 1, submitRes?.error || "no response"));
          for (let j = i + 1; j < lines.length; j++) updateStatus(j, "stopped");
          isRunning = false;
          break;
        }

        setStatus(t("msgWaiting", i + 1));
        const genRes = await sendToFlowTab({ type: "FLOW_WAIT_GENERATION", beforeCount, beforeVideoCount, beforeFailCount, beforeSrcs, beforeVideoSrcs, timeoutMs: genTimeoutMs });

        if (!isRunning) break;

        if (!genRes) {
          if (attempt < 1) continue;
          updateStatus(i, "failed");
          setStatus(`Prompt ${i + 1} — connection lost mid-generation. Moving to next.`);
          promptDone = true;
          break;
        }

        if (genRes?.failed) {
          if (attempt < 1) continue;
          updateStatus(i, "failed");
          setStatus(`Prompt ${i + 1} failed after retry — moving to next.`);
          promptDone = true;
          break;
        }

        if (genRes?.timeout) {
          updateStatus(i, "failed");
          setStatus(`Prompt ${i + 1} timed out — moving to next.`);
          promptDone = true;
          break;
        }

        const newUrls = (genRes?.newUrls || []).filter(url => !sessionDownloadedUrls.has(url));
        if (newUrls.length > 0) {
          setStatus(t("msgDownloading", i + 1));
          if (AUTO_DOWNLOAD) {
            downloadGeneratedImages(newUrls, i + 1, lines[i]);
          }
          newUrls.forEach(url => sessionDownloadedUrls.add(url));
        }

        updateStatus(i, "done");
        completed++;
        promptDone = true;
        break;
      }

      if (i < lines.length - 1 && isRunning) {
        const pause = randomWait(waitMinMs, waitMaxMs);
        await countdown(Math.round(pause / 1000));
      }
    }

    const failedCount = promptStatuses.filter(p => p.status === "failed").length;
    const stoppedCount = promptStatuses.filter(p => p.status === "stopped").length;

    if (stoppedCount > 0) {
      const firstStopped = promptStatuses.findIndex(p => p.status === "stopped");
      showContinue(firstStopped);
      runBtn.disabled = true;
      const failedPart = failedCount > 0 ? `, ${failedCount} failed` : "";
      setStatus(`Stopped — ${completed} done${failedPart}, ${stoppedCount} skipped.`);
    } else {
      hideContinue();
      runBtn.disabled = parsePrompts().length === 0;
      if (failedCount > 0) {
        setStatus(`Done — ${completed} succeeded, ${failedCount} failed.`);
      } else {
        setStatus(t("msgAllDone", completed));
      }
    }
  } catch (err) {
    setStatus(`Queue stopped unexpectedly — ${err?.message || "unknown error"}`);
    runBtn.disabled = parsePrompts().length === 0;
  } finally {
    isRunning = false;
    flowTabId = null;
    setInputsDisabled(false);
    appEl.classList.remove("is-running");
  }
}



runBtn.addEventListener("click", () => startQueue(0));

// ─────────────────────────────────────────────
// Continue
// ─────────────────────────────────────────────
continueBtn.addEventListener("click", () => {
  if (resumeFromIdx !== null) startQueue(resumeFromIdx);
});

// ─────────────────────────────────────────────
// Stop
// ─────────────────────────────────────────────
stopBtn.addEventListener("click", async () => {
  isRunning = false;
  await sendToFlowTab({ type: "FLOW_BATCH_STOP" });
  flowTabId = null;
  setStatus(t("msgStopped"));
  setInputsDisabled(false);
  appEl.classList.remove("is-running");
});

// ─────────────────────────────────────────────
// Persist / restore
// ─────────────────────────────────────────────
chrome.storage.local.get(
  ["flowBatchWaitMin", "flowBatchWaitMax", "zapLang", "flowBatchFolder"],
  (r) => {
    if (r.flowBatchWaitMin != null) waitMinEl.value = String(r.flowBatchWaitMin);
    if (r.flowBatchWaitMax != null) waitMaxEl.value = String(r.flowBatchWaitMax);
    downloadFolderEl.value = r.flowBatchFolder || "zapi-img";
    if (r.zapLang) {
      currentLang = r.zapLang;
      langSelectEl.value = currentLang;
    }
    applyLanguage();
  }
);

function persist() {
  chrome.storage.local.set({
    flowBatchWaitMin: waitMinEl.value,
    flowBatchWaitMax: waitMaxEl.value,
    flowBatchFolder: downloadFolderEl.value,
  });
}
waitMinEl.addEventListener("change", persist);
waitMaxEl.addEventListener("change", persist);
downloadFolderEl.addEventListener("change", persist);

// ─────────────────────────────────────────────
// Generation Settings (auto-apply in Flow)
// ─────────────────────────────────────────────
const genSyncToggle = document.getElementById("genSyncToggle");
const genBody = document.getElementById("genBody");
const genImageBlock = document.getElementById("genImageBlock");
const genVideoBlock = document.getElementById("genVideoBlock");
const genModelImageEl = document.getElementById("genModelImage");
const genModelVideoEl = document.getElementById("genModelVideo");

const genSettings = {
  sync: false,
  mode: "image",
  videoType: "Frames",
  aspectImage: "16:9",
  aspectVideo: "16:9",
  outputsImage: "1x",
  outputsVideo: "1x",
  modelImage: "",
  modelVideo: "",
  duration: "6s",
};

function persistGenSettings() {
  chrome.storage.local.set({ zapGenSettings: genSettings });
}

function initSegGroup(groupId, key, onChange) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn || btn.disabled) return;
    group.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    genSettings[key] = btn.dataset.val;
    persistGenSettings();
    if (onChange) onChange(btn.dataset.val);
  });
}

function setSegActive(groupId, val) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll(".seg-btn").forEach(b =>
    b.classList.toggle("is-active", b.dataset.val === val));
}

function refreshGenVisibility() {
  genBody.style.display = genSettings.sync ? "" : "none";
  genImageBlock.style.display = genSettings.mode === "image" ? "" : "none";
  genVideoBlock.style.display = genSettings.mode === "video" ? "" : "none";
}

initSegGroup("genModeGroup", "mode", refreshGenVisibility);
initSegGroup("genVideoTypeGroup", "videoType");
initSegGroup("genAspectImageGroup", "aspectImage");
initSegGroup("genAspectVideoGroup", "aspectVideo");
initSegGroup("genOutputsImageGroup", "outputsImage");
initSegGroup("genOutputsVideoGroup", "outputsVideo");
initSegGroup("genDurationGroup", "duration");

genSyncToggle.addEventListener("change", () => {
  genSettings.sync = genSyncToggle.checked;
  persistGenSettings();
  refreshGenVisibility();
});

genModelImageEl.addEventListener("change", () => {
  genSettings.modelImage = genModelImageEl.value;
  persistGenSettings();
});

genModelVideoEl.addEventListener("change", () => {
  genSettings.modelVideo = genModelVideoEl.value;
  persistGenSettings();
});

chrome.storage.local.get("zapGenSettings", (r) => {
  if (r.zapGenSettings && typeof r.zapGenSettings === "object") {
    Object.assign(genSettings, r.zapGenSettings);
  }
  genSyncToggle.checked = genSettings.sync;
  genModelImageEl.value = genSettings.modelImage;
  genModelVideoEl.value = genSettings.modelVideo;
  if (genModelImageEl.value !== genSettings.modelImage) { genSettings.modelImage = ""; genModelImageEl.value = ""; }
  if (genModelVideoEl.value !== genSettings.modelVideo) { genSettings.modelVideo = ""; genModelVideoEl.value = ""; }
  setSegActive("genModeGroup", genSettings.mode);
  setSegActive("genVideoTypeGroup", genSettings.videoType);
  setSegActive("genAspectImageGroup", genSettings.aspectImage);
  setSegActive("genAspectVideoGroup", genSettings.aspectVideo);
  setSegActive("genOutputsImageGroup", genSettings.outputsImage);
  setSegActive("genOutputsVideoGroup", genSettings.outputsVideo);
  setSegActive("genDurationGroup", genSettings.duration);
  refreshGenVisibility();
});

function setGenControlsDisabled(disabled) {
  genSyncToggle.disabled = disabled;
  genModelImageEl.disabled = disabled;
  genModelVideoEl.disabled = disabled;
  document.querySelectorAll("#genBody .seg-btn").forEach(b => b.disabled = disabled);
  genBody.style.opacity = disabled ? "0.45" : "";
}

// ─────────────────────────────────────────────
// Version channel
// ─────────────────────────────────────────────
const channelSelect = document.getElementById("channelSelect");
const genCardEl = document.getElementById("genCard");
const CHANNELS = ["stable", "beta-settings"];
let zapChannel = "stable";

function isBeta() { return zapChannel === "beta-settings"; }

function channelTag() {
  return isBeta() ? "v1.2.4-beta" : `v${version}`;
}

function applyChannel() {
  if (genCardEl) genCardEl.style.display = isBeta() ? "" : "none";
  if (versionTagEl) versionTagEl.textContent = channelTag();
}

channelSelect?.addEventListener("change", () => {
  zapChannel = CHANNELS.includes(channelSelect.value) ? channelSelect.value : "stable";
  chrome.storage.local.set({ zapChannel });
  applyChannel();
});

chrome.storage.local.get("zapChannel", (r) => {
  const stored = r.zapChannel === "beta" ? "beta-settings"
    : r.zapChannel === "beta-battery" ? "stable"
    : r.zapChannel;
  zapChannel = CHANNELS.includes(stored) ? stored : "stable";
  if (channelSelect) channelSelect.value = zapChannel;
  applyChannel();
});

