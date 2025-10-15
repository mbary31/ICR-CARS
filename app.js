function card(v){
  const fotos = (v.fotos && v.fotos.length) ? v.fotos : ['logo_icr.jpg'];
  const cover = v.cover || 0;
  const prev  = fotos[(cover - 1 + fotos.length) % fotos.length];
  const curr  = fotos[cover];
  const next  = fotos[(cover + 1) % fotos.length];
  const id = v.id || String(v._id || '');

  return `
  <article class="card" data-id="${id}">
    <div class="media" data-idx="${cover}">
      <img class="mini left"   src="${prev}"  alt="">
      <img class="mini center" src="${curr}"  alt="">
      <img class="mini right"  src="${next}"  alt="">
    </div>
    <div class="body">
      <div class="title">${v.marca||''} ${v.modelo||''}</div>
      <div class="meta">${v.ano||'—'} · ${v.km?Intl.NumberFormat('es-ES').format(v.km)+' km':'—'} · ${v.color||'—'}</div>
      <div class="badges">
        ${v.combustible?`<span class="badge">${v.combustible}</span>`:''}
        ${v.cambio?`<span class="badge">${v.cambio}</span>`:''}
        ${v.potencia?`<span class="badge">${v.potencia} CV</span>`:''}
      </div>
      <div class="price">${v.precio ? v.precio + ' €' : ''}</div>
      <div class="actions">
        <a class="btn" href="detalle.html?id=${encodeURIComponent(id)}">Ver ficha</a>
      </div>
    </div>
  </article>`;
}

function renderHome(target, data){
  target.innerHTML = data.map(v => card(v)).join('');

  target.querySelectorAll('.card .media').forEach(media => {
    let left  = media.querySelector('.mini.left');
    let cent  = media.querySelector('.mini.center');
    let right = media.querySelector('.mini.right');

    function rotate(dir){
      const l=left.src, c=cent.src, r=right.src;
      if(dir===1){ left.src=c; cent.src=r; right.src=l; }
      else       { right.src=c; cent.src=l; left.src=r; }
    }
    left.addEventListener('click',  e => { e.preventDefault(); rotate(-1); });
    right.addEventListener('click', e => { e.preventDefault(); rotate(+1); });

    let sx=null;
    media.addEventListener('touchstart', e=>{ sx=e.touches[0].clientX; }, {passive:true});
    media.addEventListener('touchend',   e=>{
      if(sx==null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if(Math.abs(dx) > 30) rotate(dx<0 ? +1 : -1);
      sx=null;
    });
  });
}
