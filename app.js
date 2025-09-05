
(function(){
  const $ = (sel,root=document)=> root.querySelector(sel);
  const diag = $('#diag');
  const statusEl = $('#status');
  const submit = $('#submit');
  const thanks = $('#thanks');

  function logDiag(line){
    const li = document.createElement('li'); li.textContent = line; diag.appendChild(li);
  }
  function setStatus(text,type='info'){
    statusEl.textContent = text;
    statusEl.className = 'status '+type;
  }

  logDiag('boot v32');
  logDiag('path=' + location.pathname.replace(/^\//,''));
  logDiag('query=' + location.search);
  logDiag('typeof BX24=' + (typeof window.BX24));

  // wait BX24
  function waitForBX24(deadlineMs=9000){
    return new Promise((resolve, reject)=>{
      const t0 = Date.now();
      const tick = ()=>{
        if (window.BX24 && typeof BX24.callMethod === 'function'){
          // some portals require BX24.ready wrapper
          try{ BX24.ready(()=>resolve()); }catch(_){ resolve(); }
          return;
        }
        if (Date.now()-t0 > deadlineMs) return reject(new Error('BX24 timeout'));
        setTimeout(tick, 150);
      };
      tick();
    });
  }

  function getQueryId(){
    const q = new URLSearchParams(location.search);
    return q.get('id')||q.get('ID')||q.get('deal_id')||q.get('DEAL_ID')||q.get('entityId')||q.get('ENTITY_ID')||null;
  }
  function resolveDealIdFromReferrer(){
    const r = document.referrer||'';
    const m = r.match(/\/crm\/deal\/details\/(\d+)/i);
    return m? m[1] : null;
  }

  async function resolveDealId(){
    // 1) placement
    try{
      const info = await new Promise((res,rej)=>{
        if (!window.BX24){ return rej(new Error('no BX24')); }
        BX24.placement.info(d=>res(d));
      });
      if (info && info.options){
        try{
          const opt = typeof info.options==='string' ? JSON.parse(info.options) : info.options;
          if (opt && opt.ID) return String(opt.ID);
        }catch(e){/* ignore */}
      }
    }catch(e){/* ignore */}
    // 2) query
    const fromQ = getQueryId(); if (fromQ) return String(fromQ);
    // 3) referrer
    const fromRef = resolveDealIdFromReferrer(); if (fromRef) return String(fromRef);
    return null;
  }

  async function checkDeal(id){
    return new Promise((resolve)=>{
      BX24.callMethod('crm.deal.get',{id}, (r)=>{
        if (r && !r.error()) resolve(true); else resolve(false);
      });
    });
  }

  async function startBP(id){
    return new Promise((resolve,reject)=>{
      const params = {
        TEMPLATE_ID: 209,
        DOCUMENT_ID: ['crm','CCrmDocumentDeal','DEAL_'+id],
        PARAMETERS: {}
      };
      BX24.callMethod('bizproc.workflow.start', params, (r)=>{
        if (r && !r.error()){ resolve(true); }
        else{
          // fallback на smart-process/расширенную форму — шлём ошибку наружу
          reject(new Error(r && r.error_description ? r.error_description() : 'bizproc start error'));
        }
      });
    });
  }

  async function boot(){
    try{
      setStatus('Подключаемся к порталу...','info');
      await waitForBX24();
      logDiag('BX24 ready');
      const id = await resolveDealId();
      if (!id){ setStatus('Не удалось определить ID сделки','error'); return; }

      const ok = await checkDeal(id);
      if (!ok){ setStatus('Сделка '+id+' не найдена или нет прав','error'); return; }

      setStatus('Готово. Сделка '+id+' найдена. Можно отправлять.','ok');
      submit.classList.add('ready');
      submit.disabled = false;

      submit.addEventListener('click', async ()=>{
        submit.disabled = true;
        submit.classList.remove('ready');
        setStatus('Запускаем БП #209...','info');
        try{
          await startBP(id);
          setStatus('Бизнес‑процесс запущен для сделки '+id,'ok');
          thanks.classList.remove('hidden');
          window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'});
        }catch(e){
          setStatus('Ошибка запуска БП: '+ e.message, 'error');
          submit.disabled = false;
          submit.classList.add('ready');
        }
      });
    }catch(e){
      setStatus('Ошибка инициализации: '+e.message,'error');
    }
  }

  boot();
})();
