(() => {
  "use strict";

  const leadEndpoint = window.VERH_LEAD_ENDPOINT || "";
  const serviceName = document.body.dataset.service || "Отделочные работы";
  const serviceSlug = document.body.dataset.serviceSlug || "uslugi";

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
    window.setTimeout(() => lead.querySelector("input[type='tel']")?.focus({ preventScroll: true }), 520);
  };

  document.querySelectorAll("[data-scroll-lead]").forEach((button) => {
    button.addEventListener("click", scrollToLead);
  });

  document.querySelectorAll("[data-call-link]").forEach((link) => {
    link.addEventListener("click", () => reachGoal("service_call", { placement: link.closest(".mobile-actions") ? "sticky" : "page" }));
  });

  const normalizePhone = (value) => {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
      digits = digits.slice(1);
    }
    return digits.length === 10 ? `+7${digits}` : "";
  };

  const form = document.querySelector("[data-service-form]");
  if (form) {
    const phone = form.elements.phone;
    const submit = form.querySelector("button[type='submit']");
    const status = form.querySelector("[data-form-status]");

    phone.addEventListener("input", () => {
      phone.removeAttribute("aria-invalid");
      status.textContent = "";
      status.removeAttribute("data-state");
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      status.removeAttribute("data-state");

      const normalizedPhone = normalizePhone(phone.value);
      const consent = form.elements.consent.checked;
      const website = form.elements.website.value.trim();

      phone.toggleAttribute("aria-invalid", !normalizedPhone);

      if (!normalizedPhone || !consent) {
        status.dataset.state = "error";
        status.textContent = !normalizedPhone
          ? "Проверь номер телефона."
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
          source.searchParams.set("request", "measurement");

          const response = await fetch(leadEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "callback",
              phone: normalizedPhone,
              website: "",
              source: source.toString(),
            }),
          });

          if (!response.ok) throw new Error(`Lead endpoint returned ${response.status}`);
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 650));
        }

        reachGoal("service_lead_submit", { request: "measurement", local_preview: isLocal });
        status.dataset.state = "success";
        status.textContent = isLocal
          ? "Форма заполнена корректно."
          : "Заявка отправлена. Скоро позвоним и договоримся о замере.";
        submit.textContent = "Заявка принята";
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
    const observed = [document.querySelector(".service-hero"), document.querySelector("#lead"), document.querySelector("[data-page-footer]")].filter(Boolean);
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      mobileActions.hidden = visible.size > 0;
    }, { rootMargin: "0px 0px -30%", threshold: 0.01 });
    observed.forEach((element) => observer.observe(element));
  }
})();
