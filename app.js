
(function(){
  const $ = sel => document.querySelector(sel);
  const app = $('#app');
  const diagPath = $('#diag-path');
  const diagQuery = $('#diag-query');
  const diagBx = $('#diag-bx');
  const submitBtn = $('#submit');
  const statusEl = $('#status');
  const result = $('#result');

  // diagnostics
  diagPath.textContent = 'path=' + location.pathname;
  diagQuery.textContent = 'query=' + (location.search || '(нет)');
  diagBx.textContent = 'typeof BX24=' + (typeof window.BX24);

  function setStatus(text, type='info'){
    statusEl.textContent = text;
    statusEl.className = 'status ' + type;
  }

  // wait for BX24 to appear and be ready (portal injects api)
  async function waitBx24(maxMs=9000){
    const start = Date.now();
    while (Date.now()-start < maxMs){
      if (window.BX24 && typeof BX24.callMethod === 'function'){
        try{
          // ensure the bridge bootstraps fully
          await new Promise(res => BX24.ready(res));
          return BX24;
        }catch(e){
          // continue polling
        }
      }
      await new Promise(r => setTimeout(r, 150));
    }
    throw new Error('BX24 не загрузился в отведённое время');
  }

  // resolve deal id from several sources
  function resolveDealId(placementInfo){
    const q = new URLSearchParams(location.search);
    let id = q.get('id') || q.get('deal_id') || q.get('entityId') || q.get('DEAL_ID') || q.get('ID');
    if (!id && placementInfo && placementInfo.options){
      try{
        const opts = placementInfo.options;
        if (typeof opts === 'string'){
          const parsed = JSON.parse(opts);
          id = parsed.ID || parsed.id;
        }else{
          id = opts.ID || opts.id;
        }
      }catch{}
    }
    if (!id && document.referrer){
      const m = document.referrer.match(/\/crm\/deal\/details\/(\d+)\//);
      if (m) id = m[1];
    }
    return id;
  }

  // main
  (async function boot(){
    try{
      setStatus('Подключаемся к порталу…');
      const bx = await waitBx24();
      diagBx.textContent = 'typeof BX24=' + (typeof window.BX24);

      // placement info
      let placement = null;
      await new Promise(res => bx.placement.info(function(d){ placement = d; res(); }));

      // detect deal id
      const dealId = resolveDealId(placement);
      if (!dealId){
        setStatus('Не удалось определить ID сделки. Откройте виджет из карточки сделки.', 'error');
        return;
      }

      // quick ping to ensure we can call methods
      await new Promise((resolve) => {
        bx.callMethod('crm.deal.get',{id: dealId}, function(r){
          // if portal blocked cross-domain, error() will be defined
          if (r && r.error && r.error()){
            setStatus('Ошибка доступа к API: ' + r.error() + ' — ' + (r.error_description && r.error_description()), 'error');
            return;
          }
          setStatus('Готово. Найдена сделка #' + dealId + '. Можно отправлять на согласование.');
          submitBtn.disabled = false;
          resolve();
        });
      });

      // submit click
      submitBtn.addEventListener('click', function(){
        submitBtn.disabled = true;
        setStatus('Запускаем бизнес‑процесс…');
        // Запуск БП #209 (если настроен в портале)
        const docId = ['crm','CCrmDocumentDeal','DEAL_'+dealId];
        bx.callMethod('bizproc.workflow.start', { TEMPLATE_ID: 209, DOCUMENT_ID: docId }, function(r){
          if (r && r.error && r.error()){
            setStatus('Не удалось запустить процесс: ' + r.error() + ' — ' + (r.error_description && r.error_description()), 'error');
            submitBtn.disabled = false;
            return;
          }
          // show success
          result.classList.remove('hidden');
          setStatus('');
        });
      });

    }catch(e){
      setStatus(e.message || String(e), 'error');
    }
  })();

})();
