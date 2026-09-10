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

  function isBrandCyan(color) {
    const rgb = parseRgb(color);
    if (!rgb) return false;
    const [red, green, blue] = rgb;
    return green >= 180 && blue >= 160 && red <= 80 && green - red >= 80;
  }

  function isBrandAccent(color) {
    return isBrandTeal(color) || isBrandCyan(color);
  }

  function isNearWhite(color) {
    const rgb = parseRgb(color);
    if (!rgb) return false;
    return rgb[0] >= 240 && rgb[1] >= 240 && rgb[2] >= 240;
  }

  const AD_IFRAME_RE =
    /googleads|googlesyndication|doubleclick|googletag|safeframe|adnxs|criteo|taboola|pubmatic|adservice|adsystem/i;

  function isListingCard(node) {
    const box = node.closest("article, li, [data-cy='l-card']");
    if (!box) return false;
    return Boolean(box.querySelector("a[href*='/d/']") && box.querySelector("img"));
  }

  function markAd(node) {
    if (!node || node.closest("[data-olx-ad]") || isListingCard(node)) return;
    const box = node.closest("aside, section, article, ins") || node;
    box.setAttribute("data-olx-ad", "");
  }

  function tagAds() {
    document
      .querySelectorAll(
        "iframe, ins.adsbygoogle, [data-google-query-id], [id^='google_ads'], [id*='div-gpt-ad']",
      )
      .forEach((node) => {
        if (node.tagName === "IFRAME") {
          const src = `${node.src || ""} ${node.id || ""} ${node.name || ""} ${
            node.getAttribute("data-src") || ""
          }`;
          if (!AD_IFRAME_RE.test(src)) return;
        }
        markAd(node);
      });

    document.querySelectorAll("span, p, small").forEach((el) => {
      if (el.childElementCount || el.closest("[data-olx-ad]")) return;
      if ((el.textContent || "").trim() !== "Реклама") return;
      markAd(el.parentElement || el);
    });
  }

  function tagSurfaces() {
    const enabled = document.documentElement.hasAttribute(ATTR);
    if (!enabled) {
      document
        .querySelectorAll("[data-olx-accent], [data-olx-cta], [data-olx-panel], [data-olx-ad]")
        .forEach((node) => {
          node.removeAttribute("data-olx-accent");
          node.removeAttribute("data-olx-cta");
          node.removeAttribute("data-olx-panel");
          node.removeAttribute("data-olx-ad");
        });
      return;
    }

    document
      .querySelectorAll("button, a, [role='button'], input[type='submit']")
      .forEach((node) => {
        if (node.hasAttribute("data-olx-accent") || node.hasAttribute("data-olx-cta")) return;
        if (!isBrandAccent(getComputedStyle(node).backgroundColor)) return;
        if (node.closest("header")) {
          node.setAttribute("data-olx-cta", "");
        } else {
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

    tagAds();
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
