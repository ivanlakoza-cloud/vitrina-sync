
(function(){
  const v='v25';
  const diag = document.getElementById('diag');
  const statusEl = document.getElementById('status');
  const submit = document.getElementById('submit');
  const qs = location.search || '';
  const path = location.pathname;

  function li(s){ const el=document.createElement('li'); el.textContent=s; diag.appendChild(el); }
  li(`boot ${v}`);
  li(`path=${path}`);
  li(`query=${qs || '(none)'}`);
  li(`typeof BX24=${typeof window.BX24}`);

  function setStatus(msg, type='info'){
    if(!statusEl) return;
    statusEl.className = 'status ' + type;
    statusEl.textContent = msg;
  }

  if (!window.BX24) {
    setStatus('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
    return;
  }

  // Try to obtain deal ID from placement options OR from POST we injected.
  function resolveDealId(cb){
    try {
      window.BX24.placement.info(function(info){
        try{
          const raw = info && (info.options || info.placementOptions || info.PLACEMENT_OPTIONS);
          let id = null;
          if (typeof raw === 'string'){
            try { id = JSON.parse(raw).ID || JSON.parse(raw).id || null; } catch(e){}
          } else if (raw && (raw.ID || raw.id)) id = raw.ID || raw.id;
          if(!id && window.__B24_POST__){
            id = window.__B24_POST__.id || window.__B24_POST__.ID || window.__B24_POST__.deal_id || window.__B24_POST__.DEAL_ID || null;
          }
          cb(id);
        }catch(e){ cb(null); }
      });
    } catch(e){ cb(null); }
  }

  setStatus('Подключаемся к порталу…');
  resolveDealId(function(dealId){
    if(!dealId){
      setStatus('Не удалось определить ID сделки. Откройте виджет из карточки сделки.', 'error');
      return;
    }
    li(`dealId=${dealId}`);
    // Enable button just to show end-to-end
    submit.removeAttribute('disabled');
    submit.addEventListener('click', function(){
      // Imitate success UI, actual BP start can be wired later
      document.getElementById('done').style.display = '';
      setStatus('Готово.');
    }, { once:true });
    setStatus('Готово к работе.');
  });
})();
