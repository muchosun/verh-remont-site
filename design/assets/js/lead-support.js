(() => {
  "use strict";
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
  const getClientId = () => new Promise((resolve) => {
    if (typeof window.ym !== "function") return resolve("");
    const timer = setTimeout(() => resolve(""), 1200);
    try {
      window.ym(110859289, "getClientID", (value) => {
        clearTimeout(timer);
        resolve(/^\d{1,64}$/.test(String(value)) ? String(value) : "");
      });
    } catch { clearTimeout(timer); resolve(""); }
  });
  const send = async (endpoint, payload) => {
    if (!endpoint) throw new Error("Lead endpoint is not configured");
    const clientId = await getClientId();
    const yclid = source().searchParams.get("yclid") || "";
    const attribution = { clientId, yclid: /^\d{1,128}$/.test(yclid) ? yclid : "" };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, attribution }),
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
