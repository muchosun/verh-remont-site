(() => {
  "use strict";
  if (window.VerhMainAnalytics) return;
  const preview = Boolean(window.VERH_PREVIEW) || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const names = new Set(["main_landing_view", "main_section_view", "main_interaction", "main_messenger_click", "main_service_click", "main_quiz_contact", "main_quiz_close", "main_validation_error", "quiz_open", "quiz_apartment_selected", "quiz_area_selected", "quiz_tariff_selected", "quiz_submit_attempt", "quiz_lead_success", "quiz_lead_failure", "quiz_calculation_viewed", "tariff_selected", "phone_reveal", "phone_call", "callback_prompt_shown", "callback_prompt_dismissed", "callback_submit_attempt", "callback_requested", "callback_lead_success", "callback_lead_failure", "theme_switch", "hero_headline_exposure"]);
  const enums = {
    action:["navigation", "legal", "project_filter", "project_scroll", "step_back", "theme", "callback_dismiss"],
    placement:["header", "hero", "top", "tariffs", "design-gift", "materials", "payments", "services", "reviews", "contacts", "footer", "mobile_sticky", "tariff", "general", "page", "quiz", "callback"],
    tariff:["cosmetic", "standard", "comfort", "lux"],
    field:["phone", "consent", "area", "form"],
    channel:["max", "telegram"],
    service:["dizayn-proekt", "priemka-kvartiry", "ukladka-laminata", "pokleyka-oboev", "shpaklevka-sten", "ukladka-plitki", "razvodka-santehniki", "natyazhnoy-potolok", "all"],
    section:["top", "projects", "tariffs", "design-gift", "materials", "payments", "services", "reviews", "contacts"],
    control:["all", "standard", "comfort", "lux", "details", "contract", "privacy", "consent", "company", "top", "projects", "tariffs", "payments", "services", "contacts"],
    outcome:["delivered", "not_delivered"], theme:["light", "dark"], variant:["control", "trust"], experiment:["hero-headline-v1"],
  };
  const pending = [];
  let retryTimer = null;
  let retryCount = 0;
  function flush() {
    retryTimer = null;
    if (typeof window.ym !== "function") {
      if (pending.length && retryCount++ < 60) retryTimer = window.setTimeout(flush, 1000);
      else pending.length = 0;
      return;
    }
    retryCount = 0;
    while (pending.length) {
      const event = pending.shift();
      try { window.ym(110859289,"reachGoal",event.name,event.params); } catch { /* Do not retry ambiguous sends or interfere with the form. */ }
    }
  }
  function track(name, params = {}) {
    if (preview || !names.has(name)) return;
    if (name === "theme_switch") { name = "main_interaction"; params = {...params,action:"theme"}; }
    if (name === "callback_prompt_dismissed") { name = "main_interaction"; params = {...params,action:"callback_dismiss",placement:"callback"}; }
    const safe = {landing:"repair_main"};
    for (const [key,value] of Object.entries(params)) {
      if (enums[key]?.includes(value)) safe[key] = value;
      else if (key === "step" && Number.isInteger(value) && value >= 1 && value <= 4) safe.step = value;
      else if (key === "apartment" && ["Новостройка", "Вторичка"].includes(value)) safe.apartment_type = value === "Новостройка" ? "new" : "resale";
    }
    if (pending.length < 100) pending.push({name,params:safe});
    if (retryTimer === null) flush();
  }
  const placement = element => element?.closest(".mobile-sticky-cta") ? "mobile_sticky" : element?.closest(".site-header") ? "header" : element?.closest("footer") ? "footer" : element?.closest("section[id]")?.id || "page";
  window.VerhMainAnalytics = Object.freeze({track,placement});
  track("main_landing_view");
  const attempted = new WeakSet();
  function trackAttempt(form) {
    if (form?.id !== "lead-form" || form.dataset?.sending === "true" || attempted.has(form)) return;
    attempted.add(form);
    window.setTimeout(() => attempted.delete(form), 0);
    track("quiz_submit_attempt",{placement:"quiz",step:4});
  }
  // Native validation can prevent submit; count that attempt, not a delivered lead.
  document.addEventListener("click", event => {
    const button = event.target.closest('button[type="submit"], input[type="submit"]');
    if (button && !button.disabled) trackAttempt(button.form);
  },true);
  document.addEventListener("submit", event => trackAttempt(event.target),true);
  // Native required/type validation can stop submission before the form handler runs.
  document.addEventListener("invalid", event => {
    const form = event.target.closest("form");
    if (!["lead-form", "callback-form", "area-form"].includes(form?.id)) return;
    trackAttempt(form);
    const field = event.target.name === "personal_data_consent" ? "consent" : ["phone", "area"].includes(event.target.name) ? event.target.name : "form";
    track("main_validation_error", {field,placement:form.id === "callback-form" ? "callback" : "quiz",step:form.id === "area-form" ? 2 : 4});
  },true);
  document.querySelectorAll("a[href]").forEach(link => link.addEventListener("click", () => {
    const raw = link.getAttribute("href") || "";
    const at = placement(link);
    if (raw.startsWith("tel:")) return;
    let url;
    try { url = new URL(raw,location.href); } catch { return; }
    if (["max.ru", "t.me"].includes(url.hostname)) track("main_messenger_click",{channel:url.hostname === "max.ru" ? "max" : "telegram",placement:at});
    else if (url.origin === location.origin && (url.pathname.startsWith("/uslugi/") || url.pathname === "/design/" || url.pathname === "/design")) {
      const service = url.pathname === "/design/" || url.pathname === "/design" ? "dizayn-proekt" : url.pathname.split("/").filter(Boolean)[1] || "all";
      track("main_service_click",{service,placement:at});
    } else if (raw.startsWith("#")) track("main_interaction",{action:"navigation",control:raw.slice(1),placement:at});
    else {
      const control = url.pathname.endsWith("contract.html") ? "contract" : url.pathname.endsWith("privacy.html") ? "privacy" : url.pathname.endsWith("consent.html") ? "consent" : url.hostname === "www.rusprofile.ru" ? "company" : null;
      if (control) track("main_interaction",{action:"legal",control,placement:at});
    }
  }));
  document.querySelectorAll("[data-project-filter]").forEach(button => button.addEventListener("click", () => track("main_interaction",{action:"project_filter",control:button.dataset.projectFilter,placement:"page"})));
  const gallery = document.querySelector("[data-project-track]");
  let galleryScrollTracked = false;
  gallery?.addEventListener("scroll", () => {
    if (galleryScrollTracked || gallery.scrollLeft < 40) return;
    galleryScrollTracked = true;
    track("main_interaction",{action:"project_scroll",placement:"page"});
  },{passive:true});
  if (typeof IntersectionObserver === "function") {
    const seen = new Set();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || seen.has(entry.target.id)) return;
      seen.add(entry.target.id);
      track("main_section_view",{section:entry.target.id});
      observer.unobserve(entry.target);
    }),{threshold:0.1});
    document.querySelectorAll("main section[id]").forEach(section => observer.observe(section));
  }
})();
