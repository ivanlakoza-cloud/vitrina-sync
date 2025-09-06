(()=>{
  const $ = (q)=>document.querySelector(q);
  const logBox = $("#log");
  const statusEl = $("#status");
  const reloadBtn = $("#reloadBtn");
  const copyBtn = $("#copyBtn");

  const log = (...args)=>{
    const t = new Date().toTimeString().slice(0,8);
    const line = `[${t}] ` + args.map(a=>{
      try { return typeof a === 'string' ? a : JSON.stringify(a,null,2) }
      catch { return String(a) }
    }).join(' ');
    console.log(line);
    if (logBox) logBox.textContent += line + "\n";
  };

  reloadBtn?.addEventListener('click', ()=>location.reload());
  copyBtn?.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(logBox.textContent||''); copyBtn.textContent='Скопировано ✓'; setTimeout(()=>copyBtn.textContent='Скопировать логи',1500);}catch(e){alert('Не удалось скопировать: '+e);}
  });

  // Абсолютный путь к API v1 скрипту Bitrix24
  function ensureBx24Script(){
    if (typeof window.BX24 !== 'undefined'){ log('api/v1: script tag detected'); return Promise.resolve(); }
    return new Promise((resolve,reject)=>{
      const s = document.createElement('script');
      s.src = 'https://api.bitrix24.com/api/v1/';
      s.async = true;
      s.onload = ()=>{ log('api/v1: injected manually'); resolve(); };
      s.onerror = ()=>reject(new Error('Failed to load api/v1'));
      document.head.appendChild(s);
    });
  }

  async function waitBx24Init(timeoutMs=5000){
    return new Promise((resolve,reject)=>{
      const to = setTimeout(()=>reject(new Error('BX24.init timeout')), timeoutMs);
      try {
        window.BX24.init(()=>{ clearTimeout(to); resolve(); });
      } catch (e){
        clearTimeout(to); reject(e);
      }
    });
  }

  function dumpEnv(){
    const env = {
      href: location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    };
    log('Environment', env);
  }

  async function main(){
    statusEl.textContent = 'Подключаемся к порталу...';
    dumpEnv();
    try {
      await ensureBx24Script();
      log('BX24 detected');
      await waitBx24Init(6000);
      log('BX24.init: done');

      // пробуем получить базовую информацию
      const auth = (window.BX24 && window.BX24.getAuth ? window.BX24.getAuth() : null) || {};
      log('getAuth()', auth);
      if (window.BX24?.getLang) log('getLang()', window.BX24.getLang());

      // пробуем placement.info с ретраями
      const maxTries = 3;
      let placement = null, lastErr=null;
      for (let i=0;i<maxTries;i++){
        try{
          placement = await new Promise((resolve,reject)=>{
            let done=false;
            setTimeout(()=>{ if(!done) reject(new Error('placement timeout')); }, 1500 + i*500);
            window.BX24.placement.info((d)=>{ done=true; resolve(d); });
          });
          break;
        }catch(e){ lastErr = e; }
      }
      if (placement) log('placement.info', placement);
      else log('placement.info: timeout (no callback)');

      statusEl.textContent = 'Готово';
    } catch(e){
      log('Ошибка инициализации', (e && (e.stack || e.message)) || String(e));
      statusEl.textContent = 'Ошибка инициализации';
    }
  }

  window.addEventListener('load', main, { once:true });
})();