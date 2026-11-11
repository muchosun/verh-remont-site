(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (!root?.document) return;
  root.VerhPhoneInput = api;
  const attach = element => {
    if (!root.Inputmask || element.inputmask || element.type !== "tel") return;
    root.Inputmask(api.options()).mask(element);
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
    if (/^\s*\+7\D*$/.test(text)) return "";
    const digits = text.replace(/\D/g, "");
    return digits.length === 11 && /^[78]/.test(digits) ? digits.slice(1) : digits;
  }
  return {
    national,
    options:() => ({
      mask:["+7 (999) 999-99-99","8 (999) 999-99-99"], keepStatic:true, inputEventOnly:true,
      showMaskOnHover:false, showMaskOnFocus:true,
      clearIncomplete:false, autoUnmask:false, removeMaskOnSubmit:false,
      onBeforeMask:national, onBeforePaste:national,
    }),
  };
});
