const DEFAULTS = { enabled: true };

const enabledInput = document.getElementById("enabled");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("statusText");

function paint(settings, onOlx) {
  enabledInput.checked = settings.enabled;
  statusEl.classList.remove("is-on", "is-away");

  if (!onOlx) {
    statusEl.classList.add("is-away");
    statusText.textContent = "Open OLX.ua to apply the theme";
    return;
  }

  if (settings.enabled) {
    statusEl.classList.add("is-on");
    statusText.textContent = "Dark theme is active on this tab";
  } else {
    statusText.textContent = "Dark theme is paused";
  }
}

async function isOlxTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  return /:\/\/([^/]*\.)?olx\.ua(\/|$)/i.test(url);
}

async function readSettings() {
  return chrome.storage.sync.get(DEFAULTS);
}

async function writeSettings(patch) {
  const current = await readSettings();
  await chrome.storage.sync.set({ ...current, ...patch });
  paint({ ...current, ...patch }, await isOlxTab());
}

enabledInput.addEventListener("change", () => {
  writeSettings({ enabled: enabledInput.checked });
});

(async () => {
  paint(await readSettings(), await isOlxTab());
})();
