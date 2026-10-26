(() => {
  "use strict";
  const desktop = window.matchMedia("(min-width: 761px) and (hover: hover) and (pointer: fine)");
  document.querySelectorAll("[data-call-link]").forEach(link => {
    const digits = (link.getAttribute("href") || "").replace(/^tel:/, "");
    const label = link.querySelector("span");
    if (!/^\+7\d{10}$/.test(digits) || !label) return;
    const number = `${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`;
    const originalLabel = label.textContent;
    const originalAria = link.getAttribute("aria-label");
    let revealed = false;
    link.addEventListener("click", event => {
      if (!desktop.matches || revealed || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
      event.preventDefault();
      revealed = true;
      label.textContent = number;
      link.setAttribute("aria-label", `Позвонить в ВЕРХ: ${number}`);
    });
    desktop.addEventListener("change", () => {
      if (desktop.matches || !revealed) return;
      revealed = false;
      label.textContent = originalLabel;
      if (originalAria) link.setAttribute("aria-label", originalAria);
      else link.removeAttribute("aria-label");
    });
  });
})();
