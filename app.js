// ====== Config ======
const ADMIN_PIN='602438229';
const ADMIN_KEY='icr_admin_v2';

// ====== Helpers ======
const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
const toast=(t)=>{const el=$("#toast"); if(!el) return; el.textContent=t; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200);};
function price(v){return v?new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v):''}

// ====== IndexedDB (con fallback) ======
const DB_NAME='icrCarsDBv2', STORE='vehiculos';
const hasIDB = 'indexedDB' in window;

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
          const os=db.createObjectStore(STORE,{keyPath:'id'});
          os.createIndex('created_at','created_at');
        }
      };
      req.onsuccess=()=>{ this.db=req.result; res(this.db); };
      req.onerror=()=>rej(req.error);
    });
  },
  async all(){
    if(!hasIDB) return local.all();
    const db=await this.init();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).getAll();
      req.onsuccess=()=>{
        const arr=req.result||[];
        arr.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
        res(arr);
      };
      req.onerror=()=>rej(req.error);
    });
  },
  async get(id){
    if(!hasIDB) return local.get(id);
    const db=await this.init();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(id);
      req.onsuccess=()=>res(req.result||null);
      req.onerror=()=>rej(req.error);
    });
  },
  async put(v){
    if(!hasIDB) return local.put(v);
    const db=await this.init();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(v);
      tx.oncomplete=()=>res(v);
      tx.onerror=()=>rej(tx.error);
    });
  },
  async del(id){
    if(!hasIDB) return local.del(id);
    const db=await this.init();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=()=>res(true);
      tx.onerror=()=>rej(tx.error);
    });
  }
};

const local = {
  KEY:'icr_stock_v2',
  all(){ try{ return JSON.parse(localStorage.getItem(this.KEY))||[] }catch(e){ return [] } },
  get(id){ return this.all().find(v=>v.id===id)||null; },
  put(v){ const a=this.all(); const i=a.findIndex(x=>x.id===v.id); if(i>=0) a[i]=v; else a.unshift(v); localStorage.setItem(this.KEY, JSON.stringify(a)); return v; },
  del(id){ const a=this.all().filter(x=>x.id!==id); localStorage.setItem(this.KEY, JSON.stringify(a)); }
};

// ====== Public listing ======
async function renderHome(){
  const c=$("#ultimo"); if(!c) return;
  const all=await idb.all(); const v=all[0];
  c.innerHTML = v ? card(v) : '<div class="empty">Sin stock por ahora.</div>';
}

function card(v, withBtns=false){
  const foto = (v.fotos && v.fotos.length) ? v.fotos[v.cover||0] : 'logo_icr.jpg';
  return `<article class="card">
    <div class="media"><img src="${foto}" alt="${v.marca} ${v.modelo}"></div>
    <div class="body">
      <div class="title">${v.marca} ${v.modelo}</div>
      <div class="meta">${v.ano||'—'} · ${v.km?Intl.NumberFormat('es-ES').format(v.km)+' km':'—'} · ${v.color||'—'}</div>
      <div class="badges">
        ${v.combustible?`<span class="badge">${v.combustible}</span>`:''}
        ${v.cambio?`<span class="badge">${v.cambio}</span>`:''}
        ${v.potencia?`<span class="badge">${v.potencia} CV</span>`:''}
      </div>
      <div class="price">${price(v.precio)}</div>
      <div class="actions"><a class="btn" href="detalle.html?id=${encodeURIComponent(v.id)}">Ver ficha</a></div>
    </div>
  </article>`;
}

async function renderListado(){
  const lista=$("#lista"); if(!lista) return;
  const q=$("#q")?.value.toLowerCase()||'';
  const orden=$("#orden")?.value||'nuevo';
  let a=await idb.all();
  a=a.filter(v=>[v.marca,v.modelo,v.color,v.combustible,(v.descripcion||'')].join(' ').toLowerCase().includes(q));
  if(orden==='precioAsc') a.sort((x,y)=>x.precio-y.precio);
  if(orden==='precioDesc') a.sort((x,y)=>y.precio-x.precio);
  if(orden==='kmAsc') a.sort((x,y)=>x.km-y.km);
  if(orden==='nuevo') a.sort((x,y)=> new Date(y.created_at)-new Date(x.created_at));
  $("#vacio").hidden = a.length>0;
  lista.innerHTML=a.map(v=>card(v)).join('');
}

