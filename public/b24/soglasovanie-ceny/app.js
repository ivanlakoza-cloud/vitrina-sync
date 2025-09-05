(function(){
  var $ = function(s){ return document.querySelector(s); };
  var server = window.__B24_POST || {};
  var dealId = null;
  var dealOriginal = null;
  var responsibleName = null;

  // Friendly labels + custom texts
  var FIELD_LIST = [
    {label:'Комментарий клиента, что важно клиенту?', code:'UF_CRM_1737115114028', type:'textarea', required:true},
    {label:'Желаемая максимальная площадь (м²)', code:'UF_CRM_1737115941816', type:'number', required:true},
    {label:'Направление/вид бизнеса клиента', code:'UF_CRM_1737116070781', type:'text', required:true},
    {label:'Стоимость м² на согласование', code:'UF_CRM_1737116470642', type:'number', required:true},
    {label:'Город и адрес', code:'UF_CRM_1755537385514', type:'text', required:true},
    {label:'Арендные каникулы (есть/нет/сколько)', code:'UF_CRM_1756910832606', type:'text', required:true},
    {label:'Отопление (Отсутствует/Сверху/Иное)', code:'UF_CRM_1756969923506', type:'tags', required:true},
    {label:'НДС (Отсутствует/Сверху+процент)', code:'UF_CRM_1756969983186', type:'tags', required:true},
    {label:'Опишите максимально подробно, что необходимо сделать на объекте для того, чтобы арендатор заехал. Именно этот запрос попадет в строительный отдел. Если ни каких работ не требуется, так и напишите', 
      code:'UF_CRM_1757040827538', type:'textarea', required:true, placeholder:'Пример:\\n1. Стены выровнять, зашпаклевать — покрасят сами\\n2. Пол подготовить под ламинат\\n3. Откосы выровнять и закрыть\\n4. Провести электрику\\n5. Установить двери\\n6. Привести в порядок коридорную группу\\nАрендатор своими силами положит ламинат и устроит натяжной потолок, покрасить стены'},
    {label:'Опишите, что-то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет. Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки', 
      code:'UF_CRM_1757040956282', type:'textarea', required:true}
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

  function valueToInput(value, type){
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

  function inputToValue(input, type){
    var v = input.value.trim();
    if(type==='number'){ return v===''? '' : v; }
    if(type==='tags'){ return v==='' ? [] : v.split(',').map(function(x){return x.trim();}).filter(Boolean); }
    return v;
  }

  function allValid(){
    var ok = true;
    FIELD_LIST.forEach(function(f){
      var el = document.getElementById('fld_'+f.code);
      var empty = el.value.trim()==='';
      if(f.required && empty){ ok=false; }
    });
    return ok;
  }

  function refreshButton(){
    var btn = $('#btnSubmit');
    if(allValid()){ btn.removeAttribute('disabled'); }
    else { btn.setAttribute('disabled',''); }
  }

  function renderForm(deal){
    var form = $('#dealForm'); form.innerHTML = '';
    FIELD_LIST.forEach(function(f){
      var wrap = document.createElement('div');
      wrap.className = 'group';
      var id = 'fld_'+f.code;
      var label = document.createElement('div');
      label.className = 'label';
      label.textContent = f.label; // без технического кода
      var control;
      if(f.type==='textarea'){
        control = document.createElement('textarea');
        control.rows = 4;
      }else{
        control = document.createElement('input');
        control.type = 'text';
      }
      control.className = 'control';
      control.id = id;
      control.dataset.code = f.code;
      control.dataset.type = f.type;
      control.dataset.required = f.required ? '1' : '0';
      control.placeholder = f.placeholder || '';
      control.value = valueToInput(deal[f.code], f.type);
      var empty = control.value=='';
      if(f.required && empty){ control.classList.add('invalid'); }
      if(!empty){ control.classList.add('filled'); }
      control.addEventListener('input', function(){
        var isEmpty = control.value.trim()==='';
        control.classList.toggle('invalid', f.required && isEmpty);
        control.classList.toggle('filled', !isEmpty);
        refreshButton();
      });
      wrap.appendChild(label);
      wrap.appendChild(control);
      if(f.placeholder && control.value===''){
        var hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = '';
        wrap.appendChild(hint);
      }
      form.appendChild(wrap);
    });
    refreshButton();
  }

  function diffFields(){
    var changed = {};
    FIELD_LIST.forEach(function(f){
      var el = document.getElementById('fld_'+f.code);
      var newVal = inputToValue(el, f.type);
      var oldVal = dealOriginal[f.code];
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

  function submit(){
    if(!allValid()) return; // защита на всякий случай
    var changed = diffFields();

    var proceed = function(){
      var docId = ['crm','CCrmDocumentDeal','DEAL_'+dealId];
      window.BX24.callMethod('bizproc.workflow.start', {
        'TEMPLATE_ID': 209,
        'DOCUMENT_ID': docId,
        'PARAMETERS': {}
      }, function(r){
        var name = responsibleName || 'Менеджер';
        var el = $('#done');
        el.innerHTML = `<div><b>${name}</b> — отлично! Запрос отправлен ✅</div>
        <div style="margin-top:8px">Он(а) уже получил(а) уведомление и скоро свяжется с решением, что делаем дальше 🙂</div>
        <div style="margin-top:14px" class="muted">Благодарю за заявку! Желаю продуктивного дня 🚀</div>`;
        el.style.display = 'block';
        document.querySelector('.card').style.display = 'none';
        $('.hdr').style.display = 'none';
      });
    };

    if(Object.keys(changed).length===0){
      proceed();
      return;
    }
    window.BX24.callMethod('crm.deal.update', { id: dealId, fields: changed }, function(r){
      if(r && r.error && r.error()){
        alert('Ошибка сохранения: '+r.error()+': '+r.error_description());
      }else{
        proceed();
      }
    });
  }

  function init(){
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

    if(!window.BX24){ return; }
    window.BX24.init(function(){
      if(!dealId){ return; }
      window.BX24.callMethod('crm.deal.get', { id: dealId }, function(r){
        if(r.error()){
          // ignore for now
        }else{
          dealOriginal = r.data();
          renderForm(dealOriginal);
          // пытаемся получить имя ответственного
          var uid = dealOriginal && dealOriginal.ASSIGNED_BY_ID;
          if(uid){
            window.BX24.callMethod('user.get', { ID: uid }, function(u){
              try{
                if(u && u.data && u.data()[0]){
                  var usr = u.data()[0];
                  responsibleName = (usr.NAME||'') + ' ' + (usr.LAST_NAME||'');
                  responsibleName = responsibleName.trim() || (usr.LOGIN||'Менеджер');
                }
              }catch(e){}
            });
          }
        }
      });
    });

    $('#btnSubmit').addEventListener('click', function(e){ e.preventDefault(); submit(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();