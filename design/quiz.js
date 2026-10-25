(() => {
  "use strict";
  const form = document.querySelector('[data-service-form][data-brief-version="3"]');
  if (!form) return;
  const local = Boolean(window.VERH_PREVIEW) || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const status = form.querySelector("[data-form-status]");
  const steps = [...form.querySelectorAll("[data-quiz-step]")];
  const next = form.querySelector("[data-quiz-next]");
  const back = form.querySelector("[data-quiz-back]");
  const submit = form.querySelector('[type="submit"]');
  const modeButton = form.querySelector("[data-quiz-mode]");
  const retry = form.querySelector("[data-captcha-retry]");
  const mode = form.elements.leadMode;
  const titles = ["Квартира", "Проект", "Контакт"];
  let step = 0, sending = false, delivered = false, token = "", widget, loading;
  const goal = (name, params = {}) => {
    if (!local && typeof window.ym === "function") window.ym(110859289, "reachGoal", name, {service:"dizayn-proekt-online",...params});
  };
  const collect = () => Object.fromEntries(["customerName", "phone", "callbackTime", "city", "area", "package", "projectStart", "projectTask"].map(name => [name,form.elements[name]?.value || ""]).concat([["mode",mode.value],["consent",form.elements.consent.checked]]));
  const message = (text, state = "") => { status.textContent = text; status.dataset.state = state; };
  const ready = () => { submit.disabled = sending || delivered || (!local && !token); };
  function captchaFailure() {
    token = "";
    ready();
    retry.hidden = false;
    message("Не удалось выполнить защитную проверку. Повторите её или напишите нам в MAX.", "error");
  }
  function loadCaptcha() {
    if (local) return Promise.resolve();
    if (!window.VERH_TURNSTILE_SITEKEY) return Promise.reject(new Error("Captcha is not configured"));
    if (window.turnstile) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve,reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => { script.remove(); loading = null; reject(new Error("Captcha timed out")); },12000);
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error("Captcha unavailable")); };
      document.head.append(script);
    });
    return loading;
  }
  async function ensureCaptcha(reset = false) {
    if (local) { ready(); return; }
    try {
      await loadCaptcha();
      if (widget !== undefined) {
        if (reset) { token = ""; window.turnstile.reset(widget); }
      } else {
        // The Cloudflare widget must use Invisible mode; hiding Managed with CSS is not equivalent.
        widget = window.turnstile.render(form.querySelector("[data-turnstile]"), {
          sitekey:window.VERH_TURNSTILE_SITEKEY,
          action:"design_lead", language:"ru",
          callback:value => { token = value; retry.hidden = true; if (!sending && !delivered) message(""); ready(); },
          "expired-callback":() => { token = ""; ready(); ensureCaptcha(true); },
          "error-callback":() => { captchaFailure(); return true; },
          "timeout-callback":captchaFailure,
        });
      }
      ready();
    } catch { captchaFailure(); }
  }
  function show(index, focus = true) {
    step = index;
    steps.forEach((element,i) => { element.hidden = i !== step; });
    form.querySelector("[data-quiz-progress]").hidden = false;
    form.querySelector("[data-quiz-counter]").textContent = mode.value === "callback" ? "Обратный звонок" : `${step + 1} из 3 · ${titles[step]}`;
    form.querySelector("progress").value = step + 1;
    back.hidden = step === 0;
    next.hidden = step === 2;
    submit.hidden = step !== 2;
    modeButton.textContent = mode.value === "callback" ? "Заполнить заявку на проект" : "Нужна только консультация";
    submit.textContent = mode.value === "callback" ? "Заказать обратный звонок" : "Отправить заявку на проект";
    const data = collect();
    form.querySelector("[data-quiz-summary]").textContent = mode.value === "callback" ? "Позвоним и поможем выбрать проект." : `${data.city} · ${data.area} м² · ${data.package.split(" — ")[0]} · ${data.projectStart}`;
    if (focus) {
      form.scrollIntoView({behavior:"instant",block:"start"});
      steps[step].querySelector("legend").focus({preventScroll:true});
    }
    if (step === 2) ensureCaptcha();
    ready();
  }
  function showInvalid(result) {
    const field = form.elements[result.field];
    const fieldset = field?.closest("[data-quiz-step]");
    if (fieldset) show(Number(fieldset.dataset.quizStep),false);
    if (field?.closest("details")) field.closest("details").open = true;
    field?.setAttribute("aria-invalid","true");
    field?.focus();
    message(result.message,"error");
  }
  next.addEventListener("click", () => {
    const result = window.VerhQuizValidation.validate(collect(),step);
    if (!result.ok) return showInvalid(result);
    goal("design_quiz_step",{step:step+1});
    message("");
    show(step+1);
  });
  back.addEventListener("click", () => { if (sending || delivered) return; mode.value = "brief"; message(""); show(Math.max(0,step-1)); });
  modeButton.addEventListener("click", () => { if (sending || delivered) return; mode.value = mode.value === "brief" ? "callback" : "brief"; message(""); show(mode.value === "callback" ? 2 : 0); });
  retry.addEventListener("click", () => ensureCaptcha(true));
  form.addEventListener("input", event => { event.target.removeAttribute("aria-invalid"); if (status.dataset.state === "error" && (token || local || step < 2)) message(""); });
  form.addEventListener("keydown", event => {
    if (event.key === "Enter" && step === 0 && event.target.tagName === "INPUT") {
      event.preventDefault();
      next.click();
    }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (sending || delivered) return;
    if (step < 2) { next.click(); return; }
    const result = window.VerhQuizValidation.validate(collect());
    if (!result.ok) return showInvalid(result);
    if (form.elements.website.value.trim()) return;
    if (!local && !token) { message("Дождитесь защитной проверки.","error"); ensureCaptcha(); return; }
    sending = true;
    ready();
    back.disabled = modeButton.disabled = true;
    submit.textContent = "Отправляем…";
    message(local ? "Предпросмотр: проверяем форму" : "Отправляем заявку");
    try {
      if (!local) {
        const source = window.VerhLead.source();
        source.hash = "";
        source.searchParams.set("request","design-project");
        source.searchParams.set("lead_type",result.values.mode === "brief" ? "design_brief" : "callback");
        const delivery = await window.VerhLead.send(window.VERH_LEAD_ENDPOINT, {kind:"callback",phone:result.values.phone,website:"",source:source.toString(),formVersion:3,designBrief:result.values,turnstileToken:token});
        if (delivery?.status !== "sent" || delivery.qualification !== (result.values.mode === "brief" ? "design_brief_v3" : "callback_v3")) throw new Error("Delivery qualification mismatch");
        if (result.values.mode === "brief") goal("design_project_brief_delivered");
        goal("service_lead_success",{request:"design-project",mode:result.values.mode});
      }
      delivered = true;
      message(local ? "Предпросмотр: форма заполнена, заявка не отправлена." : "Заявка отправлена. Позвоним и обсудим ваш проект.","success");
      submit.textContent = local ? "Форма проверена" : "Заявка принята";
      form.querySelectorAll("input,select,textarea").forEach(field => { field.disabled = true; });
    } catch {
      message("Не удалось отправить заявку. Данные сохранены в форме, попробуйте ещё раз или напишите нам в MAX.","error");
      submit.textContent = "Повторить отправку";
      goal("service_lead_failure",{request:"design-project"});
      token = "";
      ensureCaptcha(true);
    } finally {
      sending = false;
      back.disabled = modeButton.disabled = delivered;
      ready();
    }
  });
  document.querySelectorAll("[data-scroll-lead]").forEach(button => button.addEventListener("click", () => {
    if (!sending && !delivered && button.dataset.package) {
      form.elements.package.value = button.dataset.package;
      form.elements.package.dispatchEvent(new Event("change",{bubbles:true}));
      mode.value = "brief";
      show(0,false);
    }
    goal("service_lead_start",{request:"design-project"});
    form.scrollIntoView({behavior:"smooth",block:"start"});
    steps[step].querySelector("legend").focus({preventScroll:true});
  }));
  document.querySelectorAll("[data-call-link]").forEach(link => link.addEventListener("click",() => goal("service_call")));
  const mobile = document.querySelector("[data-mobile-actions]");
  if (mobile) {
    const visible = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      mobile.hidden = visible.size > 0;
    },{threshold:0.01});
    [document.querySelector(".service-hero"),form,document.querySelector("[data-page-footer]")].filter(Boolean).forEach(element => observer.observe(element));
  }
  show(0,false);
})();
