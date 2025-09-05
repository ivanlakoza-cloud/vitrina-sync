(function(){
  var $ = function(s){ return document.querySelector(s); };
  var server = window.__B24_POST || {};
  var dealId = null;
  var dealOriginal = null;

  var FIELD_LIST = [
    {label:'Комментарий клиента, что важно клиенту?', code:'UF_CRM_1737115114028', type:'textarea', required:true},
    {label:'Желаемая максимальная площадь (м²)', code:'UF_CRM_1737115941816', type:'number', required:true},
    {label:'Направление/вид бизнеса клиента', code:'UF_CRM_1737116070781', type:'text', required:true},
    {label:'Озвученная стоимость за м² (₽)', code:'UF_CRM_1737116470642', type:'number', required:true},
    {label:'Город и адрес', code:'UF_CRM_1755537385514', type:'text', required:true},
    {label:'Арендные каникулы (есть/нет/сколько)', code:'UF_CRM_1756910832606', type:'text', required:true},
    {label:'Отопление (Отсутствует/Сверху/Иное)', code:'UF_CRM_1756969923506', type:'tags', required:true},
    {label:'НДС (Отсутствует/Сверху+процент)', code:'UF_CRM_1756969983186', type:'tags', required:true},
    {label:'Требуемый ремонт', code:'UF_CRM_1757040827538', type:'textarea', required:true},
    {label:'Комментарий менеджера по цене', code:'UF_CRM_1757040956282', type:'textarea', required:true},
  ];

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

  function valueToInput(code, value, type){
    if(type==='tags'){
      if(Array.isArray(value)) return value.map(function(v){return String(v).trim();}).join(', ');
      if(typeof value==='string') return value;
      return '';
    }
    if(type==='number'){
      var n = (value===null || value===undefined)? '' : String(value).replace(',', '.');
      return n;
    }
    return value===null || value===undefined ? '' : String(value);
  }

  function inputToValue(code, input, type, original){
    var v = input.value.trim();
    if(type==='number'){
      return v===''? '' : v; // Bitrix примет строку числа
    }
    if(type==='tags'){
      if(v==='') return [];
      return v.split(',').map(function(x){return x.trim();}).filter(Boolean);
    }
    return v;
  }

  function renderForm(deal){
    var form = $('#dealForm'); form.innerHTML = '';
    FIELD_LIST.forEach(function(f){
      var wrap = document.createElement('div');
      wrap.className = 'group';
      var id = 'fld_'+f.code;
      var label = document.createElement('label');
      label.className = 'label';
      label.setAttribute('for', id);
      label.innerHTML = f.label+' <span class="mono muted">('+f.code+')</span>';
      var control;
      if(f.type==='textarea'){
        control = document.createElement('textarea');
        control.rows = 3;
      }else{
        control = document.createElement('input');
        control.type = f.type==='number' ? 'text' : 'text';
      }
      control.className = 'control';
      control.id = id;
      control.dataset.code = f.code;
      control.dataset.type = f.type;
      control.dataset.required = f.required ? '1' : '0';
      control.value = valueToInput(f.code, deal[f.code], f.type);
      if(f.required && control.value===''){ control.classList.add('invalid'); }
      control.addEventListener('input', function(){
        if(f.required){
          if(control.value.trim()===''){ control.classList.add('invalid'); }
          else { control.classList.remove('invalid'); }
        }
      });
      wrap.appendChild(label);
      wrap.appendChild(control);
      form.appendChild(wrap);
    });
  }

  function diffFields(){
    var changed = {};
    FIELD_LIST.forEach(function(f){
      var el = document.getElementById('fld_'+f.code);
      var newVal = inputToValue(f.code, el, f.type, dealOriginal[f.code]);
      var oldVal = dealOriginal[f.code];
      // normalize for comparison
      var norm = function(v){
        if(Array.isArray(v)) return JSON.stringify(v);
        if(v===null || v===undefined) return '';
        return String(v).trim();
      };
      if(norm(newVal) !== norm(oldVal)){
        changed[f.code] = newVal;
      }
    });
    return changed;
  }

  function validate(){
    var ok = true, firstBad=null;
    FIELD_LIST.forEach(function(f){
      var el = document.getElementById('fld_'+f.code);
      if(f.required && el.value.trim()===''){
        el.classList.add('invalid'); ok=false; if(!firstBad) firstBad=el;
      }
    });
    if(!ok && firstBad){ firstBad.scrollIntoView({behavior:'smooth',block:'center'}); firstBad.focus(); }
    return ok;
  }

  function submit(){
    $('#status').textContent = '';
    if(!validate()) { $('#status').textContent = 'Заполните обязательные поля'; return; }
    var changed = diffFields();
    var proceed = function(){
      // start BP 209
      var docId = ['crm','CCrmDocumentDeal','DEAL_'+dealId];
      window.BX24.callMethod('bizproc.workflow.start', {
        'TEMPLATE_ID': 209,
        'DOCUMENT_ID': docId,
        'PARAMETERS': {}
      }, function(r){
        // Показать большую плашку "Спасибо"
        document.querySelector('.grid').style.display = 'none';
        $('#done').style.display = 'block';
      });
    };

    if(Object.keys(changed).length===0){
      proceed();
      return;
    }
    $('#status').textContent = 'Сохраняю изменения...';
    window.BX24.callMethod('crm.deal.update', { id: dealId, fields: changed }, function(r){
      try{
        if(r.error()){
          $('#status').textContent = 'Ошибка: '+r.error()+': '+r.error_description();
        }else{
          $('#status').textContent = 'Изменения сохранены';
          proceed();
        }
      }catch(e){
        $('#status').textContent = 'Ошибка обработки ответа';
      }
    });
  }

  function init(){
    $('#pServer').textContent = server.PLACEMENT || '—';
    dealId = (function(){
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
    })();
    $('#dealId').textContent = dealId || '—';

    if(!window.BX24){ $('#hint').textContent = 'Нет BX24 API'; return; }
    window.BX24.init(function(){
      if(!dealId){ $('#hint').textContent = 'ID сделки не найден'; return; }
      $('#hint').textContent = 'Загружаю данные сделки...';
      window.BX24.callMethod('crm.deal.get', { id: dealId }, function(r){
        try{
          if(r.error()){
            $('#hint').textContent = 'Ошибка: '+r.error()+': '+r.error_description();
          }else{
            dealOriginal = r.data();
            $('#state').style.display='inline';
            $('#hint').textContent = '';
            renderForm(dealOriginal);
          }
        }catch(e){
          $('#hint').textContent = 'Ошибка обработки ответа';
        }
      });
    });

    $('#btnSubmit').addEventListener('click', function(e){ e.preventDefault(); submit(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();