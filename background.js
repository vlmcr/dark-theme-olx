const DEFAULTS = { enabled: true };

function badgeColor(enabled) {
  return enabled ? "#23E5DB" : "#5C6162";
}

async function syncBadge() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  await chrome.action.setBadgeText({ text: settings.enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor(settings.enabled) });
  try {
    await chrome.action.setBadgeTextColor({
      color: settings.enabled ? "#002F34" : "#E4E6E6",
    });
  } catch {
    /* older Chromium builds */
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  if (current.enabled === undefined) {
    await chrome.storage.sync.set(DEFAULTS);
  }
  await chrome.storage.sync.remove("intensity");
  await syncBadge();
});

chrome.runtime.onStartup.addListener(syncBadge);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) {
    syncBadge();
  }
});

syncBadge();
