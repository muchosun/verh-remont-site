(() => {
  "use strict";

  const leadEndpoint = window.VERH_LEAD_ENDPOINT || "";
  const serviceName = document.body.dataset.service || "Отделочные работы";
  const serviceSlug = document.body.dataset.serviceSlug || "services-preview";

  const reachGoal = (goal, params = {}) => {
    if (typeof window.ym === "function") {
      window.ym(110859289, "reachGoal", goal, { service: serviceSlug, ...params });
    }
  };

  const scrollToLead = () => {
    const lead = document.querySelector("#lead");
    if (!lead) return;
    reachGoal("service_lead_start");
    lead.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => lead.querySelector("select, input")?.focus({ preventScroll: true }), 520);
  };

  document.querySelectorAll("[data-scroll-lead]").forEach((button) => {
    button.addEventListener("click", scrollToLead);
  });

  document.querySelectorAll("[data-call-link]").forEach((link) => {
    link.addEventListener("click", () => reachGoal("service_call", { placement: link.closest(".mobile-actions") ? "sticky" : "page" }));
  });

  const phoneDigits = (value) => {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length > 10 && (digits.startsWith("7") || digits.startsWith("8"))) digits = digits.slice(1);
    return digits.slice(0, 10);
  };

  const formatPhone = (value) => {
    const digits = phoneDigits(value);
    if (!digits) return "";
    let result = "+7";
    if (digits.length) result += ` (${digits.slice(0, 3)}`;
    if (digits.length >= 3) result += ")";
    if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
    if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
    if (digits.length > 8) result += `-${digits.slice(8, 10)}`;
    return result;
  };

  const form = document.querySelector("[data-service-form]");
  if (form) {
    const phone = form.elements.phone;
    const submit = form.querySelector("button[type='submit']");
    const status = form.querySelector("[data-form-status]");

    phone.addEventListener("input", () => {
      phone.value = formatPhone(phone.value);
      phone.removeAttribute("aria-invalid");
      status.textContent = "";
      status.removeAttribute("data-state");
    });

    [form.elements.scope, form.elements.property].forEach((field) => {
      field.addEventListener("change", () => field.removeAttribute("aria-invalid"));
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      status.removeAttribute("data-state");

      const scope = form.elements.scope.value.trim();
      const property = form.elements.property.value.trim();
      const digits = phoneDigits(phone.value);
      const consent = form.elements.consent.checked;
      const website = form.elements.website.value.trim();

      form.elements.scope.toggleAttribute("aria-invalid", !scope);
      form.elements.property.toggleAttribute("aria-invalid", !property);
      phone.toggleAttribute("aria-invalid", digits.length !== 10);

      if (!scope || !property || digits.length !== 10 || !consent) {
        status.dataset.state = "error";
        status.textContent = !scope || !property
          ? "Выбери объём и тип объекта."
          : digits.length !== 10
            ? "Проверь номер: нужно 10 цифр после +7."
            : "Нужно согласие на обработку данных.";
        form.querySelector("[aria-invalid='true']")?.focus();
        return;
      }

      if (website) return;

      submit.disabled = true;
      submit.textContent = "Отправляем…";
      status.textContent = "Формируем заявку";

      const isLocal = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);

      try {
        if (!isLocal) {
          if (!leadEndpoint) throw new Error("Lead endpoint is not configured");
          const source = new URL(location.href);
          source.hash = "";
          source.searchParams.set("service", serviceName);
          source.searchParams.set("scope", scope);
          source.searchParams.set("object", property);

          const response = await fetch(leadEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "callback",
              phone: `+7${digits}`,
              website: "",
              source: source.toString(),
            }),
          });

          if (!response.ok) throw new Error(`Lead endpoint returned ${response.status}`);
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 650));
        }

        reachGoal("service_lead_submit", { scope, property, local_preview: isLocal });
        status.dataset.state = "success";
        status.textContent = isLocal
          ? "Форма заполнена корректно."
          : "Заявка отправлена. Скоро позвоним и уточним детали.";
        submit.textContent = "Заявка принята";
        form.elements.scope.disabled = true;
        form.elements.property.disabled = true;
        phone.disabled = true;
        form.elements.consent.disabled = true;
      } catch (error) {
        console.error("Service lead submission failed", error);
        status.dataset.state = "error";
        status.textContent = "Не удалось отправить. Позвони по номеру +7 (918) 238-30-59.";
        submit.disabled = false;
        submit.textContent = "Повторить отправку";
      }
    });
  }

  const mobileActions = document.querySelector("[data-mobile-actions]");
  if (mobileActions) {
    const observed = [document.querySelector("#lead"), document.querySelector("[data-page-footer]")].filter(Boolean);
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      mobileActions.hidden = visible.size > 0;
    }, { rootMargin: "0px 0px -30%", threshold: 0.01 });
    observed.forEach((element) => observer.observe(element));
  }
})();