// ====== Detail page (mobile.de style) ======
async function renderDetalle(){
  const root=$("#detalle"); if(!root) return;
  const id=new URLSearchParams(location.search).get('id');
  if(!id){ root.innerHTML='<p>No se encontró el vehículo.</p>'; return; }
  const v=await idb.get(id);
  if(!v){ root.innerHTML='<p>No se encontró el vehículo.</p>'; return; }
  const fotos = (v.fotos && v.fotos.length)? v.fotos : ['logo_icr.jpg'];
  const cover = v.cover || 0;

  root.innerHTML=`
    <div>
      <div class="gallery-main"><img id="gMain" src="${fotos[cover]}" alt="foto principal"></div>
      <div class="gallery-thumbs" id="gThumbs">${fotos.map((f,i)=>`<img data-i="${i}" src="${f}" alt="thumb">`).join('')}</div>
    </div>
    <div class="specs">
      <h2>${v.marca} ${v.modelo}</h2>
      <div class="price" style="font-size:28px;margin:6px 0">${price(v.precio)}</div>
      <div class="badges" style="margin:6px 0">${v.ano?`<span class="badge">${v.ano}</span>`:''}${v.km?`<span class="badge">${Intl.NumberFormat('es-ES').format(v.km)} km</span>`:''}${v.combustible?`<span class="badge">${v.combustible}</span>`:''}${v.cambio?`<span class="badge">${v.cambio}</span>`:''}${v.potencia?`<span class="badge">${v.potencia} CV</span>`:''}</div>
      <table>
        <tr><td><b>Color</b></td><td>${v.color||'—'}</td></tr>
        <tr><td><b>Descripción</b></td><td>${(v.descripcion||'').replace(/\\n/g,'<br>')}</td></tr>
      </table>
      <hr>
      <h3>¿Te interesa?</h3>
      <p>Escríbenos a <a href="mailto:cochesycasasia@gmail.com">cochesycasasia@gmail.com</a> o llama al +34 602 438 229.</p>
    </div>
  `;

  // thumbs click
  $("#gThumbs").addEventListener('click', e=>{
    const t=e.target.closest('img'); if(!t) return;
    $("#gMain").src = fotos[Number(t.dataset.i)];
  });

  // lightbox
  const lb=$("#lightbox"), lbImg=$("#lbImg");
  $("#gMain").addEventListener('click', ()=>{ lb.hidden=false; lbImg.src=$("#gMain").src; });
  $("#lbClose").addEventListener('click', ()=> lb.hidden=true);
  let idx = cover;
  $("#lbPrev").addEventListener('click', ()=>{ idx=(idx-1+fotos.length)%fotos.length; lbImg.src=fotos[idx]; });
  $("#lbNext").addEventListener('click', ()=>{ idx=(idx+1)%fotos.length; lbImg.src=fotos[idx]; });
  document.addEventListener('keydown', (e)=>{
    if(lb.hidden) return;
    if(e.key==='Escape') lb.hidden=true;
    if(e.key==='ArrowLeft') $("#lbPrev").click();
    if(e.key==='ArrowRight') $("#lbNext").click();
  });
}

// ====== Admin (CRUD con edición) ======
function isAdmin(){ return sessionStorage.getItem(ADMIN_KEY)==='1'; }
function login(pin){ if(pin===ADMIN_PIN){ sessionStorage.setItem(ADMIN_KEY,'1'); $("#adminLink")?.removeAttribute('hidden'); $("#form")?.removeAttribute('hidden'); toast('Sesión iniciada'); } else toast('PIN incorrecto'); }
function logout(){ sessionStorage.removeItem(ADMIN_KEY); $("#form")?.setAttribute('hidden',true); toast('Sesión cerrada'); }

