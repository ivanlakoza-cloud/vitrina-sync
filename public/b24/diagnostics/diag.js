(function(){
  const $ = function(s){ return document.querySelector(s); };
  const pre = function(el, data){
    try { el.textContent = (typeof data === 'string') ? data : JSON.stringify(data, null, 2); }
    catch(e){ el.textContent = String(data); }
  };
  const now = function(){ return new Date().toLocaleTimeString(); };

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

  // Server-captured data
  var serverData = (window.__B24_POST || {});
  pre(serverEl, Object.keys(serverData).length ? serverData : "(нет данных)");

  $('#copyTpl').onclick = function(){
    var input = $('#tpl');
    input.select(); input.setSelectionRange(0, 99999);
    document.execCommand('copy');
  };

  function detectId(placement){
    var opt = (placement && placement.options) || serverData.PLACEMENT_OPTIONS_PARSED || {};
    var id =
      opt.ENTITY_ID || opt.ENTITY_VALUE_ID || opt.VALUE_ID ||
      opt.entity_id || opt.entityId || opt.value_id ||
      opt.ID || opt.id ||
      (opt.value && (opt.value.ENTITY_ID || opt.value.ID || opt.value.id)) ||
      null;

    if(!id){
      var q = new URLSearchParams(location.search);
      id = q.get('entityId') || q.get('ENTITY_ID') || q.get('ID') || q.get('id') || q.get('deal_id') || q.get('DEAL_ID');
    }
    if(!id){
      var m = (document.referrer||'').match(/\/crm\/deal\/details\/(\d+)\//);
      if(m) id = m[1];
    }
    id = String(id||'').replace(/[^0-9]/g,'');
    return id||null;
  }

  function summarize(placement) {
    var q = Object.fromEntries(Array.from(new URLSearchParams(location.search).entries()));
    var ref = document.referrer;
    var id = detectId(placement);

    var lines = [];
    lines.push("["+now()+"] typeof BX24: "+(typeof window.BX24));
    lines.push("Placement (client): "+((placement && placement.placement) || 'N/A'));
    lines.push("Placement (server): "+(serverData.PLACEMENT || 'N/A'));
    lines.push("ID (detected): "+(id || '—'));
    lines.push("Query keys: "+(Object.keys(q).length ? Object.keys(q).join(', ') : '—'));
    lines.push("Has referrer: "+(ref ? 'yes' : 'no'));
    summary.textContent = lines.join('\n');

    detectEl.innerHTML = id ? '<span class="ok">ID найден:</span> <b>'+id+'</b>' : '<span class="err">ID не найден</span>';

    if (id && !manualId.value) manualId.value = id;
    pre(queryEl, q);
    pre(refEl, ref || '(пусто)');
  }

  function refreshPlacement() {
    placementStatus.textContent = 'loading…';
    if (!window.BX24 || !window.BX24.placement) {
      pre(placementEl, 'BX24 API недоступно (страница открыта вне Bitrix24?)');
      placementStatus.textContent = '';
      summarize(null);
      return;
    }
    window.BX24.placement.info(function(p){
      placementStatus.textContent = '';
      pre(placementEl, p);
      summarize(p);
    });
  }

  function getDeal(id) {
    if(!id){ dealEl.textContent = 'Укажите ID сделки'; return; }
    window.BX24.callMethod('crm.deal.get',{id:id}, function(r){
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
    if (!window.BX24) return;
    window.BX24.getAuth(function(a){ pre(authEl, a); });
  };
  $('#btnScope').onclick = function(){
    if (!window.BX24) return;
    window.BX24.callMethod('app.info', {}, function(r){
      if(r && r.data) pre(authEl, r.data()); else pre(authEl, r);
    });
  };

  document.addEventListener('DOMContentLoaded', function(){
    summarize(null);
  });

  if (typeof window.BX24 === 'undefined') {
    pre(placementEl, 'BX24 API недоступно (страница открыта вне Bitrix24?).');
  } else {
    window.BX24.init(function(){
      refreshPlacement();
      setTimeout(function(){
        var id = manualId.value.trim();
        if(id) getDeal(id);
      }, 600);
    });
  }
})();