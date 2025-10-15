
/* --- PATCH JS --- */
(async function(){
  const $=(s,p=document)=>p.querySelector(s);
  const $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
  const toast=(t)=>{const el=$("#toast"); if(!el) return; el.textContent=t; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200);};

  // Detect which storage is present (v1/v2 naming)
  const hasIDB = 'indexedDB' in window;
  const DB_NAME = (window.DB_NAME)||'icrCarsDBv2', STORE=(window.STORE)||'vehiculos';

  const idb = {
    db:null,
    async init(){
      if(!hasIDB) return null;
      if(this.db) return this.db;
      return new Promise((res,rej)=>{
        const req=indexedDB.open(DB_NAME,1);
        req.onupgradeneeded=()=>{
          const db=req.result;
          if(!db.objectStoreNames.contains(STORE)){
            db.createObjectStore(STORE,{keyPath:'id'});
          }
        };
        req.onsuccess=()=>{ this.db=req.result; res(this.db); };
        req.onerror=()=>rej(req.error);
      });
    },
    async all(){
      if(!hasIDB) return JSON.parse(localStorage.getItem('icr_stock_v2')||'[]');
      const db=await this.init();
      return new Promise((res,rej)=>{
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).getAll();
        req.onsuccess=()=>{
          const arr=req.result||[];
          arr.sort((a,b)=> new Date(b.created_at||b._ts||0) - new Date(a.created_at||a._ts||0) );
          res(arr);
        };
        req.onerror=()=>rej(req.error);
      });
    },
    async get(id){
      if(!hasIDB){
        const arr=JSON.parse(localStorage.getItem('icr_stock_v2')||'[]');
        return arr.find(v=>v.id===id||v._id===id)||null;
      }
      const db=await this.init();
      return new Promise((res,rej)=>{
        const tx=db.transaction(STORE,'readonly');
        const req=tx.objectStore(STORE).get(id);
        req.onsuccess=()=>res(req.result||null);
        req.onerror=()=>rej(req.error);
      });
    }
  };

  function price(v){return v?new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v):''}
  function card(v){
    const foto = (v.fotos && v.fotos.length) ? v.fotos[v.cover||0] : 'logo_icr.jpg';
    const id = v.id || v._id;
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
        <div class="price">${price(v.precio)}</div>
        <div class="actions"><a class="btn" href="detalle.html?id=${encodeURIComponent(id)}">Ver ficha</a></div>
      </div>
    </article>`;
  }

  // --- Home: show top 3 ---
  async function renderHome(){
    const target=$("#ultimo"); if(!target) return;
    const arr=await idb.all();
    const top3 = arr.slice(0,3);
    target.innerHTML = top3.length ? top3.map(v=>card(v)).join('') : '<div class="empty">Sin stock por ahora.</div>';
  }

  // --- Detalle: robust lightbox ---
  async function renderDetalle(){
    const root=$("#detalle"); if(!root) return;
    const qs=new URLSearchParams(location.search);
    const id = qs.get('id');
    if(!id){ root.innerHTML='<p>No se encontró el vehículo.</p>'; return; }
    const v = await idb.get(id);
    if(!v){ root.innerHTML='<p>No se encontró el vehículo.</p>'; return; }

    const fotos = (v.fotos && v.fotos.length) ? v.fotos : ['logo_icr.jpg'];
    const cover = v.cover || 0;

    root.innerHTML = `
      <div>
        <div class="gallery-main"><img id="gMain" src="${fotos[cover]}" alt="foto principal"></div>
        <div class="gallery-thumbs" id="gThumbs">${fotos.map((f,i)=>`<img data-i="${i}" src="${f}" alt="thumb">`).join('')}</div>
      </div>
      <div class="specs">
        <h2>${v.marca||''} ${v.modelo||''}</h2>
        <div class="price" style="font-size:28px;margin:6px 0">${price(v.precio)}</div>
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
        <hr>
        <h3>¿Te interesa?</h3>
        <p>Escríbenos a <a href="mailto:cochesycasasia@gmail.com">cochesycasasia@gmail.com</a> o llama al +34 602 438 229.</p>
      </div>
    `;

    $("#gThumbs").addEventListener('click', e=>{
      const t=e.target.closest('img'); if(!t) return;
      $("#gMain").src = fotos[Number(t.dataset.i)];
    });

    // Lightbox events
    const lb=$("#lightbox"), lbImg=$("#lbImg");
    let idx = cover;
    const openLB=(i)=>{ idx=i; lbImg.src=fotos[idx]; lb.hidden=false; lb.classList.add('on'); };
    const closeLB=()=>{ lb.classList.remove('on'); lb.hidden=true; };
    $("#gMain").addEventListener('click', ()=> openLB(fotos.indexOf($("#gMain").src) >= 0 ? fotos.indexOf($("#gMain").src) : idx) );
    $("#lbClose").addEventListener('click', closeLB);
    $("#lbPrev").addEventListener('click', ()=>{ idx=(idx-1+fotos.length)%fotos.length; lbImg.src=fotos[idx]; });
    $("#lbNext").addEventListener('click', ()=>{ idx=(idx+1)%fotos.length; lbImg.src=fotos[idx]; });
    lb.addEventListener('click', (e)=>{ if(e.target===lb) closeLB(); });
    document.addEventListener('keydown', (e)=>{
      if(lb.hidden) return;
      if(e.key==='Escape') closeLB();
      if(e.key==='ArrowLeft') $("#lbPrev").click();
      if(e.key==='ArrowRight') $("#lbNext").click();
    });
  }

  // Boot
  document.addEventListener('DOMContentLoaded', ()=>{
    renderHome();
    renderDetalle();
  });
})();
