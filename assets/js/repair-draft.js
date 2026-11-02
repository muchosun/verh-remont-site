(() => {
  "use strict";
  const preview = window.VERH_PREVIEW || location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const pending = new Map();
  let current;
  function capture(endpoint, {phone, source, consent, website = ""}) {
    if (preview) return Promise.resolve({status:"preview"});
    const key = String(phone).replace(/\D/g, "");
    for (const [phoneKey, entry] of pending) if (entry.expires <= Date.now()) pending.delete(phoneKey);
    if (pending.has(key)) { current = pending.get(key).task; return current; }
    const task = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(endpoint, {method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({kind:"repair_draft",phone,source,consent,website,intakeMode:"smartcaptcha-monitor-v1"}),
          signal:controller.signal,keepalive:true});
        if (!response.ok) throw Error("Draft delivery unavailable");
        const saved = await response.json();
        if (saved.status !== "draft_saved" || saved.qualification !== "incomplete" || saved.paidGoal !== false
          || !["repair_main", "repair_calculator"].includes(saved.formType) || typeof saved.receipt !== "string"
          || !saved.receipt || !Array.isArray(saved.successGoals) || saved.successGoals.length) throw Error("Draft not confirmed");
        return saved;
      } catch {
        pending.delete(key);
        return null;
      } finally { clearTimeout(timer); }
    })();
    pending.set(key, {task,expires:Date.now()+600000});
    current = task;
    return task;
  }
  window.VerhRepairDraft = Object.freeze({capture,receipt:async () => (await current)?.receipt});
})();
