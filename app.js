
(function(){
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const btnRetry = document.getElementById('btn-retry');
  const btnCopy = document.getElementById('btn-copy');

  function ts(){ const d=new Date(); return `[${d.toTimeString().slice(0,8)}]`; }
  function line(kind,msg,obj){
    const color = kind==='fatal'?'#ff9aa6': kind==='warn'?'#f8d77e': kind==='ok'?'#a6f3c1':'#a9b4c7';
    let s = `${ts()} ${msg}`;
    if (obj!==undefined){
      try{ s += "\n" + JSON.stringify(obj, null, 2); }catch{ s += "\n" + String(obj); }
    }
    logEl.textContent += (logEl.textContent ? "\n" : "") + s;
    logEl.scrollTop = logEl.scrollHeight;
    console[kind==='fatal'?'error':(kind==='warn'?'warn':'log')](s);
  }
  function setStatus(kind,msg){
    statusEl.className = `status status-${kind}`;
    statusEl.textContent = msg;
  }
  window.addEventListener('error', (e)=> line('fatal', `window.onerror: ${e.message}`, {stack:e.error && e.error.stack}));
  window.addEventListener('unhandledrejection', (e)=> line('fatal', `unhandledrejection: ${e.reason && e.reason.message || e.reason}`, {reason:e.reason}));

  btnCopy.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(logEl.textContent);
      setStatus('ok','Логи скопированы в буфер 👍');
    }catch(e){
      setStatus('warn','Не удалось скопировать, выделите и скопируйте вручную');
    }
  });
  btnRetry.addEventListener('click', ()=>location.reload());

  function injectApiIfNeeded(){
    if (window.BX24) { return Promise.resolve('present'); }
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://api.bitrix24.com/api/v1/';
      s.async=true;
      s.onload=()=>resolve('injected');
      s.onerror=()=>reject(new Error('api/v1: failed to load'));
      document.head.appendChild(s);
    });
  }

  function guessDealIdFromQuery(){
    try{
      const qs = new URLSearchParams(location.search);
      const id = qs.get('id') || qs.get('deal_id') || qs.get('DEAL_ID');
      return id ? String(id) : null;
    }catch{ return null; }
  }

  async function main(){
    setStatus('info','Подключаемся к порталу…');

    try{
      const inj = await injectApiIfNeeded();
      line('ok', inj==='present' ? 'api/v1: already present' : 'api/v1: injected manually');

      if (typeof window.BX24 === 'undefined'){
        setStatus('error','BX24 не найден после подключения api/v1');
        line('fatal','BX24 is undefined');
        return;
      }
      line('ok','BX24 detected', { type: typeof BX24, keys: Object.keys(BX24||{}).length });

      // Init
      await new Promise((resolve)=>{
        try{
          BX24.init(()=>resolve());
        }catch(e){
          line('warn','BX24.init threw', {message:e.message, stack:e.stack});
          resolve();
        }
      });
      line('ok','BX24.init: done');
      setStatus('ok','Готово');

      // Dump basic environment
      line('info','Environment', {
        href: location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      });

      // Get placement.info
      await new Promise((resolve)=>{
        let done=false;
        try{
          BX24.placement.info((d)=>{
            done=true;
            line('ok','placement.info', d);
            resolve();
          });
          setTimeout(()=>{ if(!done){ line('warn','placement.info: timeout (no callback in 1500ms)'); resolve(); }},1500);
        }catch(e){
          line('fatal','placement.info error', {message:e.message, stack:e.stack});
          resolve();
        }
      });

      // getAuth / getLang
      try{ line('ok','getAuth()', BX24.getAuth()); }catch(e){ line('warn','getAuth() failed', {message:e.message}); }
      try{ line('ok','getLang()', BX24.getLang && BX24.getLang()); }catch(e){ line('warn','getLang failed', {message:e.message}); }

      // Guess deal id
      let dealId = guessDealIdFromQuery();
      // also try via placement options
      try{
        BX24.placement.info((d)=>{
          if (!dealId){
            const o=d && d.options || {};
            dealId = o.ID || o.DEAL_ID || o.entityId || o.dealId || dealId;
            line('info','dealId (guessed)', {dealId});
          }
        });
      }catch{ /*noop*/ }

      // Safe wrapper for callMethod
      function bxCall(method, params){
        return new Promise((resolve)=>{
          try{
            BX24.callMethod(method, params||{}, (res)=>{
              if(res && res.error()){
                line('warn', `${method}: error`, res.error());
                resolve({error: res.error()});
              }else{
                const data = res && res.data ? res.data() : undefined;
                line('ok', `${method}: ok`, data);
                resolve({data});
              }
            });
          }catch(e){
            line('fatal', `${method}: threw`, {message:e.message, stack:e.stack});
            resolve({error:{message:e.message}});
          }
        });
      }

      await bxCall('user.current');
      await bxCall('app.info');
      await bxCall('crm.deal.fields');
      if (dealId){ await bxCall('crm.deal.get', { id: dealId }); }
    }catch(e){
      setStatus('error','Ошибка инициализации');
      line('fatal','init failed', {message:e.message, stack:e.stack});
    }
  }

  main();
})();
