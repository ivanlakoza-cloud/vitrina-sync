(function(){
  const statusEl = document.getElementById('status');
  const diagEl = document.getElementById('diag');

  function now(){ const d=new Date(); return d.toTimeString().slice(0,8); }
  function log(msg){ if(!diagEl) return; diagEl.textContent += `[${now()}] ${msg}\n`; }
  function setStatus(text, type){
    statusEl.textContent = text;
    statusEl.className = 'status' + (type ? ' '+type : '');
  }

  // Ensure Bitrix API tag exists (inside B24 виджет он обычно уже вставлен)
  function ensureApiTag(){
    const present = !!document.querySelector('script[src*="api.bitrix24.com/api/v1"]');
    if (present){ log('api/v1: script tag detected'); return Promise.resolve(); }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://api.bitrix24.com/api/v1/';
      s.async = true;
      s.onload = () => { log('api/v1: injected manually'); resolve(); };
      s.onerror = () => { log('api/v1: failed to load'); reject(new Error('b24 api failed')); };
      document.head.appendChild(s);
    });
  }

  function waitForBX24(timeoutMs=8000){
    return new Promise((resolve, reject)=>{
      const t0 = Date.now();
      (function tick(){
        if (window.BX24){ resolve(); return; }
        if (Date.now()-t0 > timeoutMs){ reject(new Error('BX24 not found')); return; }
        setTimeout(tick, 50);
      })();
    });
  }

  async function boot(){
    try {
      await ensureApiTag();
      await waitForBX24();
      log('BX24 detected');

      // Инициализация виджета
      BX24.init(function(){
        log('BX24.init: done');

        try {
          BX24.placement.info(function(info){
            log('placement: ' + JSON.stringify(info));
            setStatus('Готово', 'ok');
          });
        } catch(e){
          log('placement.info error: ' + (e && (e.message || e.stack) || String(e)));
          setStatus('B24 подключен, placement недоступен', 'error');
        }
      });
    } catch(e){
      log('error: ' + (e && (e.message || e.stack) || String(e)));
      setStatus('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
    }
  }

  setStatus('Подключаемся к порталу...');
  boot();
})();