async function bindAdmin(){
  const loginForm=$("#login"); const form=$("#form"); const fotosIn=$("#fotos"); const list=$("#adminLista"); const idInput=$("#vehId");
  if(!loginForm) return;

  if(isAdmin()){ $("#adminLink")?.removeAttribute('hidden'); form?.removeAttribute('hidden'); }
  loginForm.addEventListener('submit', e=>{ e.preventDefault(); login($("#pin").value.trim()); });
  $("#logout")?.addEventListener('click', logout);

  let fotos=[]; let cover=0;
  fotosIn?.addEventListener('change', async(e)=>{
    const files=Array.from(e.target.files).slice(0,12);
    for(const f of files){
      const b64 = await toBase64CompressedPreferWebP(f, 1400, 0.82);
      fotos.push(b64);
    }
    renderThumbs();
    toast(`${files.length} foto(s) añadidas`);
  });

  function renderThumbs(){
    const box=$("#fotosList"); if(!box) return;
    box.innerHTML=fotos.map((f,i)=>`
      <div class="thumb">
        <img src="${f}" alt="foto ${i+1}">
        <div class="tools">
          <button data-act="up" data-i="${i}">↑</button>
          <button data-act="down" data-i="${i}">↓</button>
          <button data-act="cover" data-i="${i}">${i===cover?'Portada ✓':'Portada'}</button>
          <button data-act="rm" data-i="${i}">X</button>
        </div>
      </div>`).join('');
  }
  $("#fotosList")?.addEventListener('click', e=>{
    const btn=e.target.closest('button'); if(!btn) return;
    const i=Number(btn.dataset.i);
    const act=btn.dataset.act;
    if(act==='rm'){ fotos.splice(i,1); if(cover>=fotos.length) cover=Math.max(0,fotos.length-1); }
    if(act==='up' && i>0){ [fotos[i-1],fotos[i]]=[fotos[i],fotos[i-1]]; if(cover===i) cover=i-1; else if(cover===i-1) cover=i; }
    if(act==='down' && i<fotos.length-1){ [fotos[i+1],fotos[i]]=[fotos[i],fotos[i+1]]; if(cover===i) cover=i+1; else if(cover===i+1) cover=i; }
    if(act==='cover'){ cover=i; }
    renderThumbs();
  });

  $("#newBtn")?.addEventListener('click', ()=>{ idInput.value=''; form.reset(); fotos=[]; cover=0; renderThumbs(); });

  $("#saveBtn")?.addEventListener('click', async(e)=>{
    e.preventDefault();
    if(!isAdmin()) return toast('Acceso restringido');
    const fd=new FormData(form); const v=Object.fromEntries(fd.entries());
    const now=new Date().toISOString();
    const id = idInput.value || Date.now().toString(36);
    const veh={
      id,
      marca:v.marca||'', modelo:v.modelo||'', ano:Number(v.ano||0), km:Number(v.km||0),
      precio:Number(v.precio||0), combustible:v.combustible||'', potencia:Number(v.potencia||0),
      cambio:v.cambio||'', color:v.color||'', descripcion:v.descripcion||'',
      fotos, cover, created_at: idInput.value? (await idb.get(id))?.created_at || now : now,
      updated_at: now
    };
    await idb.put(veh);
    toast('Guardado');
    await renderAdminList(); await renderListado(); await renderHome();
    $("#newBtn").click();
  });

  async function renderAdminList(){
    if(!list) return;
    const arr=await idb.all();
    list.innerHTML = arr.map(v=>`
      <article class="card">
        <div class="media"><img src="${(v.fotos&&v.fotos[0])||'logo_icr.jpg'}" alt=""></div>
        <div class="body">
          <div class="title">${v.marca} ${v.modelo}</div>
          <div class="meta">${v.ano||'—'} · ${v.km?Intl.NumberFormat('es-ES').format(v.km)+' km':'—'} · ${v.color||'—'}</div>
          <div class="price">${price(v.precio)}</div>
          <div class="actions">
            <button class="btn" data-edit="${v.id}">Editar</button>
            <button class="btn-outline" data-del="${v.id}">Borrar</button>
          </div>
        </div>
      </article>`).join('');
  }
  await renderAdminList();

  list?.addEventListener('click', async(e)=>{
    const ed=e.target.closest('button[data-edit]'); const dl=e.target.closest('button[data-del]');
    if(ed){
      const id=ed.dataset.edit; const v=await idb.get(id);
      if(!v) return;
      $("#form").removeAttribute('hidden'); $("#vehId").value=v.id;
      for(const k of ['marca','modelo','ano','km','precio','combustible','potencia','cambio','color','descripcion']){
        const el=$(`[name="${k}"]`); if(el) el.value = (v[k]??'');
      }
      fotos = (v.fotos||[]).slice(); cover=v.cover||0; renderThumbs();
      window.scrollTo({top:0,behavior:'smooth'});
    }
    if(dl){
      const id=dl.dataset.del;
      if(confirm('¿Borrar este vehículo?')){
        await idb.del(id);
        await renderAdminList(); await renderListado(); await renderHome();
      }
    }
  });
}

