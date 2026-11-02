(() => {
  "use strict";
  const preview = window.VERH_PREVIEW || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const form = document.querySelector("#quiz-phone-form");
  const input = form?.querySelector('[name="phone"]');
  if (!form || !input) return;
  const surface = location.pathname.startsWith("/raschet-remonta") ? "repair_calculator" : "repair_main";
  const events = new Set(["repair_phone_view", "repair_phone_input_start", "repair_phone_valid", "repair_phone_continue", "repair_phone_error", "repair_phone_exit", "repair_draft_saved", "repair_draft_failed"]);
  let visible = false;
  let restoreView = false;
  let reached = new Set();
  const pending = [];
  let timer, retries = 0;
  function flush() {
    timer = undefined;
    if (typeof window.ym !== "function") {
      if (pending.length && retries++ < 60) timer = setTimeout(flush, 1000);
      else pending.length = 0;
      return;
    }
    retries = 0;
    while (pending.length) {
      const event = pending.shift();
      try { window.ym(110859289, "reachGoal", event.name, event.params); } catch { /* Analytics must not affect intake. */ }
    }
  }
  function emit(name, extra = {}) {
    if (preview || !events.has(name)) return;
    const params = {form:surface,flow:"repair_phone_first_v1"};
    if (["empty", "partial", "valid"].includes(extra.phone_state)) params.phone_state = extra.phone_state;
    if (["phone", "consent"].includes(extra.field)) params.field = extra.field;
    if (pending.length < 100) pending.push({name,params});
    if (timer === undefined) flush();
  }
  function once(name, extra) {
    if (reached.has(name)) return;
    reached.add(name);
    emit(name, extra);
  }
  function phoneState() {
    let digits = input.value.replace(/\D/g, "");
    if (!digits || digits === "7" || digits === "8") return "empty";
    if (digits.length === 10 && !/^\s*\+/.test(input.value)) digits = "7" + digits;
    if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
    return /^7\d{10}$/.test(digits) ? "valid" : "partial";
  }
  function view() {
    if (visible) return;
    visible = true;
    reached = new Set();
    once("repair_phone_view");
  }
  function continued() {
    if (!visible) return;
    once("repair_phone_valid");
    once("repair_phone_continue");
    visible = false;
  }
  function close() {
    if (!visible) return;
    once("repair_phone_exit", {phone_state:phoneState()});
    visible = false;
  }
  input.addEventListener("input", event => {
    if (event.isTrusted === false || !visible || input.closest("[inert]")) return;
    const state = phoneState();
    if (state !== "empty") once("repair_phone_input_start");
    if (state === "valid") once("repair_phone_valid");
  });
  form.addEventListener("invalid", event => {
    if (event.isTrusted === false || !visible) return;
    emit("repair_phone_error", {field:event.target.name === "personal_data_consent" ? "consent" : "phone"});
  }, true);
  window.addEventListener("pagehide", () => { restoreView = visible; close(); });
  window.addEventListener("pageshow", event => {
    if (event.persisted && restoreView) view();
    restoreView = false;
  });
  window.VerhRepairPhoneAnalytics = Object.freeze({view,continued,close,
    saved:() => emit("repair_draft_saved"),failed:() => emit("repair_draft_failed")});
})();
