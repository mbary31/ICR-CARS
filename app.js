
// Config local (como antes)
const ADMIN_PIN='602438229';
const KEY='icr_stock_v1';
const ADMIN_KEY='icr_admin';

const $=(s,p=document)=>p.querySelector(s);
const toast=(t)=>{const el=$("#toast"); if(!el) return; el.textContent=t; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2400);};

// almacenamiento local con fallback por si Safari bloquea
let store=null; try{ localStorage.setItem('_t','1'); localStorage.removeItem('_t'); store=localStorage; }catch(e){ let m={}; store={getItem:k=>m[k]||null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}; }

// migración de claves antiguas (por si tus coches estaban en otra clave)
(function migrateKeys(){
  try{
    const CURRENT=KEY;
    const oldKeys=['icr_vehiculos_pro','icr_inventario','icr_vehiculos','icr_stock_v1_bak'];
    const existing = JSON.parse(store.getItem(CURRENT)||'[]');
    let merged = existing.slice();
    for(const k of oldKeys){
      const raw = store.getItem(k);
      if(!raw) continue;
      try{
        const arr = JSON.parse(raw);
        if(Array.isArray(arr)){ merged = arr.concat(merged); }
        store.removeItem(k);
      }catch{}
    }
    if(merged.length !== existing.length){ store.setItem(CURRENT, JSON.stringify(merged)); }
  }catch(e){}
})();

function isAdmin(){ return sessionStorage.getItem(ADMIN_KEY)==='1'; }
function login(pin){ if(pin===ADMIN_PIN){ sessionStorage.setItem(ADMIN_KEY,'1'); $("#adminLink")?.removeAttribute('hidden'); $("#form")?.removeAttribute('hidden'); toast('Sesión iniciada'); } else toast('PIN incorrecto'); }
function logout(){ sessionStorage.removeItem(ADMIN_KEY); $("#form")?.setAttribute('hidden',true); toast('Sesión cerrada'); }

function getAll(){ try{ return JSON.parse(store.getItem(KEY))||[] }catch(e){ return [] } }
function saveAll(arr){ try{ store.setItem(KEY, JSON.stringify(arr)); }catch(e){ toast('Límite del navegador: usa menos fotos.'); throw e; } }
function newest(){ const a=getAll(); return a[0]||null; }

function card(v, withBtn=false){
  const foto=(v.fotos&&v.fotos[0])||'logo_icr.jpg';
  return `<article class="card">
    <div class="media"><img src="${foto}" alt="${v.marca} ${v.modelo}"></div>
    <div class="body">
      <div class="title">${v.marca} ${v.modelo}</div>
      <div class="meta">${v.ano||'—'} · ${v.km?Intl.NumberFormat('es-ES').format(v.km)+' km':'—'} · ${v.color||'—'}</div>
      <div class="price">${v.precio? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio):''}</div>
      ${withBtn? `<button class="btn-outline del" data-id="${v._id}">Borrar</button>`:''}
    </div>
  </article>`;
}

// Home
function renderHome(){ const c=$("#ultimo"); if(!c) return; const v=newest(); c.innerHTML=v?card(v):'<div class="empty">Sin stock por ahora.</div>'; }

// Listado
function renderListado(){
  const lista=$("#lista"); if(!lista) return;
  const q=$("#q")?.value.toLowerCase()||'';
  const orden=$("#orden")?.value||'nuevo';
  let a=getAll().filter(v=>[v.marca,v.modelo,v.color,v.combustible,(v.descripcion||'')].join(' ').toLowerCase().includes(q));
  if(orden==='precioAsc') a.sort((x,y)=>x.precio-y.precio);
  if(orden==='precioDesc') a.sort((x,y)=>y.precio-x.precio);
  if(orden==='kmAsc') a.sort((x,y)=>x.km-y.km);
  if(orden==='nuevo') a.sort((x,y)=>new Date(y._ts)-new Date(x._ts));
  $("#vacio").hidden = a.length>0;
  lista.innerHTML=a.map(v=>card(v)).join('');
}

