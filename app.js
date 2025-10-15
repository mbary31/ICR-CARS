/* ICR_BUILD_THREE_FIXES_v3_20251015191514_UTC */

/* THREE FIXES v3 — only:
   1) Home: show 3 latest
   2) 'Ver ficha' link sits below price (CSS handles layout)
   3) Lightbox close works (X, backdrop, ESC) on detalle.html only
*/
(function(){"use strict";
  const VER = document.currentScript && document.currentScript.textContent.split('\n')[0] || 'ICR_THREE_FIXES';
  const $=(s,p=document)=>p.querySelector(s);
  const $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
  const fmtEur=(v)=>v?new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v):'';

  // ========= Storage readers (IndexedDB v2 -> fallback localStorage v2 -> v1) =========
  const hasIDB = 'indexedDB' in window;
  const DB_NAME='icrCarsDBv2', STORE='vehiculos';

  const storage = {
    async all(){ 
      if(hasIDB){
        try{
          const db = await new Promise((res,rej)=>{ const r=indexedDB.open(DB_NAME,1); r.onupgradeneeded=()=>{ const db=r.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
          const arr = await new Promise((res,rej)=>{ const tx=db.transaction(STORE,'readonly'); const g=tx.objectStore(STORE).getAll(); g.onsuccess=()=>res(g.result||[]); g.onerror=()=>rej(g.error); });
          if(arr && arr.length) return arr.sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0));
        }catch(_){}
      }
      try{ const v2 = JSON.parse(localStorage.getItem('icr_stock_v2')||'[]'); if(v2.length) return v2; }catch(_){}
      try{ const v1 = JSON.parse(localStorage.getItem('icr_stock_v1')||'[]'); if(v1.length) return v1; }catch(_){}
      return [];
    },
    async get(id){ 
      if(hasIDB){
        try{
          const db = await new Promise((res,rej)=>{ const r=indexedDB.open(DB_NAME,1); r.onupgradeneeded=()=>{ const db=r.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
          const obj = await new Promise((res,rej)=>{ const tx=db.transaction(STORE,'readonly'); const g=tx.objectStore(STORE).get(id); g.onsuccess=()=>res(g.result||null); g.onerror=()=>rej(g.error); });
          if(obj) return obj;
        }catch(_){}
      }
      try{ const v2 = JSON.parse(localStorage.getItem('icr_stock_v2')||'[]'); const f=v2.find(x=>String(x.id)===String(id)); if(f) return f; }catch(_){}
      try{ const v1 = JSON.parse(localStorage.getItem('icr_stock_v1')||'[]'); const f=v1.find(x=>String(x.id||x._id)===String(id)); if(f) return f; }catch(_){}
      return null;
    }
  };

  function card(v){
    const foto=(v.fotos&&v.fotos.length)? v.fotos[v.cover||0] : 'logo_icr.jpg';
    const id=v.id||String(v._id||'');
    return `<article class="card">
      <div class="media"><img src="${foto}" alt="${v.marca||''} ${v.modelo||''}"></div>
      <div class="body">
        <div class="title">${v.marca||''} ${v.modelo||''}</div>
        <div class="meta">${v.ano||'—'} · ${v.km?Intl.NumberFormat('es-ES').format(v.km)+' km':'—'} · ${v.color||'—'}</div>
        <div class="badges">
          ${v.combustible?`<span class="badge">${v.combustible}</span>`:''}
          ${v.cambio?`<span class="badge">${v.cambio}</span>`:''}
          ${v.potencia?`<span class="badge">${v.potencia} CV</span>`:''}
        </div>
        <div class="price">${fmtEur(v.precio)}</div>
        <div class="actions"><a class="btn" href="detalle.html?id=${encodeURIComponent(id)}">Ver ficha</a></div>
      </div>
    </article>`;
  }

  // ========== Home: show top 3 ==========
  async function renderHome3(){
    const cont=$("#ultimo"); if(!cont) return;
    const arr = await storage.all();
    cont.innerHTML = (arr.slice(0,3).map(card).join('')) || '<div class="empty">Sin stock por ahora.</div>';
  }

  // ========== Detalle: robust lightbox ==========
  async function renderDetalle(){
    const root=$("#detalle"); if(!root) return;
    const id=new URLSearchParams(location.search).get('id');
    if(!id) { root.innerHTML='<p>No se encontró el vehículo.</p>'; return; }
    const v=await storage.get(id);
    if(!v) { root.innerHTML='<p>No se encontró el vehículo.</p>'; return; }

    const fotos=(v.fotos&&v.fotos.length)? v.fotos : ['logo_icr.jpg'];
    const cover=v.cover||0;
    root.innerHTML = `
      <div>
        <div class="gallery-main"><img id="gMain" src="${fotos[cover]}" alt="foto principal"></div>
        <div class="gallery-thumbs" id="gThumbs">${fotos.map((f,i)=>`<img data-i="${i}" src="${f}" alt="thumb">`).join('')}</div>
      </div>
      <div class="specs">
        <h2>${v.marca||''} ${v.modelo||''}</h2>
        <div class="price" style="font-size:28px;margin:6px 0">${fmtEur(v.precio)}</div>
        <div class="badges" style="margin:6px 0">
          ${v.ano?`<span class="badge">${v.ano}</span>`:''}
          ${v.km?`<span class="badge">${Intl.NumberFormat('es-ES').format(v.km)} km</span>`:''}
          ${v.combustible?`<span class="badge">${v.combustible}</span>`:''}
          ${v.cambio?`<span class="badge">${v.cambio}</span>`:''}
          ${v.potencia?`<span class="badge">${v.potencia} CV</span>`:''}
        </div>
        <table>
          <tr><td><b>Color</b></td><td>${v.color||'—'}</td></tr>
          <tr><td><b>Descripción</b></td><td>${(v.descripcion||'').replace(/\\n/g,'<br>')}</td></tr>
        </table>
      </div>
    `;

    $("#gThumbs").addEventListener('click', e=>{ const t=e.target.closest('img'); if(!t) return; $("#gMain").src=fotos[Number(t.dataset.i)]; });

    const lb=$("#lightbox"), lbImg=$("#lbImg");
    if(!lb || !lbImg) return;
    let idx=cover;
    const openLB=(i)=>{ idx=i; lbImg.src=fotos[idx]; lb.hidden=false; };
    const closeLB=()=>{ lb.hidden=true; };

    $("#gMain").addEventListener('click', ()=> openLB(idx) );
    $("#lbClose").addEventListener('click', closeLB);
    $("#lbPrev").addEventListener('click', ()=>{ idx=(idx-1+fotos.length)%fotos.length; lbImg.src=fotos[idx]; });
    $("#lbNext").addEventListener('click', ()=>{ idx=(idx+1)%fotos.length; lbImg.src=fotos[idx]; });
    lb.addEventListener('click', (e)=>{ if(e.target===lb) closeLB(); });
    document.addEventListener('keydown', (e)=>{ if(lb.hidden) return; if(e.key==='Escape') closeLB(); if(e.key==='ArrowLeft') $("#lbPrev").click(); if(e.key==='ArrowRight') $("#lbNext").click(); });
  }

  document.addEventListener('DOMContentLoaded', ()=>{ renderHome3(); renderDetalle(); });
})();