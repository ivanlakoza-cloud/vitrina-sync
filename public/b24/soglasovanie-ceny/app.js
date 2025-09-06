// v28 — robust BX24 detection (+long wait, live diagnostics)
(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const box = qs('#status') || document.body.appendChild(Object.assign(document.createElement('div'),{id:'status',className:'status info'}));
  const diagsEl = qs('#diags');
  const logs = [];
  function diag(msg){ logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); if(diagsEl){ diagsEl.textContent = logs.join('\n'); diagsEl.hidden = false; } }
  function setStatus(msg, type='info'){ if(!box) return; box.textContent = msg; box.className = `status ${type}`; }

  // guarantee api/v1 is present
  function ensureApiScript(){
    const has = !!document.querySelector('script[src*="api.bitrix24.com/api/v1"]');
    if(has){ diag('api/v1: script tag detected'); return; }
    const s = document.createElement('script');
    s.src = 'https://api.bitrix24.com/api/v1/';
    s.onload = ()=>diag('api/v1: loaded (onload)');
    s.onerror = ()=>diag('api/v1: load error');
    document.head.appendChild(s);
    diag('api/v1: appended dynamically');
  }

  function renderConnected(){
    // тут может быть ваша дальнейшая инициализация
    setStatus('Подключаемся к порталу…');
    try{
      if(typeof BX24 !== 'undefined' && BX24 && typeof BX24.placement?.info === 'function'){
        BX24.placement.info(function(d){
          diag('placement: ' + JSON.stringify(d));
        });
      }else{
        diag('BX24 присутствует, но placement.info недоступен');
      }
    }catch(e){ diag('placement.info threw: ' + (e && (e.stack || e.message) || String(e))); }
  }

  function boot(){
    setStatus('Загрузка…');
    ensureApiScript();

    let tries = 0;
    const maxTries = 100; // 100 * 100ms = 10s
    const tipShownAt = 12; // 1.2s
    const iv = setInterval(function(){
      const ok = (typeof window.BX24 !== 'undefined') && window.BX24 && typeof window.BX24.init === 'function';
      if(ok){
        clearInterval(iv);
        diag('BX24 detected');
        try{
          // частая практика — вызывать init (без него часть методов не отвечает)
          BX24.init(function(){ diag('BX24.init: done'); renderConnected(); });
        }catch(e){ diag('BX24.init error: ' + (e && (e.stack || e.message) || String(e))); renderConnected(); }
        return;
      }
      tries++;
      if(tries === tipShownAt){ setStatus('BX24 пока не найден… продолжаю ждать (до 10 сек)'); }
      if(tries >= maxTries){
        clearInterval(iv);
        setStatus('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
        diag('BX24 not detected after 10s. typeof BX24=' + typeof window.BX24);
      }
    }, 100);
  }

  // DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }
})();