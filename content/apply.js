(() => {
  const ATTR = "data-olx-dark";
  const CACHE_KEY = "olx-dark-ext";
  const DEFAULTS = { enabled: true };

  function readCache() {
    try {
      return localStorage.getItem(CACHE_KEY);
    } catch {
      return null;
    }
  }

  function writeCache(settings) {
    try {
      localStorage.setItem(CACHE_KEY, settings.enabled ? "on" : "off");
    } catch {
      /* page may block storage */
    }
  }

  function setThemeColor(enabled) {
    if (!document.head) return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", enabled ? "#1a1c1d" : "#f9f9f9");
  }

  const RGB_RE = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/;

  function parseRgb(color) {
    const match = RGB_RE.exec(color || "");
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  function isBrandTeal(color) {
    const rgb = parseRgb(color);
    if (!rgb) return false;
    const [red, green, blue] = rgb;
    return (
      red <= 10 &&
      green >= 28 &&
      green <= 62 &&
      blue >= 32 &&
      blue <= 70 &&
      Math.abs(green - blue) <= 18
    );
  }

  function isNearWhite(color) {
    const rgb = parseRgb(color);
    if (!rgb) return false;
    return rgb[0] >= 240 && rgb[1] >= 240 && rgb[2] >= 240;
  }

  function tagSurfaces() {
    const enabled = document.documentElement.hasAttribute(ATTR);
    if (!enabled) {
      document.querySelectorAll("[data-olx-accent], [data-olx-panel]").forEach((node) => {
        node.removeAttribute("data-olx-accent");
        node.removeAttribute("data-olx-panel");
      });
      return;
    }

    document
      .querySelectorAll("button, a, [role='button'], input[type='submit']")
      .forEach((node) => {
        if (node.closest("header") || node.hasAttribute("data-olx-accent")) return;
        if (isBrandTeal(getComputedStyle(node).backgroundColor)) {
          node.setAttribute("data-olx-accent", "");
        }
      });

    document.querySelectorAll("header *").forEach((node) => {
      if (node.hasAttribute("data-olx-panel")) return;
      const style = getComputedStyle(node);
      if (style.position !== "absolute" && style.position !== "fixed") return;
      if (node.getBoundingClientRect().height < 80) return;
      if (isNearWhite(style.backgroundColor)) {
        node.setAttribute("data-olx-panel", "");
      }
    });
  }

  let surfaceFrame = 0;
  function scheduleTagSurfaces() {
    if (surfaceFrame) return;
    surfaceFrame = requestAnimationFrame(() => {
      surfaceFrame = 0;
      tagSurfaces();
    });
  }

  const observer = new MutationObserver(scheduleTagSurfaces);

  function watchSurfaces(enabled) {
    observer.disconnect();
    if (!enabled) {
      tagSurfaces();
      return;
    }
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scheduleTagSurfaces();
  }

  function apply(settings) {
    const root = document.documentElement;
    if (!root) return;

    if (settings.enabled) {
      root.setAttribute(ATTR, "on");
    } else {
      root.removeAttribute(ATTR);
    }

    writeCache(settings);
    setThemeColor(settings.enabled);
    watchSurfaces(settings.enabled);
  }

  const cached = readCache();
  if (cached !== "off") {
    document.documentElement.setAttribute(ATTR, "on");
  }

  chrome.storage.sync.get(DEFAULTS, apply);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.enabled) return;
    chrome.storage.sync.get(DEFAULTS, apply);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      chrome.storage.sync.get(DEFAULTS, apply);
    });
  }
})();
