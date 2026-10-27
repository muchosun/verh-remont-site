(() => {
  "use strict";
  if (window.VerhLoad || window.VERH_PREVIEW || location.hostname !== "verhremont.ru" || location.protocol !== "https:") return;
  const page = location.pathname === "/" || location.pathname === "/index.html" ? "repair" : location.pathname.startsWith("/design/") ? "design" : "";
  if (!page) return;
  const endpoint = "https://functions.yandexcloud.net/d4en6jq9bmap0km3gicb";
  const query = new URLSearchParams(location.search);
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  const pageId = Array.from(bytes, value => value.toString(16).padStart(2,"0")).join("");
  const qa = query.get("utm_source") === "qa" || /^TEST_/i.test(query.get("utm_campaign") || "");
  const channel = query.get("utm_source") === "yandex" && query.get("utm_medium") === "cpc" ? "direct_ads" : "other";
  const events = new Set(["html_started","dom_ready","page_loaded","form_ready","form_timeout","script_error","first_contentful_paint","captcha_started","captcha_ready","captcha_passed","captcha_error"]);
  const seen = new Set();
  function mark(event, asset, at = performance.now()) {
    try {
      if (!events.has(event) || seen.has(event + (asset || ""))) return;
      seen.add(event + (asset || ""));
      const payload = {v:1,page_id:pageId,page,event,ms:Math.min(120000,Math.max(0,Math.round(at/10)*10)),viewport:innerWidth <= 767 ? "mobile" : "desktop",channel,qa};
      if (event === "script_error" && ["main","quiz","validation","lead","metrika","other"].includes(asset)) payload.asset = asset;
      // No referrer, form values, persistent identifier, or Metrika dependency.
      Promise.resolve(fetch(endpoint,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify(payload),keepalive:true,credentials:"omit",referrerPolicy:"no-referrer"})).catch(() => {});
    } catch { /* Diagnostics never block the page or a lead. */ }
  }
  window.VerhLoad = Object.freeze({mark});
  mark("html_started");
  document.addEventListener("DOMContentLoaded",() => mark("dom_ready"),{once:true});
  window.addEventListener("load",() => mark("page_loaded"),{once:true});
  window.addEventListener("error",event => {
    const script = event.target;
    if (script?.tagName !== "SCRIPT") return;
    let asset = "other";
    try {
      const url = new URL(script.src,location.origin);
      if (url.hostname === "mc.yandex.ru") asset = "metrika";
      else if (url.origin === location.origin) {
        if (url.pathname === "/script.js") asset = "main";
        else if (url.pathname === "/design/quiz.js") asset = "quiz";
        else if (url.pathname.endsWith("brief-validation-v3.js")) asset = "validation";
        else if (url.pathname.endsWith("lead-support.js")) asset = "lead";
      }
    } catch {}
    mark("script_error",asset);
  },true);
  setTimeout(() => { if (!seen.has("form_ready")) mark("form_timeout"); },15000);
  try {
    const observer = new PerformanceObserver(list => {
      const paint = list.getEntries().find(entry => entry.name === "first-contentful-paint");
      if (paint) { mark("first_contentful_paint",undefined,paint.startTime); observer.disconnect(); }
    });
    observer.observe({type:"paint",buffered:true});
  } catch {}
})();
