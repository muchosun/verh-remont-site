(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (!root?.document) return;
  root.VerhPhoneInput = api;
  const attach = element => {
    if (element.dataset.verhPhoneInput || element.inputmask || element.type !== "tel") return;
    element.dataset.verhPhoneInput = "free";
    element.inputMode = "tel";
    element.autocomplete ||= "tel";
    element.maxLength = 64;
    element.spellcheck = false;
    element.setAttribute("autocapitalize", "off");
    const formatComplete = () => {
      const normalized = api.normalize(element.value);
      if (normalized) element.value = root.Inputmask ? root.Inputmask.format(normalized, api.options()) : normalized;
    };
    element.addEventListener("input", () => {
      // Preserve an explicitly completed 7/8 prefix before subsequent edits.
      if (/^[78]\d{10}$/.test(element.value)) formatComplete();
    });
    element.addEventListener("blur", formatComplete);
    element.addEventListener("change", formatComplete);
  };
  const scan = node => {
    if (node.nodeType !== 1) return;
    if (node.matches('input[type="tel"]')) attach(node);
    node.querySelectorAll('input[type="tel"]').forEach(attach);
  };
  const start = () => {
    scan(root.document.documentElement);
    new root.MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan)))
      .observe(root.document.body, {childList:true,subtree:true});
  };
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})(typeof window === "object" ? window : null, function () {
  "use strict";
  function national(value) {
    const text = String(value || "");
    const digits = text.replace(/\D/g, "");
    // A partially edited display still contains its fixed country prefix.
    if (/^\s*\+7/.test(text) || /^\s*8[\s(]/.test(text)) return digits.slice(1);
    return digits.length === 11 && /^[78]/.test(digits) ? digits.slice(1) : digits;
  }
  function normalize(value) {
    const text = String(value || "");
    if (/^\s*\+/.test(text) && !/^\s*\+7/.test(text)) return "";
    const digits = national(text);
    return /^\d{10}$/.test(digits) ? `+7${digits}` : "";
  }
  return {
    national, normalize,
    options:() => ({
      mask:"+7 (999) 999-99-99",
      showMaskOnHover:false, showMaskOnFocus:true,
      clearIncomplete:false, autoUnmask:false, removeMaskOnSubmit:false,
      // Inputmask treats an empty callback result as "use the original value".
      onBeforeMask:value => national(value) || "_",
      onBeforePaste:value => national(value) || "_",
    }),
  };
});
