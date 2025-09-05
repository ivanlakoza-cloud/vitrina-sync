/* QuickFill core (Bitrix24) — v1.4
   - robust entityId detection (many option keys + referrer)
   - graceful fallback: manual deal ID input if not detected
   - diagnostics in console
*/
(function(global){
  const log=(...a)=>{ try{ console.log('[QuickFill]', ...a);}catch(e){} };
  const html=String.raw;

  const QuickFill={
    boot(cfg){
      this.cfg=Object.assign({
        ENTITY_TYPE:'DEAL',
        REQUIRED_CODES:[],
        BP_TEMPLATE_ID:null,
        TITLE:'Заполнить обязательные поля',
        BP_PARAMETERS:{},
        FULL_TITLE:''
      }, cfg||{});
      this.state={entityId:null,deal:null,fieldsMeta:null};
      document.addEventListener('DOMContentLoaded',()=>this.init());
    },
    qs:s=>document.querySelector(s),
    setStatus(t){ const el=this.qs('#status'); if(el) el.textContent=t||''; log('STATUS:',t); },
    msg(h,k=''){ const b=document.createElement('div'); b.className=k; b.innerHTML=h; (this.qs('#messages')||document.body).appendChild(b); log('MSG:',h); },
    clearMsgs(){ const n=this.qs('#messages'); if(n) n.innerHTML=''; },
    isEmpty(v){ if(v===null||v===undefined) return true; if(Array.isArray(v)) return v.length===0; if(typeof v==='object') return Object.keys(v).length===0; return String(v).trim()===''; },

    resolveEntityId(cb){
      try{
        BX24.placement.info((data)=>{
          log('placement.info ->', data);
          const opt=(data&&data.options)||{};
          let id=
            opt.ENTITY_ID||opt.ENTITY_VALUE_ID||opt.VALUE_ID||
            opt.entity_id||opt.entityId||opt.value_id||
            opt.ID||opt.id||
            (opt.value&&(opt.value.ENTITY_ID||opt.value.ID||opt.value.id))||
            null;
          // try query
          if(!id){
            const q=new URLSearchParams(location.search);
            id=q.get('entityId')||q.get('ENTITY_ID')||q.get('ID')||q.get('id')||q.get('deal_id')||q.get('DEAL_ID');
          }
          // try referrer path /crm/deal/details/<ID>/
          if(!id){
            const ref=document.referrer||'';
            const m=ref.match(/\/crm\/deal\/details\/(\d+)\//);
            if(m) id=m[1];
            log('referrer:', ref, 'parsed id:', id);
          }
          id=String(id||'').replace(/[^0-9]/g,'');
          cb(id||null);
        });
      }catch(e){
        log('resolveEntityId error', e);
        cb(null);
      }
    },

    fieldInputFor(code,meta){
      const t=meta.type,w=document.createElement('div'); w.className='row';
      const l=document.createElement('label'); l.textContent=(meta.editFormLabel&&meta.editFormLabel[0])||meta.title||code; w.appendChild(l);
      let i;
      switch(t){
        case'integer':case'double': i=document.createElement('input'); i.type='number'; i.step=t==='integer'?'1':'any'; break;
        case'boolean': i=document.createElement('select'); [{v:'',t:'— выберите —'},{v:'Y',t:'Да'},{v:'N',t:'Нет'}].forEach(o=>{ const p=document.createElement('option'); p.value=o.v; p.textContent=o.t; i.appendChild(p); }); break;
        case'date': i=document.createElement('input'); i.type='date'; break;
        case'datetime': i=document.createElement('input'); i.type='datetime-local'; break;
        case'text': i=document.createElement('textarea'); break;
        case'enumeration': i=document.createElement('select'); if(meta.items){ const e=document.createElement('option'); e.value=''; e.textContent='— выберите —'; i.appendChild(e); meta.items.forEach(it=>{ const p=document.createElement('option'); p.value=it.ID; p.textContent=it.VALUE; i.appendChild(p); }); } break;
        default: i=document.createElement('input'); i.type='text'; break;
      }
      i.name=code; i.id='fld_'+code; w.appendChild(i); return {wrap:w,input:i};
    },

    askDealIdUI(){
      const c=this.qs('#content'); c.innerHTML='';
      const wrap=document.createElement('div'); wrap.className='card';
      wrap.innerHTML=html`
        <div class="hint">Не удалось автоматически определить ID сделки из плейсмента/реферера.</div>
        <div class="row">
          <label>ID сделки</label>
          <input id="manualDealId" type="number" placeholder="Например: 6443" />
        </div>
        <div class="btns">
          <button id="btnLoadById" class="btn btn-primary">Продолжить</button>
          <button id="btnRetry" class="btn btn-secondary">Повторить автоопределение</button>
        </div>
      `;
      c.appendChild(wrap);
      this.setStatus('');

      this.qs('#btnLoadById').onclick=()=>{
        const v=(this.qs('#manualDealId').value||'').trim();
        if(!v){ this.msg('Введите ID сделки.','error'); return; }
        this.state.entityId=String(v).replace(/[^0-9]/g,'');
        this.loadDeal();
      };
      this.qs('#btnRetry').onclick=()=>{
        this.setStatus('Повторная попытка определения ID…');
        this.resolveEntityId((id)=>{
          if(id){ this.state.entityId=id; this.loadDeal(); }
          else{ this.setStatus(''); this.msg('ID не найден. Укажите вручную.','error'); }
        });
      };
    },

    render(){
      const c=this.qs('#content'); if(c) c.innerHTML='';
      const r=this.cfg.REQUIRED_CODES||[], m=r.filter(code=>this.isEmpty(this.state.deal[code]));
      const chip=this.qs('#entityChip'); if(chip) chip.textContent=(this.cfg.ENTITY_TYPE||'DEAL')+' #'+this.state.entityId;
      if(m.length===0){
        this.setStatus('Все обязательные поля уже заполнены.'); this.msg('Нет пустых полей. Можно запускать БП.','success');
        const b=document.createElement('div'); b.className='btns';
        const run=document.createElement('button'); run.className='btn btn-primary'; run.textContent='Запустить бизнес-процесс'; run.onclick=()=>this.startBizproc();
        const cls=document.createElement('button'); cls.className='btn btn-secondary'; cls.textContent='Закрыть'; cls.onclick=()=>this.close();
        b.appendChild(run); b.appendChild(cls); c.appendChild(b); return;
      }
      const f=document.createElement('form'); f.id='quickfillForm';
      m.forEach(code=>{ const meta=this.state.fieldsMeta[code]||{type:'string',title:code}; const {wrap,input}=this.fieldInputFor(code,meta); if(this.state.deal[code]) input.value=this.state.deal[code]; f.appendChild(wrap); });
      const b=document.createElement('div'); b.className='btns';
      const save=document.createElement('button'); save.type='submit'; save.className='btn btn-primary'; save.textContent='Сохранить и запустить БП';
      const only=document.createElement('button'); only.type='button'; only.className='btn btn-secondary'; only.textContent='Только сохранить';
      const cls=document.createElement('button'); cls.type='button'; cls.className='btn btn-secondary'; cls.textContent='Закрыть';
      b.appendChild(save); b.appendChild(only); b.appendChild(cls); f.appendChild(b);
      f.addEventListener('submit', (e)=>{
        e.preventDefault(); this.clearMsgs();
        const fields={}; m.forEach(code=>{ const el=f.querySelector('#fld_'+code); if(!el) return; const v=el.value; if(v==='') return; fields[code]=v; });
        if(!Object.keys(fields).length){ this.msg('Вы ничего не изменили. Заполните хотя бы одно поле.','error'); return; }
        this.setStatus('Сохраняю изменения…');
        BX24.callMethod('crm.deal.update',{id:this.state.entityId,fields}, (res)=>{
          if(res.error()){ this.msg('Ошибка сохранения: '+res.error()+': '+res.error_description(),'error'); this.setStatus(''); }
          else{ this.msg('Изменения сохранены.','success'); if(this.cfg.BP_TEMPLATE_ID){ this.startBizproc(); } else { this.setStatus(''); } }
        });
      });
      only.onclick=()=>{ const evt=new Event('submit'); f.dispatchEvent(evt); };
      cls.onclick=()=>this.close();
      c.appendChild(f);
      this.setStatus('');
    },

    startBizproc(){
      if(!this.cfg.BP_TEMPLATE_ID){ this.msg('Не задан ID шаблона БП (BP_TEMPLATE_ID).','error'); return; }
      this.setStatus('Запускаю бизнес-процесс…');
      const doc=['crm','CCrmDocumentDeal','DEAL_'+this.state.entityId];
      BX24.callMethod('bizproc.workflow.start',{TEMPLATE_ID:this.cfg.BP_TEMPLATE_ID,DOCUMENT_ID:doc,PARAMETERS:this.cfg.BP_PARAMETERS||{}}, (res)=>{
        if(res.error()){ this.msg('Ошибка запуска БП: '+res.error()+': '+res.error_description(),'error'); this.setStatus(''); }
        else{ const wf=res.data(); this.msg('Бизнес-процесс запущен (WF ID: '+(wf&&wf.ID||'?')+').','success'); this.setStatus(''); }
      });
    },

    close(){ try{ if(parent&&parent.BX&&parent.BX.SidePanel) parent.BX.SidePanel.Instance.close(); }catch(e){} try{ BX24.closeApplication(); }catch(e){} },

    loadDeal(){
      this.setStatus('Загружаю данные сделки…');
      BX24.callMethod('crm.deal.get',{id:this.state.entityId}, (r1)=>{
        if(r1.error()){ this.msg('Ошибка загрузки сделки: '+r1.error()+': '+r1.error_description(),'error'); this.setStatus(''); return; }
        this.state.deal=r1.data();
        this.setStatus('Загружаю метаданные полей…');
        BX24.callMethod('crm.deal.fields',{}, (r2)=>{
          if(r2.error()){ this.msg('Ошибка загрузки метаданных: '+r2.error()+': '+r2.error_description(),'error'); this.setStatus(''); return; }
          this.state.fieldsMeta=r2.data(); this.render();
        });
      });
    },

    init(){
      this.setStatus('Подключаюсь к порталу…');
      if(typeof BX24==='undefined'){ this.msg('BX24 API недоступно. Откройте приложение из карточки сделки.','error'); return; }
      let initWatch=setTimeout(()=>{ this.msg('Нет ответа от BX24.init(). Проверьте, что приложение открыто из плейсмента/вкладки и не заблочены куки/скрипты.','error'); },7000);
      BX24.init(()=>{
        clearTimeout(initWatch);
        this.resolveEntityId((id)=>{
          log('Resolved entityId =', id);
          if(!id){ this.setStatus(''); this.askDealIdUI(); return; }
          this.state.entityId=id;
          this.loadDeal();
        });
      });
    }
  };

  global.QuickFill=QuickFill;
})(window);
