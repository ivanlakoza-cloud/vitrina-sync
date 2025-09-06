
(() => {
  const diag = document.getElementById('diag');
  const statusEl = document.getElementById('status');
  const submit = document.getElementById('submit');
  const add = (t) => { const li = document.createElement('li'); li.textContent = t; diag.appendChild(li); };

  // show diag
  try {
    const q = location.search || '';
    add('path='+ location.pathname.replace(/\/+$/,'').split('/').slice(-3).join('/'));
    add('query='+ (q || '—'));
    const hasBX = typeof window.BX24 !== 'undefined';
    add('typeof BX24='+ (hasBX ? 'object' : 'undefined'));
  } catch(e){ add('diag error: '+ e.message); }

  // Try to read BX24 placement (when inside Bitrix iframe)
  if (window.BX24 && typeof BX24.placement !== 'undefined') {
    try {
      BX24.placement.info((d) => {
        add('placement='+ (d && d.placement));
        add('options='+ JSON.stringify(d && d.options || {}));
        statusEl.textContent = 'BX24 доступен. Готово к работе';
        statusEl.className = 'status ok';
        submit.removeAttribute('disabled');
      });
    } catch(e){
      add('placement error: '+ e.message);
    }
  } else {
    statusEl.textContent = 'BX24 не доступен. Откройте виджет из карточки сделки.';
    statusEl.className = 'status error';
  }

  // Fake submit
  submit.addEventListener('click', () => {
    submit.setAttribute('disabled','');
    statusEl.textContent = 'Отправляем…';
    statusEl.className = 'status info';
    setTimeout(() => {
      document.getElementById('done').hidden = false;
      statusEl.textContent = 'Готово';
      statusEl.className = 'status ok';
    }, 750);
  });
})();
