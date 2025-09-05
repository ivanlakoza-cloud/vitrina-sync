(function(){
  var $ = function(s){ return document.querySelector(s); };
  var pre = function(el, data){
    try{ el.textContent = (typeof data === 'string') ? data : JSON.stringify(data,null,2); }
    catch(e){ el.textContent = String(data); }
  };

  var server = window.__B24_POST || {};
  var dealId = null;

  function detectDealId(){
    var opt = server.PLACEMENT_OPTIONS_PARSED || {};
    var id = opt.ENTITY_ID || opt.ID || opt.id || null;

    if(!id){
      var q = new URLSearchParams(location.search);
      id = q.get('id') || q.get('ID') || q.get('entityId') || q.get('DEAL_ID');
    }
    if(!id){
      var m = (document.referrer||'').match(/\/crm\/deal\/details\/(\d+)\//);
      if(m) id = m[1];
    }
    id = String(id||'').replace(/[^0-9]/g,'');
    return id||null;
  }

  function renderFields(deal){
    var container = $('#fields');
    if(!deal){ container.textContent = 'Не удалось получить сделку'; return; }
    var wanted = [
      ['Комментарий клиента, что важно клиенту?', 'UF_CRM_1737115114028'],
      ['Желаемая максимальная площадь (м²)', 'UF_CRM_1737115941816'],
      ['Направление/вид бизнеса клиента', 'UF_CRM_1737116070781'],
      ['Озвученная стоимость за м² (₽)', 'UF_CRM_1737116470642'],
      ['Город и адрес', 'UF_CRM_1755537385514'],
      ['Арендные каникулы', 'UF_CRM_1756910832606'],
      ['Отопление', 'UF_CRM_1756969923506'],
      ['НДС', 'UF_CRM_1756969983186'],
      ['Требуемый ремонт', 'UF_CRM_1757040827538'],
      ['Комментарий менеджера по цене', 'UF_CRM_1757040956282']
    ];
    var html = '';
    wanted.forEach(function(pair){
      var label = pair[0], code = pair[1];
      var val = (deal[code]===undefined || deal[code]===null || deal[code]==='') ? '<span class="err">— пусто —</span>' : (Array.isArray(deal[code])? JSON.stringify(deal[code]) : String(deal[code]));
      html += '<div style="margin-bottom:10px"><label>'+label+' <span class="mono muted">('+code+')</span></label><div>'+val+'</div></div>';
    });
    container.innerHTML = html;
  }

  function startBp(){
    if(!dealId){ return; }
    var docId = ['crm','CCrmDocumentDeal','DEAL_'+dealId];
    $('#bpStatus').textContent = 'Запуск...';
    window.BX24.callMethod('bizproc.workflow.start', {
      'TEMPLATE_ID': 209,
      'DOCUMENT_ID': docId,
      'PARAMETERS': {}
    }, function(r){
      try{
        if(r.error()){
          $('#bpStatus').textContent = 'Ошибка: '+r.error()+': '+r.error_description();
        }else{
          $('#bpStatus').textContent = 'OK, workflowId: '+(r.data() && r.data().ID ? r.data().ID : 'запущен');
        }
      }catch(e){
        $('#bpStatus').textContent = 'Ошибка парсинга ответа';
      }
    });
  }

  function init(){
    $('#pServer').textContent = server.PLACEMENT || '—';
    dealId = detectDealId();
    $('#dealId').textContent = dealId || '—';

    if(!window.BX24){ $('#state').textContent = 'нет BX24 API'; return; }
    window.BX24.init(function(){
      $('#state').textContent = 'подключаюсь к порталу...';
      if(!dealId){
        $('#state').textContent = 'ID сделки не найден'; 
        return;
      }
      window.BX24.callMethod('crm.deal.get', { id: dealId }, function(r){
        try{
          if(r.error()){
            $('#state').textContent = 'Ошибка: '+r.error()+': '+r.error_description();
          }else{
            var deal = r.data();
            $('#state').innerHTML = '<span class="ok">готово</span>';
            renderFields(deal);
          }
        }catch(e){
          $('#state').textContent = 'Ошибка чтения ответа';
        }
      });
    });

    $('#btnStartBp').onclick = startBp;
  }

  document.addEventListener('DOMContentLoaded', init);
})();