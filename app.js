
(function(){
  const version = 30;
  const el = sel => document.querySelector(sel);
  const diag = el('#diag');
  const statusEl = el('#status');
  const submitBtn = el('#submit');

  log(`boot v${version}`);
  log(`path=/b24/soglasovanie-ceny`);
  log(`query=${location.search || '(empty)'}`);

  function log(t){ const li=document.createElement('li'); li.textContent=t; diag.appendChild(li); }
  function setStatus(msg, type='info'){ statusEl.textContent = msg; statusEl.className = 'status '+type; }
  function getQS(keys){
    const q = new URLSearchParams(location.search);
    for(const k of keys){ const v=q.get(k); if(v) return v; }
    return '';
  }

  // ---- BX24 Handshake ----
  loadBx24(function ready(){
    if(!window.BX24){ setStatus('BX24 не загрузился', 'error'); return; }
    log(`typeof BX24=${typeof BX24}`);

    // Use ready if available
    if (BX24.ready) {
      BX24.ready(init);
    } else {
      // very rare, but just in case
      setTimeout(init, 0);
    }
  });

  function loadBx24(cb){
    if (window.BX24) return cb();
    // When inside Bitrix iframe we can load from api host safely
    const s = document.createElement('script');
    s.src = 'https://api.bitrix24.com/api/v1/';
    s.onload = cb;
    s.onerror = () => setStatus('Не удалось подключить скрипт BX24', 'error');
    document.head.appendChild(s);
  }

  function init(){
    // placement & deal id detection
    try {
      BX24.placement.info(function(p){
        log(`placement: ${p && p.placement || 'n/a'}`);
        const opt = (p && p.options) || {};
        let dealId = opt.ID || getQS(['ID','id','deal_id','DEAL_ID','entityId']);

        if(!dealId && document.referrer){
          const m = document.referrer.match(/\/crm\/deal\/details\/(\d+)\//);
          if(m) dealId = m[1];
        }

        if(!dealId){
          setStatus('ID сделки не найден. Откройте виджет из карточки сделки.', 'error');
          return;
        }

        log(`dealId=${dealId}`);
        hydrate(dealId);
      });
    } catch(e){
      setStatus('Ошибка инициализации BX24: '+e.message, 'error');
    }
  }

  function hydrate(id){
    setStatus('Подключаемся к порталу...');
    BX24.callMethod('crm.deal.get', { id: id }, function(res){
      if (res.error()) {
        setStatus('crm.deal.get: '+res.error_description(), 'error');
        return;
      }
      const deal = res.data();
      log('deal.title='+(deal && deal.TITLE ? deal.TITLE : '—'));
      setStatus('Данные сделки получены. Можно отправлять.');
      // allow send
      submitBtn.classList.add('enabled');
      submitBtn.disabled = false;
      submitBtn.addEventListener('click', onSend);
    });
  }

  function onSend(){
    submitBtn.disabled = true;
    // here normally: BX24.callMethod to start BP etc.
    el('#result').hidden = false;
    setStatus('');
  }
})();
