(() => {
  "use strict";
  const sitekey = "0x4AAAAAAFlZIdAV1EMcxek9";
  let captchaScript;
  function loadCaptcha() {
    if (window.turnstile) return Promise.resolve();
    if (captchaScript) return captchaScript;
    captchaScript = new Promise((resolve,reject) => {
      const script = document.createElement("script");
      const fail = () => { clearTimeout(timer); script.remove(); captchaScript = null; reject(new Error("Protection unavailable")); };
      const timer = setTimeout(fail,12000);
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => { clearTimeout(timer); if (window.turnstile) resolve(); else fail(); };
      script.onerror = fail;
      document.head.append(script);
    });
    return captchaScript;
  }
  async function getCaptchaToken(action) {
    await loadCaptcha();
    return new Promise((resolve,reject) => {
      const container = document.createElement("div");
      document.body.append(container);
      let widget, done = false;
      const finish = (error,token) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (widget !== undefined) { try { window.turnstile.remove(widget); } catch {} }
        container.remove();
        if (error) reject(new Error("Protection unavailable")); else resolve(token);
      };
      const timer = setTimeout(() => finish(true),20000);
      try {
        widget = window.turnstile.render(container,{
          sitekey,action,language:"ru",retry:"never","response-field":false,
          callback:token => finish(typeof token !== "string" || !token,token),
          "error-callback":() => { finish(true); return true; },
          "timeout-callback":() => finish(true),
          "expired-callback":() => finish(true),
        });
      } catch { finish(true); }
    });
  }
  if (!window.VerhCaptcha) window.VerhCaptcha = Object.freeze({getToken:getCaptchaToken});
  const key = "verh-campaign";
  const isCampaignKey = (name) => /^utm_[a-z_]+$/.test(name) || ["yclid", "gclid", "fbclid"].includes(name);
  const current = new URL(location.href);
  let campaign = {};
  try { campaign = JSON.parse(sessionStorage.getItem(key) || "{}"); } catch { /* Storage is optional. */ }
  if (!campaign || typeof campaign !== "object" || Array.isArray(campaign)) campaign = {};
  const incoming = [...current.searchParams].filter(([name]) => isCampaignKey(name));
  if (incoming.length) {
    campaign = Object.fromEntries(incoming);
    try { sessionStorage.setItem(key, JSON.stringify(campaign)); } catch { /* Links still carry attribution. */ }
  }
  const source = (href = location.href) => {
    const url = new URL(href, location.href);
    for (const [name, value] of Object.entries(campaign)) {
      if (isCampaignKey(name) && typeof value === "string" && !url.searchParams.has(name)) url.searchParams.set(name, value);
    }
    return url;
  };
  // Carry only campaign identifiers, never arbitrary query parameters or form data.
  document.querySelectorAll("a[href]").forEach((link) => {
    const raw = link.getAttribute("href");
    if (raw.startsWith("#")) return;
    const url = new URL(link.href);
    if (url.origin === location.origin && /^\/(?:uslugi(?:\/|$)|$)/.test(url.pathname)) link.href = source(url.href).href;
  });
  const send = async (endpoint, payload) => {
    if (!endpoint) throw new Error("Lead endpoint is not configured");
    const url = new URL(payload.source || location.href,location.href);
    const design = Boolean(payload.designBrief) || payload.formVersion === 3 || url.pathname.startsWith("/design/") || url.searchParams.get("request") === "design-project";
    const turnstileToken = payload.turnstileToken || await window.VerhCaptcha.getToken(design ? "design_lead" : "repair_lead");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...payload,turnstileToken}),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Lead endpoint responded with ${response.status}`);
      const result = await response.json();
      if (result.status !== "accepted" || !result.leadId) throw new Error("Lead delivery was not confirmed");
      return { status: "sent" };
    } finally { clearTimeout(timeout); }
  };
  window.VerhLead = { source, send };
})();
