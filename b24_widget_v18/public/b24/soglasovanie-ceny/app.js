
// public/b24/soglasovanie-ceny/app.js — 1a (public)
(function(){
  const badge = document.createElement('div');
  badge.textContent = 'Проверка 1a • public';
  Object.assign(badge.style, {position:'fixed', right:'10px', top:'10px', zIndex:2147483647, background:'#1b2133', color:'#cbd5ff', padding:'6px 10px', border:'1px solid #2f3550', borderRadius:'999px', fontSize:'12px', fontFamily:'ui-sans-serif,system-ui'});
  document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(badge));
  // try to rewrite any existing H1 text to include marker
  const tryPatch = ()=>{
    const h1 = Array.from(document.querySelectorAll('h1')).find(h=>/Проверка полей/i.test(h.textContent||''));
    if(h1 && !/1a/.test(h1.textContent)) h1.innerHTML = h1.innerHTML + ' — <b>1a (public)</b>';
  };
  const obs = new MutationObserver(tryPatch);
  document.addEventListener('DOMContentLoaded', ()=>{ tryPatch(); obs.observe(document.body, {subtree:true, childList:true}); });
})();