// Admin
function bindAdmin(){
  const loginForm=$("#login"); const form=$("#form"); const fotosIn=$("#fotos"); const list=$("#adminLista");
  if(!loginForm) return;

  if(isAdmin()){ $("#adminLink")?.removeAttribute('hidden'); form?.removeAttribute('hidden'); }
  loginForm.addEventListener('submit', e=>{ e.preventDefault(); login($("#pin").value.trim()); });
  $("#logout")?.addEventListener('click', logout);

  let fotos=[];
  fotosIn?.addEventListener('change', async (e)=>{
    fotos=[];
    const files = Array.from(e.target.files);
    const MAX_TOTAL_BYTES = 3_600_000; // ~3.6MB
    let total = 0;
    for(const f of files){
      const b64 = await toBase64Compressed(f, 1200, 0.72);
      const bytes = base64Bytes(b64);
      if(total + bytes > MAX_TOTAL_BYTES){ toast('Se limitaron fotos por el tamaño del navegador.'); break; }
      fotos.push(b64); total += bytes;
      if(fotos.length>=6){ toast('Máximo 6 fotos en modo local.'); break; }
    }
    toast(`${fotos.length} foto(s) añadidas`);
  });

  form?.addEventListener('submit', e=>{
    e.preventDefault();
    if(!isAdmin()) return toast('Acceso restringido');
    const fd = new FormData(form); const v = Object.fromEntries(fd.entries());
    v.precio=Number(v.precio||0); v.km=Number(v.km||0); v.ano=Number(v.ano||0); v.potencia=Number(v.potencia||0);
    v.fotos=fotos; v._ts=new Date().toISOString(); v._id=Date.now().toString(36);
    const a=getAll(); a.unshift(v);
    try{ saveAll(a); toast('Vehículo guardado'); form.reset(); fotos=[]; renderListado(); renderAdminList(); renderHome(); }
    catch(err){ /* warning already shown */ }
  });

  $("#purge")?.addEventListener('click', ()=>{ if(confirm('Solo borra el almacenamiento local de este navegador.')){ store.removeItem(KEY); renderListado(); renderAdminList(); renderHome(); }});

  function renderAdminList(){
    if(!list) return;
    const a=getAll(); list.innerHTML=a.map(v=>card(v,true)).join('');
    list.querySelectorAll('.del').forEach(btn=> btn.addEventListener('click', ()=>{
      if(confirm('¿Borrar este vehículo?')){
        const id=btn.dataset.id; const arr=getAll().filter(x=>x._id!==id); saveAll(arr); renderListado(); renderAdminList(); renderHome();
      }
    }));
  }
  renderAdminList();
}

function base64Bytes(b64){
  const i = b64.indexOf(',');
  const s = i>=0 ? b64.slice(i+1) : b64;
  const len = s.length - (s.endsWith('==')?2: s.endsWith('=')?1:0);
  return Math.floor(len * 3/4);
}

function toBase64Compressed(file, maxSide=1200, quality=0.72){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let {width, height} = img;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        try{ resolve(canvas.toDataURL('image/jpeg', quality)); }
        catch(err){ reject(err); }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  $("#quickLogin")?.addEventListener('click', ()=>{ const pin=prompt('PIN'); if(pin) login(pin.trim()); });
  if(isAdmin()) $("#adminLink")?.removeAttribute('hidden');
  renderHome(); renderListado(); bindAdmin();
  $("#q")?.addEventListener('input', renderListado);
  $("#orden")?.addEventListener('change', renderListado);
  $("#contacto")?.addEventListener('submit', e=>{ e.preventDefault(); toast('Mensaje enviado'); e.target.reset(); });
});

// Ejemplos (decoración)
const ejemplo=[
  {marca:'SEAT',modelo:'Leon Cupra 300',ano:2019,km:42000,precio:21990,color:'Gris',foto:'assets/seat_leon_cupra.webp'},
  {marca:'Audi',modelo:'S3 8V',ano:2018,km:58000,precio:22990,color:'Blanco',foto:'assets/audi_s3.webp'},
  {marca:'Audi',modelo:'RS3',ano:2017,km:61000,precio:24990,color:'Azul',foto:'assets/audi_rs3.webp'},
  {marca:'VW',modelo:'Golf 7 R',ano:2018,km:55000,precio:23990,color:'Negro',foto:'assets/golf_r.webp'},
];
function pintarEjemplo(){ const c=$("#ejemplo"); if(!c) return; c.innerHTML=ejemplo.map(v=>`
  <article class="card">
    <div class="media"><img src="${v.foto}" alt="${v.marca} ${v.modelo}"></div>
    <div class="body"><div class="title">${v.marca} ${v.modelo}</div>
    <div class="meta">${v.ano} · ${Intl.NumberFormat('es-ES').format(v.km)} km · ${v.color}</div>
    <div class="price">${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio)}</div></div>
  </article>`).join(''); }

document.addEventListener('DOMContentLoaded', pintarEjemplo);
