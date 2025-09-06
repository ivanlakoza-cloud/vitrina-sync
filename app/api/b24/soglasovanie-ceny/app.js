(function(){
  const q = new URL(location.href).search;
  document.getElementById('q').textContent = 'query=' + q;
  // BX24 доступен только внутри iframe Битрикс24
  const bxStr = (typeof window.BX24 !== 'undefined') ? 'typeof BX24=object' : 'typeof BX24=' + typeof window.BX24;
  document.getElementById('bx').textContent = bxStr;

  // простая логика — активируем кнопку сразу, чтобы можно было проверить клик
  const btn = document.getElementById('submit');
  btn.disabled = false;
  btn.addEventListener('click', () => {
    btn.disabled = true;
    document.getElementById('thanks').classList.remove('hidden');
  });
})();
