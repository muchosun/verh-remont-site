(() => {
  "use strict";
  if (window.VerhDesignAnalytics) return;
  const local = Boolean(window.VERH_PREVIEW) || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const names = new Set(["cta_click", "quiz_start", "step_apartment", "step_project", "submit_attempt", "validation_error", "delivery_error", "callback_delivered", "captcha_error", "phone_reveal", "phone_intent", "max_click", "pdf_open", "album_open", "interaction", "section_view"]);
  const keys = new Set(["action", "location", "control", "field", "mode", "step", "sheet", "section", "package"]);
  let started = false;
  function track(name, params = {}) {
    if (local || !names.has(name)) return;
    // A validated first step also starts the quiz when its fields were prefilled.
    if (name === "step_apartment" && !started) track("quiz_start");
    if (name === "quiz_start") {
      if (started) return;
      started = true;
    }
    // Never forward form values, link URLs, labels or arbitrary strings to Metrika.
    const safe = {};
    for (const [key, value] of Object.entries(params)) {
      if (keys.has(key) && ((typeof value === "string" && /^[a-z][a-z0-9_-]{0,47}$/.test(value)) || (Number.isInteger(value) && value >= 0 && value <= 100))) safe[key] = value;
    }
    try { window.ym?.(110859289, "reachGoal", `design_${name}`, {design_landing:safe}); } catch { /* Analytics must not affect the landing. */ }
  }
  window.VerhDesignAnalytics = Object.freeze({track});
  const place = element => element.closest("[data-mobile-actions]") ? "sticky" : element.closest(".preview-header") ? "header" : element.closest("footer") ? "footer" : element.closest("section")?.id || "page";
  const interaction = (element, action, control) => track("interaction", {action, control, location:place(element)});
  document.querySelectorAll("[data-scroll-lead]").forEach((el, index) => el.addEventListener("click", () => {
    const pack = el.dataset.package || "";
    track("cta_click", {location:place(el),control:`cta_${index + 1}`,package:pack.startsWith("Полный") ? "full" : pack.includes("подарок") ? "repair_gift" : pack ? "working" : "none"});
  }));
  document.querySelectorAll("a[href]").forEach(el => el.addEventListener("click", () => {
    const href = el.getAttribute("href");
    if (el.hasAttribute("data-call-link")) {
      // phone-reveal.js runs first: its prevented click only reveals the number.
      track(el.dataset.phoneClick === "reveal" ? "phone_reveal" : "phone_intent", {location:place(el)});
    } else if (href.startsWith("https://max.ru/")) track("max_click", {location:place(el)});
    else if (href.endsWith(".pdf")) track("pdf_open", {location:place(el)});
    else if (href.includes("/3d-references/")) interaction(el, "visualization_open", href.includes("bedroom") ? "bedroom" : "living");
    else if (href.startsWith("#")) interaction(el, "section_navigation", href.slice(1));
    else interaction(el, "link_open", href.includes("contract.html") ? "contract" : href.includes("privacy.html") ? "privacy" : href.includes("consent.html") ? "consent" : href.includes("rusprofile") ? "company" : "home");
  }));
  document.querySelectorAll("details").forEach((el,index) => el.addEventListener("toggle", () => { if (el.open) interaction(el, "details_open", `details_${index + 1}`); }));
  document.querySelectorAll("[data-estimate-area]").forEach(el => el.addEventListener("change", () => interaction(el, "calculator_change", "area")));
  const form = document.querySelector("[data-service-form]");
  form?.addEventListener("input", event => {
    if (started || event.target.name === "website") return;
    track("quiz_start");
  });
  form?.addEventListener("change", event => {
    if (["package", "projectStart", "consent"].includes(event.target.name)) interaction(form, "field_change", event.target.name === "projectStart" ? "project_start" : event.target.name);
  });
  if (typeof IntersectionObserver === "function") {
    const seen = new Set();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || seen.has(entry.target.id)) return;
      seen.add(entry.target.id);
      track("section_view", {section:entry.target.id});
      observer.unobserve(entry.target);
    }), {threshold:0.1});
    document.querySelectorAll("main section[id]").forEach(el => observer.observe(el));
  }
})();
