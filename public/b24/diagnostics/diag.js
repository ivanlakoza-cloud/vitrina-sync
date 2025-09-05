(function(){
  const $ = s => document.querySelector(s);
  const pre = (el, data) => { try { el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); } catch(e){ el.textContent = String(data); } };
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
  const serverEl = $('#server');

  // Show server-captured POST/GET data
  pre(serverEl, (window as any).__B24_POST || "(нет данных)");
  const serverData = (window as any).__B24_POST || {};

  $('#copyTpl').onclick = ()=>{
    const input = $('#tpl') as HTMLInputElement;
    input.select(); input.setSelectionRange(0, 99999);
    document.execCommand('copy');
  };

  function detectId(placement: any){
    const opt = (placement && placement.options) || serverData.PLACEMENT_OPTIONS_PARSED || {};
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

  function summarize(placement: any) {
    const q = Object.fromEntries(Array.from(new URLSearchParams(location.search).entries()));
    const ref = document.referrer;
    const id = detectId(placement);

    let lines = [];
    lines.push(`[${now()}] typeof BX24: ${typeof (window as any).BX24}`);
    lines.push(`Placement (client): ${placement && placement.placement || 'N/A'}`);
    lines.push(`Placement (server): ${serverData.PLACEMENT || 'N/A'}`);
    lines.push(`ID (detected): ${id ? id : '—'}`);
    lines.push(`Query keys: ${Object.keys(q).length ? Object.keys(q).join(', ') : '—'}`);
    lines.push(`Has referrer: ${ref ? 'yes' : 'no'}`);
    summary.textContent = lines.join('\n');

    detectEl.innerHTML = id ? `<span class="ok">ID найден:</span> <b>${id}</b>` : `<span class="err">ID не найден</span>`;

    if (id && !(manualId as HTMLInputElement).value) (manualId as HTMLInputElement).value = id;
    pre(queryEl, q);
    pre(refEl, ref || '(пусто)');
  }

  function refreshPlacement() {
    placementStatus.textContent = 'loading…';
    (window as any).BX24.placement.info(function(p: any){
      placementStatus.textContent = '';
      pre(placementEl, p);
      summarize(p);
    });
  }

  function getDeal(id: string) {
    if(!id){ dealEl.textContent = 'Укажите ID сделки'; return; }
    (window as any).BX24.callMethod('crm.deal.get',{id}, function(r: any){
      try{
        if(r.error()){ pre(dealEl, 'Ошибка: '+r.error()+': '+r.error_description()); }
        else{ pre(dealEl, r.data()); }
      }catch(e){
        pre(dealEl, 'Exception while reading response');
      }
    });
  }

  ($('#btnPlacement') as HTMLButtonElement).onclick = refreshPlacement;
  ($('#btnGetDeal') as HTMLButtonElement).onclick = function(){ getDeal((manualId as HTMLInputElement).value.trim()); };
  ($('#btnAuth') as HTMLButtonElement).onclick = function(){
    (window as any).BX24.getAuth(function(a: any){ pre(authEl, a); });
  };
  ($('#btnScope') as HTMLButtonElement).onclick = function(){
    (window as any).BX24.callMethod('app.info', {}, function(r: any){
      if(r && r.data) pre(authEl, r.data()); else pre(authEl, r);
    });
  };

  document.addEventListener('DOMContentLoaded', function(){
    summarize(null);
  });

  if (typeof (window as any).BX24 === 'undefined') {
    pre(placementEl, 'BX24 API недоступно (страница открыта вне Bitrix24?).');
  } else {
    (window as any).BX24.init(function(){
      refreshPlacement();
      setTimeout(function(){
        const id = (manualId as HTMLInputElement).value.trim();
        if(id) getDeal(id);
      }, 600);
    });
  }
})();