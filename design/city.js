(() => {
  "use strict";
  const inputs = [...document.querySelectorAll("[data-city-input]")];
  const localOffers = [...document.querySelectorAll("[data-krasnodar-only]")];
  const packageSelect = document.querySelector("select[name='package']");
  const key = "verh_project_city";
  const aliases = { krasnodar: "Краснодар", moscow: "Москва", spb: "Санкт-Петербург", moscow_oblast: "Московская область", sochi: "Сочи" };
  const normalize = (value) => {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    return text.length <= 80 && /^[\p{L}\p{M} .()\-]+$/u.test(text) ? text : "";
  };
  let saved = "";
  try { saved = localStorage.getItem(key) || ""; } catch (_) { /* Storage can be unavailable in private mode. */ }
  const params = new URLSearchParams(location.search);
  const query = params.get("city") || params.get("utm_city");
  const initial = normalize(aliases[query] || query) || normalize(saved);
  const sync = (value, active) => {
    const city = normalize(value);
    inputs.forEach(input => { if (input !== active) input.value = value; });
    const krasnodar = city.toLocaleLowerCase("ru-RU") === "краснодар";
    let packageChanged = false;
    document.body.dataset.repairAvailable = String(krasnodar);
    localOffers.forEach(offer => {
      offer.hidden = !krasnodar;
      if (offer.tagName === "OPTION") {
        offer.disabled = !krasnodar;
        if (!krasnodar && offer.selected && packageSelect) {
          packageSelect.selectedIndex = 0;
          packageChanged = true;
        }
      }
    });
    if (packageChanged) packageSelect.dispatchEvent(new Event("change", { bubbles: true }));
    try { city ? localStorage.setItem(key, city) : localStorage.removeItem(key); } catch (_) {}
  };
  sync(initial);
  inputs.forEach(input => input.addEventListener("input", () => sync(input.value, input)));
})();
