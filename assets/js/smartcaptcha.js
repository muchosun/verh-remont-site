(() => {
  "use strict";
  const sitekey = "ysc1_JESHIDtN4FaZjAZyhtoVXVLzMcnh8DbIR5wbks313f7392fa";
  const mode = "smartcaptcha-v1";
  const monitorMode = "smartcaptcha-monitor-v1";
  const formTypes = /^(repair_(main|callback|calculator)|design_(brief|callback)|service_(priemka_kvartiry|ukladka_laminata|pokleyka_oboev|shpaklevka_sten|ukladka_plitki|razvodka_santehniki|natyazhnoy_potolok))$/;
  const goalPolicy = "verified-goals-v1";
  const verifiedReported = new Set();
  const allowedGoals = Object.freeze({repair_main:["quiz_lead_success"],repair_callback:["callback_requested","callback_lead_success"],repair_calculator:["calculator_lead_success"],design_brief:["design_project_brief_delivered","service_lead_success"],design_callback:["design_callback_delivered","service_lead_success"]});
  let loading;
  function load() {
    if (window.smartCaptcha) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve,reject) => {
      const script = document.createElement("script");
      const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(Object.assign(new Error("CAPTCHA unavailable"),{code:"unavailable"})); };
      const timer = setTimeout(fail,12000);
      window.verhSmartCaptchaLoaded = () => { clearTimeout(timer); if (window.smartCaptcha) resolve(); else fail(); };
      script.src = "https://smartcaptcha.cloud.yandex.ru/captcha.js?render=onload&onload=verhSmartCaptchaLoaded";
      script.async = true;
      script.onerror = fail;
      document.head.append(script);
    });
    return loading;
  }
  async function getToken() {
    await load();
    return new Promise((resolve,reject) => {
      const container = document.createElement("div");
      document.body.append(container);
      let widget, done = false, cancelTimer;
      const finish = (error,token) => {
        if (done) return;
        done = true;clearTimeout(timer);clearTimeout(cancelTimer);
        if (widget !== undefined) { try { window.smartCaptcha.destroy(widget); } catch {} }
        container.remove();
        if (error) reject(Object.assign(new Error("CAPTCHA was not confirmed"),{code:typeof error==="string"?error:"failed"})); else resolve(token);
      };
      const timer = setTimeout(() => finish("timeout"),120000);
      try {
        widget = window.smartCaptcha.render(container,{
          sitekey,invisible:true,hl:"ru",hideShield:false,shieldPosition:"bottom-left",
          callback:token => finish(typeof token !== "string" || !token,token),
        });
        for (const event of ["network-error","javascript-error","token-expired"]) window.smartCaptcha.subscribe(widget,event,() => finish(event === "token-expired" ? "timeout" : "unavailable"));
        window.smartCaptcha.subscribe(widget,"challenge-hidden",() => { cancelTimer = setTimeout(() => finish("cancelled"),500); });
        window.smartCaptcha.execute(widget);
      } catch { finish(true); }
    });
  }
  function reportStatus(form,state) {
    try {
      if(typeof window.ym==="function") window.ym(110859289,"params",{captcha_monitor:{form,status:state,goal_policy:goalPolicy}});
    } catch { /* Monitoring must not change the delivery result. */ }
  }
  function reportVerified(result,updated) {
    if(result.duplicate || updated.duplicate || verifiedReported.has(result.leadId) || updated.goalPolicy!==goalPolicy || updated.verification!=="smartcaptcha" || updated.captchaStatus!=="passed" || updated.leadId!==result.leadId) return;
    const expected=allowedGoals[result.formType] || (result.formType.startsWith("service_")?["service_lead_success"]:[]);
    if(!Array.isArray(updated.successGoals) || updated.successGoals.length!==expected.length || updated.successGoals.some((goal,i)=>goal!==expected[i])) return;
    const key=`verh-verified-goal-${result.leadId}`;
    try {if(sessionStorage.getItem(key))return;} catch {}
    if(typeof window.ym!=="function") return;
    verifiedReported.add(result.leadId);
    try {sessionStorage.setItem(key,"1");} catch {}
    for(const goal of expected) {
      try {window.ym(110859289,"reachGoal",goal,{form:result.formType,verification:"smartcaptcha"});} catch { /* Do not repeat ambiguous goal sends. */ }
    }
  }
  async function post(endpoint,body,keepalive=false) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:controller.signal,keepalive});
      if(!response.ok) throw Error("Delivery endpoint unavailable");
      return await response.json();
    } finally {clearTimeout(timer);}
  }
  async function recordOutcome(endpoint,result) {
    let token, outcome;
    try {token=await getToken();}
    catch(error) {outcome=["cancelled","timeout","unavailable","failed"].includes(error?.code)?error.code:"failed";}
    try {
      const updated=await post(endpoint,{intakeMode:monitorMode,phase:"result",receipt:result.receipt,smartCaptchaToken:token,captchaOutcome:outcome},true);
      if(updated.status!=="monitor_updated"||updated.goalPolicy!==goalPolicy||updated.formType!==result.formType||!["passed","cancelled","timeout","unavailable","failed"].includes(updated.captchaStatus)) throw Error("Status update not confirmed");
      reportStatus(result.formType,updated.captchaStatus);
      reportVerified(result,updated);
    } catch {reportStatus(result.formType,"status_update_failed");}
  }
  async function submit(endpoint,payload) {
    // Save the explicit submission before starting a challenge that may be abandoned.
    const result=await post(endpoint,{...payload,intakeMode:monitorMode,turnstileToken:undefined,smartCaptchaToken:undefined});
    if(result.status!=="accepted_unverified"||result.qualification!=="unverified"||result.intakeMode!==monitorMode||result.paidGoal!==false||!result.leadId||!formTypes.test(result.formType)||typeof result.duplicate!=="boolean"||typeof result.receipt!=="string"||!result.receipt) throw Error("Monitoring delivery was not confirmed");
    if(!result.duplicate) {
      reportStatus(result.formType,"pending");
      setTimeout(()=>{void recordOutcome(endpoint,result);},0);
    }
    return {status:"unverified",qualification:"unverified",leadId:result.leadId,formType:result.formType,duplicate:result.duplicate};
  }
  window.VerhSmartCaptcha = Object.freeze({mode,getToken,monitoring:true,submit});
  window.VerhCaptcha = window.VerhSmartCaptcha;
})();
