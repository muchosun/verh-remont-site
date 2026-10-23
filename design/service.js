(() => {
  "use strict";

  const leadEndpoint = window.VERH_LEAD_ENDPOINT || "";
  const serviceName = document.body.dataset.service || "Отделочные работы";
  const serviceSlug = document.body.dataset.serviceSlug || "uslugi";
  const requestType = document.body.dataset.request || "measurement";

  const reachGoal = (goal, params = {}) => {
    if (typeof window.ym === "function") {
      window.ym(110859289, "reachGoal", goal, { service: serviceSlug, ...params });
    }
  };

  const scrollToLead = (event) => {
    const lead = document.querySelector("#lead");
    if (!lead) return;
    const selectedPackage = event?.currentTarget?.dataset?.package || "";
    const packageSelect = lead.querySelector("select[name='package']");
    if (selectedPackage && packageSelect) packageSelect.value = selectedPackage;
    reachGoal("service_lead_start", { request: requestType, offer: selectedPackage || undefined });
    const scrollTarget = window.innerWidth <= 760 ? lead.querySelector('[data-service-form]') || lead : lead;
    scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    const target = lead.querySelector("[name='city']") || lead.querySelector("input[type='tel']");
    target?.focus({ preventScroll: true });
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
    const mode = form.elements.leadMode;
    const briefFields = ["city", "area", "package", "projectStart", "projectTask"];
    const updateMode = () => {
      const isBrief = !mode || mode.value === "brief";
      form.querySelectorAll?.("[data-brief-field]").forEach(label => { label.hidden = !isBrief; });
      briefFields.forEach(name => {
        if (form.elements[name]) form.elements[name].disabled = !isBrief;
      });
      if (mode) submit.textContent = isBrief ? "Отправить заявку на проект" : "Заказать обратный звонок";
    };
    mode?.addEventListener("change", updateMode);
    updateMode();

    phone.addEventListener("input", () => {
      phone.removeAttribute("aria-invalid");
      status.textContent = "";
      status.removeAttribute("data-state");
    });
    form.elements.consent.addEventListener("change", () => {
      form.elements.consent.removeAttribute("aria-invalid");
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
      const selectedPackage = form.elements.package?.value.trim() || "";
      const cityInput = form.elements.city;
      const city = cityInput?.value.trim() || "";
      const isBrief = Boolean(mode && mode.value === "brief");
      const isCallback = Boolean(mode && mode.value === "callback");
      if (mode && !isBrief && !isCallback) return;
      if (!isCallback && cityInput && (!city || city.length > 80 || !/^[\p{L}\p{M} .()\-]+$/u.test(city))) {
        status.dataset.state = "error";
        status.textContent = "Укажите город квартиры.";
        cityInput.setAttribute("aria-invalid", "true");
        cityInput.focus();
        return;
      }
      cityInput?.removeAttribute("aria-invalid");
      const areaInput = form.elements.area;
      const area = Number(areaInput?.value);
      const minimumArea = selectedPackage.startsWith("Полный") ? 50 : 30;
      if (!isCallback && areaInput && (!Number.isFinite(area) || area < minimumArea || area > 10000)) {
        status.dataset.state = "error";
        status.textContent = `Укажите площадь от ${minimumArea} до 10 000 м².`;
        areaInput.setAttribute("aria-invalid", "true");
        areaInput.focus();
        return;
      }
      areaInput?.removeAttribute("aria-invalid");
      const projectStart = form.elements.projectStart?.value.trim() || "";
      const projectTask = form.elements.projectTask?.value.trim() || "";
      if (isBrief) {
        const invalid = !selectedPackage || selectedPackage === "Не определился" ? "package"
          : !["В течение месяца", "Через 1–3 месяца", "Позже трёх месяцев"].includes(projectStart) ? "projectStart"
          : projectTask.length < 20 || projectTask.length > 120 ? "projectTask" : "";
        if (invalid) {
          status.dataset.state = "error";
          status.textContent = invalid === "package" ? "Выберите пакет проекта или закажите обратный звонок."
            : invalid === "projectStart" ? "Выберите срок начала проекта." : "Опишите задачу: от 20 до 120 символов.";
          form.elements[invalid].setAttribute("aria-invalid", "true");
          form.elements[invalid].focus();
          return;
        }
        ["package", "projectStart", "projectTask"].forEach(name => form.elements[name].removeAttribute("aria-invalid"));
      }

      if (normalizedPhone) phone.removeAttribute("aria-invalid");
      else phone.setAttribute("aria-invalid", "true");
      if (consent) form.elements.consent.removeAttribute("aria-invalid");
      else form.elements.consent.setAttribute("aria-invalid", "true");

      if (!normalizedPhone || !consent) {
        status.dataset.state = "error";
        status.textContent = !normalizedPhone
          ? "Проверьте номер телефона."
          : "Нужно согласие на обработку данных.";
        (!normalizedPhone ? phone : form.elements.consent).focus();
        return;
      }

      if (website) return;
      if (submit.disabled) return;
      const isLocal = Boolean(window.VERH_PREVIEW) || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
      reachGoal("service_lead_submit", { request: requestType, offer: selectedPackage || undefined, local_preview: isLocal });

      submit.disabled = true;
      submit.textContent = "Отправляем…";
      status.textContent = "Формируем заявку";

      try {
        if (!isLocal) {
          if (!leadEndpoint) throw new Error("Lead endpoint is not configured");
          const source = window.VerhLead.source();
          source.hash = "";
          source.searchParams.set("service", serviceName);
          source.searchParams.set("request", requestType);
          if (!isCallback && selectedPackage) source.searchParams.set("package", selectedPackage);
          if (city) source.searchParams.set("city", city);
          if (!isCallback && areaInput) source.searchParams.set("area", String(area));
          if (mode) source.searchParams.set("lead_type", isBrief ? "design_brief" : "callback");
          if (isBrief) {
            source.searchParams.set("project_start", projectStart);
            source.searchParams.set("project_task", projectTask);
          }

          const delivery = await window.VerhLead.send(leadEndpoint, {
            kind: "callback",
            phone: normalizedPhone,
            website: "",
            source: source.toString(),
          });
          if (delivery?.status !== "sent") throw new Error("Lead delivery was not confirmed");
          if (requestType === "design-project" && ["dizayn-proekt", "dizayn-proekt-online"].includes(serviceSlug)) {
            // Only the complete, delivered brief is eligible for the new paid goal.
            if (isBrief) reachGoal("design_project_brief_delivered", { request: requestType, offer: selectedPackage });
            else if (!mode) reachGoal("design_project_lead_delivered", { request: requestType, offer: selectedPackage || undefined });
          }
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 650));
        }

        reachGoal("service_lead_success", { request: requestType, offer: selectedPackage || undefined, local_preview: isLocal });
        status.dataset.state = "success";
        status.textContent = isLocal
          ? "Предпросмотр: форма заполнена корректно, заявка не отправлена."
          : "Заявка отправлена. Скоро позвоним и уточним детали.";
        submit.textContent = isLocal ? "Форма проверена" : "Заявка принята";
        phone.disabled = true;
        if (cityInput) cityInput.disabled = true;
        if (areaInput) areaInput.disabled = true;
        if (form.elements.package) form.elements.package.disabled = true;
        if (mode) mode.disabled = true;
        if (form.elements.projectStart) form.elements.projectStart.disabled = true;
        if (form.elements.projectTask) form.elements.projectTask.disabled = true;
        form.elements.consent.disabled = true;
      } catch (error) {
        console.error("Service lead submission failed", error);
        reachGoal("service_lead_failure", { request: requestType, offer: selectedPackage || undefined });
        status.dataset.state = "error";
        status.textContent = "Не удалось отправить заявку. Позвоните по номеру +7 (918) 238-30-59.";
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
