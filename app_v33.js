
(function(){
  const q = new URLSearchParams(location.search);
  const diag = document.getElementById('diag');
  const statusEl = document.getElementById('status');
  const submitBtn = document.getElementById('submit');
  const doneEl = document.getElementById('done');

  function log(row){ const li = document.createElement('li'); li.textContent = row; diag.appendChild(li); }

  log('boot v33');
  log('path=' + location.pathname);
  log('query=' + (location.search || '—'));

  function setStatus(msg, ok){
    statusEl.textContent = msg;
    statusEl.className = 'status' + (ok ? ' ok' : '');
  }

  // Guard: BX24 presence
  if (typeof window.BX24 === 'undefined'){
    setStatus('BX24 не доступен. Откройте виджет из карточки сделки.', false);
    return;
  }

  // Main init
  BX24.init(function(){
    try {
      BX24.placement.info(function(info){
        const placement = (info && info.placement) || 'N/A';
        const opts = (info && info.options) || {};
        let dealId = q.get('id') || q.get('deal_id') || q.get('entityId') || q.get('ID') || q.get('DEAL_ID') || opts.ID;

        if(!dealId){
          const m = (document.referrer || '').match(/\/crm\/deal\/details\/(\d+)\//);
          if (m) dealId = m[1];
        }

        log('typeof BX24=' + typeof BX24);
        log('placement=' + placement);
        if (dealId) log('detected dealId=' + dealId);

        if(!dealId){
          setStatus('Не удалось определить ID сделки. Откройте виджет в карточке сделки.', false);
          return;
        }

        // Check deal exists
        setStatus('Читаем сделку #' + dealId + ' …');
        BX24.callMethod('crm.deal.get', { id: dealId }, function(r){
          if (r.error()){
            setStatus('Ошибка crm.deal.get: ' + r.error_description(), false);
            return;
          }
          const deal = r.data();
          setStatus('Сделка загружена: #' + deal.ID + ' — ' + (deal.TITLE || ''), true);
          submitBtn.disabled = false;

          submitBtn.addEventListener('click', function(){
            submitBtn.disabled = true;
            submitBtn.textContent = 'ОТПРАВЛЯЕМ…';

            // Запуск бизнес‑процесса 209
            BX24.callMethod('bizproc.workflow.start', {
              TEMPLATE_ID: 209,
              DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_' + deal.ID],
              PARAMETERS: {}
            }, function(res){
              if (res.error()){
                setStatus('Ошибка запуска БП: ' + res.error_description(), false);
                submitBtn.disabled = false;
                submitBtn.textContent = 'ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ';
                return;
              }
              setStatus('БП запущен, идентификатор: ' + res.data(), true);
              doneEl.classList.remove('hidden');
              submitBtn.textContent = 'ОТПРАВЛЕНО';
            });
          });
        });
      });
    } catch(e){
      setStatus('Инициализация не удалась: ' + (e && e.message ? e.message : e), false);
    }
  });
})();
