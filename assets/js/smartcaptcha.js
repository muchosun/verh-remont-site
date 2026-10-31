(() => {
  "use strict";
  const sitekey = "ysc1_JESHIDtN4FaZjAZyhtoVXVLzMcnh8DbIR5wbks313f7392fa";
  const mode = "smartcaptcha-v1";
  let loading;
  function load() {
    if (window.smartCaptcha) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve,reject) => {
      const script = document.createElement("script");
      const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error("CAPTCHA unavailable")); };
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
        if (error) reject(new Error("CAPTCHA was not confirmed")); else resolve(token);
      };
      const timer = setTimeout(() => finish(true),120000);
      try {
        widget = window.smartCaptcha.render(container,{
          sitekey,invisible:true,hl:"ru",hideShield:false,shieldPosition:"bottom-left",
          callback:token => finish(typeof token !== "string" || !token,token),
        });
        for (const event of ["network-error","javascript-error","token-expired"]) window.smartCaptcha.subscribe(widget,event,() => finish(true));
        window.smartCaptcha.subscribe(widget,"challenge-hidden",() => { cancelTimer = setTimeout(() => finish(true),500); });
        window.smartCaptcha.execute(widget);
      } catch { finish(true); }
    });
  }
  window.VerhSmartCaptcha = Object.freeze({mode,getToken});
  window.VerhCaptcha = window.VerhSmartCaptcha;
})();
