
(function(){
  const $ = s=>document.querySelector(s);
  const logEl = $('#log');
  const statusEl = $('#status');
  function log(line){
    const stamp = new Date().toTimeString().slice(0,8);
    logEl.textContent += `[${stamp}] ` + line + '\n';
  }
  function status(msg, cls='info'){
    statusEl.className = 'status ' + cls;
    statusEl.textContent = msg;
  }

  // ensure api script tag is present (Bitrix should inject it, but we self-heal)
  function ensureApi(){
    const has = !!document.querySelector('script[src*="api.bitrix24.com/api/v1"]');
    if(has){ log('api/v1: script tag detected'); return; }
    const s = document.createElement('script');
    s.src = 'https://api.bitrix24.com/api/v1/';
    s.async = true;
    document.head.appendChild(s);
    log('api/v1: injected manually');
  }

  function waitForBX24(timeoutMs=10000){
    return new Promise((resolve, reject)=>{
      const started = Date.now();
      const iv = setInterval(()=>{
        if (window.BX24){
          clearInterval(iv);
          log('BX24 detected');
          resolve(window.BX24);
        } else if (Date.now()-started > timeoutMs){
          clearInterval(iv);
          reject(new Error('BX24 not found after '+timeoutMs+'ms'));
        }
      }, 60);
    });
  }

  async function boot(){
    try{
      status('Подключаемся к порталу...');
      ensureApi();
      const BX24 = await waitForBX24(10000);
      await new Promise((res)=>{
        try{
          BX24.init(()=>{ log('BX24.init: done'); res(); });
        }catch(e){ log('BX24.init error: '+(e?.message||e)); res();}
      });

      // get placement info to prove we’re inside B24
      BX24.placement.info((info)=>{
        window.__B24_PLACEMENT__ = info;
        log('placement: '+JSON.stringify(info));
        status('Готово', 'ok');
        // here you can continue rendering the real UI (fields, etc.)
      });
    }catch(e){
      log('boot error: '+ (e?.message || String(e)));
      status('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
    }
  }

  boot();
})();