// ====== Image compression ======
function toBase64CompressedPreferWebP(file, maxSide=1400, quality=0.82){
  return new Promise((resolve, reject)=>{
    const r=new FileReader();
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let {width, height}=img;
        const scale=Math.min(1, maxSide/Math.max(width,height));
        width=Math.round(width*scale); height=Math.round(height*scale);
        const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,width,height);
        let out;
        try{ out=canvas.toDataURL('image/webp',quality); }
        catch(e){ out=canvas.toDataURL('image/jpeg',0.82); }
        resolve(out);
      };
      img.onerror=reject;
      img.src=r.result;
    };
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}

// ====== Examples (decoración) ======
const ejemplo=[
  {marca:'SEAT',modelo:'Leon Cupra 300',ano:2019,km:42000,precio:21990,color:'Gris',foto:'assets/seat_leon_cupra.webp'},
  {marca:'Audi',modelo:'S3 8V',ano:2018,km:58000,precio:22990,color:'Blanco',foto:'assets/audi_s3.webp'},
  {marca:'Audi',modelo:'RS3',ano:2017,km:61000,precio:24990,color:'Azul',foto:'assets/audi_rs3.webp'},
  {marca:'VW',modelo:'Golf 7 R',ano:2018,km:55000,precio:23990,color:'Negro',foto:'assets/golf_r.webp'},
];
function pintarEjemplo(){ const c=$("#ejemplo"); if(!c) return; c.innerHTML=ejemplo.map(v=>`
  <article class="card">
    <div class="media"><img src="${v.foto}" alt="${v.marca} ${v.modelo}"></div>
    <div class="body">
      <div class="title">${v.marca} ${v.modelo}</div>
      <div class="meta">${v.ano} · ${Intl.NumberFormat('es-ES').format(v.km)} km · ${v.color}</div>
      <div class="price">${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio)}</div>
    </div>
  </article>`).join(''); }

// ====== Boot ======
document.addEventListener('DOMContentLoaded', async ()=>{
  if($("#quickLogin")) $("#quickLogin").addEventListener('click', ()=>{ const p=prompt('PIN'); if(p) login(p.trim()); });
  if(isAdmin()) $("#adminLink")?.removeAttribute('hidden');
  await idb.init();
  renderHome(); renderListado(); renderDetalle(); bindAdmin(); pintarEjemplo();
  $("#q")?.addEventListener('input', renderListado);
  $("#orden")?.addEventListener('change', renderListado);
  $("#contacto")?.addEventListener('submit', e=>{ e.preventDefault(); toast('Mensaje enviado'); e.target.reset(); });
});



document.addEventListener('DOMContentLoaded', function(){
  // a) "Ver ficha" soll immer zur Detailseite gehen – Klick soll NICHT von Overlay abgefangen werden
  document.body.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if(!a) return;
    if(a.matches('a.btn') && a.href && a.href.indexOf('detalle.html') !== -1){
      // Button-Klick darf nicht ein evtl. Card-Overlay auslösen
      e.stopPropagation();
      // Standard-Navigation beibehalten (kein preventDefault)
    }
  }, true); // capture=true, damit wir vor evtl. Card-Handlern stoppen

  // b) Lightbox schließen (falls vorhanden)
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const btnX  = document.getElementById('lbClose');
  const btnP  = document.getElementById('lbPrev');
  const btnN  = document.getElementById('lbNext');

  function closeLB(){ if(lb) lb.hidden = true; }
  if(lb){
    // Hintergrundklick schließt
    lb.addEventListener('click', function(ev){ if(ev.target === lb) closeLB(); });
    // ESC-Taste schließt
    document.addEventListener('keydown', function(ev){ if(lb.hidden) return; if(ev.key==='Escape') closeLB(); });
  }
  if(btnX){ btnX.addEventListener('click', closeLB); }
});


/* === ICR CARS FIX 2025 ===
   - Disable old overlay behavior
   - Ensure "X" closes detail view and returns to vehiculos.html
   - Ensure "Ver ficha" always navigates to detalle.html
*/
document.addEventListener('DOMContentLoaded', function() {
  // 1. Disable any overlay/lightbox intercepts
  const overlay = document.querySelector('#lightbox, #detalleModal');
  if (overlay) overlay.remove();

  // 2. Fix "X" close button behavior
  const closeBtn = document.querySelector('#lbClose, .close, .x-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'vehiculos.html';
    });
  }

  // 3. Ensure all "Ver ficha" buttons navigate normally
  document.body.addEventListener('click', function(e) {
    const a = e.target.closest('a.btn');
    if (a && a.href.includes('detalle.html')) {
      e.stopPropagation(); // Prevent overlay interception
    }
  });
});
