
(function(){
  const $ = sel => document.querySelector(sel);
  const app = $('#app');
  const submitBtn = $('#submit');
  const statusEl = $('#status');
  const diagEl = $('#diag');
  const doneEl = $('#done');

  function addDiag(line){
    const li = document.createElement('li');
    li.textContent = line;
    diagEl.appendChild(li);
  }
  function setStatus(msg, type='info'){
    statusEl.textContent = msg;
    statusEl.className = 'status '+type;
  }

  const bootVer = 'v26';
  addDiag('boot '+bootVer);
  addDiag('path='+location.pathname.replace(/\/+$/,''));
  addDiag('query='+location.search.replace(/^\?/,'') || '(пусто)');

  // small helpers
  const qs = new URLSearchParams(location.search);
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

  // Robust dealId resolver for Tabs/Activities + fallbacks
  async function resolveDealId(){
    // 1) From explicit URL macros, if есть
    const direct = qs.get('deal_id') || qs.get('DEAL_ID') || qs.get('id') || qs.get('entityId');
    if (direct) return direct;

    // 2) Try BX24 placement
    if (typeof BX24 !== 'undefined' && BX24 && BX24.placement && BX24.placement.info){
      const p = await new Promise(res => BX24.placement.info(res));
      addDiag('placement='+p.placement);
      try{
        const opts = p.options || {};
        // TAB: opts.ID = dealId
        if (/CRM_DEAL_DETAIL/i.test(p.placement) && opts.ID){
          return String(opts.ID);
        }
        // ACTIVITY: opts.ID = activityId -> need get owner
        if (p.placement === 'CRM_DEAL_DETAIL_ACTIVITY' && opts.ID){
          const actId = String(opts.ID);
          addDiag('activityId='+actId);
          const dealId = await new Promise(resolve => {
            BX24.callMethod('crm.activity.get', { id: actId }, r=>{
              if (r && !r.error() && r.data()){
                const d = r.data();
                // 2 - DEAL
                if (String(d.OWNER_TYPE_ID) === '2') resolve(String(d.OWNER_ID));
                else resolve(null);
              } else resolve(null);
            });
          });
          if (dealId) return dealId;
        }
      }catch(e){
        console.warn('placement resolve error', e);
      }
    }

    // 3) Referrer fallback: /crm/deal/details/{id}/
    const ref = document.referrer || '';
    const m = ref.match(/\/crm\/deal\/details\/(\d+)\//i);
    if (m) return m[1];

    return null;
  }

  async function init(){
    // Wait a tick if BX24 script is still loading
    for (let i=0;i<20;i++){
      if (typeof BX24 !== 'undefined') break;
      await new Promise(r=>setTimeout(r,50));
    }

    const dealId = await resolveDealId();
    addDiag('resolved dealId='+(dealId||'null'));

    if (!dealId){
      setStatus('Не удалось определить ID сделки. Проверьте URL- макросы #ID#/#DEAL_ID# или откройте виджет из карточки сделки.', 'error');
      return;
    }

    setStatus('Загружаем сделку #'+dealId+'…');
    BX24.callMethod('crm.deal.get', { id: dealId }, r => {
      if (r && r.error()){
        setStatus('Ошибка crm.deal.get: '+r.error_description(), 'error');
        return;
      }
      const deal = r.data();
      addDiag('deal='+ (deal && deal.TITLE ? deal.TITLE : 'получена'));

      // здесь можно отрисовать форму; для проверки — просто активируем кнопку
      submitBtn.disabled = false;
      setStatus('Данные сделки получены — можно отправлять.');
    });

    submitBtn.addEventListener('click', ()=>{
      submitBtn.disabled = true;
      // TODO: здесь отправка в ваш БП/REST
      doneEl.classList.remove('hidden');
      setStatus('Отправлено!', 'info');
    });
  }

  init();
})();
