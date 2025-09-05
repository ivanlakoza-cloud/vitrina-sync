(function(){
  const $ = s => document.querySelector(s);
  const pre = (el, data) => { try { el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); } catch(e){ el.textContent = String(data); } };
  const qs = (k)=> new URLSearchParams(location.search).get(k);
  const now = ()=> new Date().toLocaleTimeString();

  const summary = $('#summary');
  const placementEl = $('#placement');
  const placementStatus = $('#placementStatus');
  const queryEl = $('#query');
  const refEl = $('#ref');
  const detectEl = $('#idDetect');
  const manualId = $('#manualId');
  const dealEl = $('#deal');
  const authEl = $('#auth');

  $('#copyTpl').onclick = ()=>{
    const input = $('#tpl');
    input.select(); input.setSelectionRange(0, 99999);
    document.execCommand('copy');
  };

  function detectId(placement){
    const opt = (placement && placement.options) || {};
    let id =
      opt.ENTITY_ID || opt.ENTITY_VALUE_ID || opt.VALUE_ID ||
      opt.entity_id || opt.entityId || opt.value_id ||
      opt.ID || opt.id ||
      (opt.value && (opt.value.ENTITY_ID || opt.value.ID || opt.value.id)) ||
      null;

    if(!id){
      const q = new URLSearchParams(location.search);
      id = q.get('entityId') || q.get('ENTITY_ID') || q.get('ID') || q.get('id') || q.get('deal_id') || q.get('DEAL_ID');
    }
    if(!id){
      const m = (document.referrer||'').match(/\/crm\/deal\/details\/(\d+)\//);
      if(m) id = m[1];
    }
    id = String(id||'').replace(/[^0-9]/g,'');
    return id||null;
  }

  function summarize(placement) {
    const q = Object.fromEntries(Array.from(new URLSearchParams(location.search).entries()));
    const ref = document.referrer;
    const id = detectId(placement);

    let lines = [];
    lines.push(`[${now()}] typeof BX24: ${typeof BX24}`);
    lines.push(`Placement: ${placement && placement.placement || 'N/A'}`);
    lines.push(`ID (detected): ${id ? id : '—'}`);
    lines.push(`Query keys: ${Object.keys(q).length ? Object.keys(q).join(', ') : '—'}`);
    lines.push(`Has referrer: ${ref ? 'yes' : 'no'}`);
    summary.textContent = lines.join('\n');
    detectEl.innerHTML = id ? `<span class="ok">ID найден:</span> <b>${id}</b>` : `<span class="err">ID не найден</span>`;

    if (id && !manualId.value) manualId.value = id;
    pre(queryEl, q);
    pre(refEl, ref || '(пусто)');
  }

  function refreshPlacement() {
    placementStatus.textContent = 'loading…';
    BX24.placement.info(function(p){
      placementStatus.textContent = '';
      pre(placementEl, p);
      summarize(p);
    });
  }

  function getDeal(id) {
    if(!id){ dealEl.textContent = 'Укажите ID сделки'; return; }
    BX24.callMethod('crm.deal.get',{id}, function(r){
      try{
        if(r.error()){ pre(dealEl, 'Ошибка: '+r.error()+': '+r.error_description()); }
        else{ pre(dealEl, r.data()); }
      }catch(e){
        pre(dealEl, 'Exception while reading response');
      }
    });
  }

  $('#btnPlacement').onclick = refreshPlacement;
  $('#btnGetDeal').onclick = function(){ getDeal(manualId.value.trim()); };
  $('#btnAuth').onclick = function(){
    BX24.getAuth(function(a){ pre(authEl, a); });
  };
  $('#btnScope').onclick = function(){
    BX24.callMethod('app.info', {}, function(r){
      if(r && r.data) pre(authEl, r.data()); else pre(authEl, r);
    });
  };

  document.addEventListener('DOMContentLoaded', function(){
    summarize(null);
    refreshPlacement();
  });

  // init
  if (typeof BX24 === 'undefined') {
    pre(placementEl, 'BX24 API недоступно (страница открыта вне Bitrix24?).');
  } else {
    BX24.init(function(){
      refreshPlacement();
      // try auto-deal-get if ID is visible
      setTimeout(function(){
        const id = manualId.value.trim();
        if(id) getDeal(id);
      }, 600);
    });
  }
})();