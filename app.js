
(() => {
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const btnRetry = document.getElementById('btn-retry');
  const btnCopy = document.getElementById('btn-copy');

  function now(){ const d=new Date(); return d.toTimeString().slice(0,8); }
  function setStatus(text, type='info'){ statusEl.textContent = text; statusEl.className = `status ${type}`; }
  function j(obj){
    try{
      return JSON.stringify(obj, (k,v) => {
        if (typeof v === 'function') return `[Function ${v.name||'fn'}]`;
        if (v instanceof Error) return {name:v.name,message:v.message,stack:v.stack};
        return v;
      }, 2);
    }catch(e){ return String(obj); }
  }
  function log(line, payload){
    const head = `[${now()}] ${line}`;
    if (payload !== undefined){
      logEl.textContent += `${head}\n${j(payload)}\n\n`;
    } else {
      logEl.textContent += head + "\n";
    }
    logEl.scrollTop = logEl.scrollHeight;
  }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  btnRetry?.addEventListener('click', () => location.reload());
  btnCopy?.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(logEl.textContent || '');
      setStatus('Логи скопированы в буфер обмена', 'ok');
    }catch(e){ setStatus('Не удалось скопировать логи: '+(e?.message||e), 'warn'); }
  });

  // ---- Step 1. Basic environment info
  log('env.href', location.href);
  log('env.referrer', document.referrer || '(empty)');
  log('env.userAgent', navigator.userAgent);

  // ---- Step 2. Inject Bitrix24 API if needed
  function injectApi(){
    if (window.BX24){
      log('api/v1: already present');
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://api.bitrix24.com/api/v1/';
      s.async = true;
      s.onload = () => { log('api/v1: script tag loaded'); resolve(); };
      s.onerror = () => reject(new Error('Failed to load api/v1'));
      document.head.appendChild(s);
      log('api/v1: script tag injected');
    });
  }

  // ---- Step 3. Wait BX24 object
  async function waitBX24(ms=10000){
    const started = Date.now();
    while (Date.now() - started < ms){
      if (window.BX24){ log('BX24 detected'); return; }
      await sleep(100);
    }
    throw new Error('BX24 не появился в окне за '+ms+'мс');
  }

  function bxCall(method, params={}){
    return new Promise((resolve) => {
      try{
        window.BX24.callMethod(method, params, (r) => {
          if (r && r.error()){
            resolve({ ok:false, error: r.error(), error_description: r.error_description() });
          } else {
            resolve({ ok:true, result: r ? r.data() : null });
          }
        });
      }catch(e){
        resolve({ ok:false, error:'exception', error_description: e?.message || String(e) });
      }
    });
  }

  async function main(){
    try{
      setStatus('Подключаемся к порталу…');
      await injectApi();
      await waitBX24(15000);

      // init
      await new Promise((resolve, reject) => {
        try {
          window.BX24.init(() => { log('BX24.init: done'); resolve(); });
        } catch(e) { reject(e); }
      });

      // ---- Dump everything useful
      const auth = (typeof BX24.getAuth === 'function') ? BX24.getAuth() : null;
      log('BX24.getAuth()', auth);

      const lang = (typeof BX24.getLang === 'function') ? BX24.getLang() : '(n/a)';
      log('BX24.getLang()', lang);

      // placement
      const placement = await new Promise((resolve) => {
        try {
          BX24.placement.info((info) => resolve(info));
        } catch(e) { resolve({ error: 'placement.exception', message: e?.message || String(e) }); }
      });
      log('BX24.placement.info', placement);

      // Try to guess dealId
      let dealId = null;
      const q = new URLSearchParams(location.search);
      dealId = q.get('ID') || q.get('id') || q.get('deal_id') || q.get('DEAL_ID');
      if (!dealId && placement && placement.options){
        dealId = placement.options.ID || placement.options.deal_id || placement.options.DEAL_ID;
      }
      log('dealId (guessed)', dealId || '(none)');

      // Lightweight API calls (safe to call; will just log errors if perms missing)
      const user = await bxCall('user.current');
      log('user.current', user);

      const appInfo = await bxCall('app.info');
      log('app.info', appInfo);

      const dealFields = await bxCall('crm.deal.fields');
      log('crm.deal.fields', dealFields);

      if (dealId){
        const deal = await bxCall('crm.deal.get', { id: dealId });
        log('crm.deal.get', deal);
      } else {
        log('crm.deal.get', { ok:false, error:'no_deal_id', error_description:'Не удалось определить ID сделки' });
      }

      setStatus('Готово', 'ok');
    } catch(e){
      log('fatal', { name: e?.name, message: e?.message, stack: e?.stack });
      setStatus('Ошибка: ' + (e?.message || String(e)), 'err');
    }
  }

  // kick
  main();
})();
