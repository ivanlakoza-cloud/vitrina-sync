(function(){
  const $ = sel => document.querySelector(sel);
  const statusEl = $('#status');
  const logEl = $('#log');
  const t0 = Date.now();

  function time(){ const d = new Date(); return '['+d.toLocaleTimeString('ru-RU',{hour12:false})+'] '; }
  function log(line){ if(!logEl) return; logEl.textContent += time()+ line + "\n"; }
  function setStatus(text, type){ if(statusEl){ statusEl.textContent = text; statusEl.className = 'status'+(type?(' '+type):''); } }

  async function waitFor(predicate, timeout=8000, step=80){
    const start = performance.now();
    while(performance.now() - start < timeout){
      try { if(predicate()) return true; } catch(e){}
      await new Promise(r => setTimeout(r, step));
    }
    return false;
  }

  function ensureApiScript(){
    if(window.BX24){ log('api/v1: script tag detected'); return true; }
    // try to find existing <script src=".../api/v1/">
    const has = Array.from(document.scripts || []).some(s => (s.src||'').includes('api.bitrix24.com/api/v1'));
    if(has){ log('api/v1: script tag detected'); return true; }
    // inject
    const s = document.createElement('script');
    s.src = 'https://api.bitrix24.com/api/v1/';
    s.async = true;
    document.head.appendChild(s);
    log('api/v1: injected manually');
    return true;
  }

  async function boot(){
    setStatus('Подключаемся к порталу…');
    ensureApiScript();

    const okBX = await waitFor(() => typeof window.BX24 === 'function', 10000);
    if(!okBX){ setStatus('Не удалось загрузить API Bitrix24 (BX24)', 'error'); log('BX24 not available'); return; }
    log('BX24 detected');

    // BX24.init
    const inited = await new Promise(resolve => {
      try{
        window.BX24.init(function(){ resolve(true); });
        // fallback if callback is never called
        setTimeout(() => resolve('timeout'), 7000);
      }catch(e){ resolve(false); }
    });
    if(inited !== true){ setStatus('BX24.init не ответил', 'error'); log('BX24.init: failed or timeout'); return; }
    log('BX24.init: done');

    // try placement.info to confirm we're inside placement
    try{
      window.BX24.placement.info(function(data){
        try{
          log('placement: ' + JSON.stringify(data));
        }catch(e){}
        setStatus('Готово', 'ok');
      });
    }catch(e){
      log('placement.info error: ' + (e && (e.message||e)));
      setStatus('Готово', 'ok'); // даже если нет placement — API работает
    }
  }

  // start
  boot();
})();
