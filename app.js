
// === Config ===
const ADMIN_PIN = '602438229';

// Utils
const $ = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>Array.from(p.querySelectorAll(s));
const toast = (m)=>{ const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); };

// Storage safe
let safeLocalStorage = null;
try{ localStorage.setItem('__t','1'); localStorage.removeItem('__t'); safeLocalStorage = localStorage; }catch(e){
  let mem = {}; safeLocalStorage = { getItem:k=>mem[k]||null, setItem:(k,v)=>{mem[k]=String(v)}, removeItem:k=>{delete mem[k]} };
}

const KEY = 'icr_vehiculos_v2';
const ADMIN_KEY = 'icr_admin';

function isAdmin(){ return sessionStorage.getItem(ADMIN_KEY)==='1'; }
function loginAdmin(pin){
  if(pin===ADMIN_PIN){ sessionStorage.setItem(ADMIN_KEY,'1'); toast('Sesión iniciada'); mostrarAdminUI(); return true; }
  toast('PIN incorrecto'); return false;
}
function logoutAdmin(){ sessionStorage.removeItem(ADMIN_KEY); hideAdminUI(); toast('Sesión cerrada'); }

function mostrarAdminUI(){ const nav=$("#adminNav"); if(nav) nav.hidden=false; const form=$("#formVehiculo"); if(form) form.hidden=false; }
function hideAdminUI(){ const nav=$("#adminNav"); if(nav) nav.hidden=true; const form=$("#formVehiculo"); if(form) form.hidden=true; }

// Example (decoración)
const ejemplo = [
  {marca:'SEAT', modelo:'Leon Cupra 300', ano:2019, km:42000, precio:21990, color:'Gris metálico', foto:'assets/seat_leon_cupra.webp'},
  {marca:'Audi', modelo:'S3 8V', ano:2018, km:58000, precio:22990, color:'Blanco perla', foto:'assets/audi_s3.webp'},
  {marca:'Audi', modelo:'RS3', ano:2017, km:61000, precio:24990, color:'Azul Nardo', foto:'assets/audi_rs3.webp'},
  {marca:'Volkswagen', modelo:'Golf 7 R', ano:2018, km:55000, precio:23990, color:'Negro metálico', foto:'assets/golf_r.webp'},
];
function pintarEjemplo(){ const c=$("#cardsEjemplo"); if(!c) return; c.innerHTML = ejemplo.map(v=>`
  <article class="card">
    <img src="${v.foto}" alt="${v.marca} ${v.modelo}">
    <div class="body">
      <div class="title">${v.marca} ${v.modelo}</div>
      <div class="meta">${v.ano} · ${Intl.NumberFormat('es-ES').format(v.km)} km · ${v.color}</div>
      <div class="price">${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio)}</div>
    </div>
  </article>
`).join(''); }

// Real vehicles
function leerVehiculos(){ try{ return JSON.parse(safeLocalStorage.getItem(KEY)) || []; }catch(e){ return []; } }
function guardarVehiculo(v){ if(!isAdmin()) return toast('Acceso restringido'); const a=leerVehiculos(); a.unshift(v); safeLocalStorage.setItem(KEY, JSON.stringify(a)); }
function borrarVehiculo(id){ if(!isAdmin()) return toast('Acceso restringido'); const a=leerVehiculos().filter(x=>x.id!==id); safeLocalStorage.setItem(KEY, JSON.stringify(a)); }

function renderListado(){
  const cont=$("#listaVehiculos"); if(!cont) return;
  const filtro = ($("#filtroTexto")?.value||'').toLowerCase();
  const orden = $("#filtroOrden")?.value || 'nuevo';
  let data = leerVehiculos().filter(v=> [v.marca,v.modelo,v.combustible,v.descripcion,v.color].join(' ').toLowerCase().includes(filtro) );
  if(data.length===0){ $("#emptyState").hidden=false; cont.innerHTML=''; return; }
  $("#emptyState").hidden=true;
  if(orden==='precioAsc') data.sort((a,b)=>a.precio-b.precio);
  if(orden==='precioDesc') data.sort((a,b)=>b.precio-a.precio);
  if(orden==='kmAsc') data.sort((a,b)=>a.km-b.km);
  if(orden==='nuevo') data.sort((a,b)=> (b._ts||0)-(a._ts||0) );
  cont.innerHTML = data.map(v=>{
    const foto = (v.fotos && v.fotos[0]) ? v.fotos[0] : 'logo_icr.jpg';
    const titulo = `${v.marca} ${v.modelo}`;
    const url = `detalle.html?id=${encodeURIComponent(v.id)}`;
    return `
      <article class="card">
        <img src="${foto}" alt="${titulo}">
        <div class="body">
          <div class="title">${titulo}</div>
          <div class="meta">${v.ano} · ${Intl.NumberFormat('es-ES').format(v.km)} km · ${v.color||'—'}</div>
          <div class="actions">
            <span class="badge">${v.combustible||'—'}</span>
            <a class="btn" href="${url}">Ver ficha</a>
          </div>
          <div class="price">${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio)}</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderDetalle(){
  const root=$("#detalleVehiculo"); if(!root) return;
  const id = new URLSearchParams(location.search).get('id');
  const v = leerVehiculos().find(x=>String(x.id)===String(id));
  if(!v){ root.innerHTML='<p>No se encontró el vehículo.</p>'; return; }
  const fotos = (v.fotos && v.fotos.length) ? v.fotos : ['logo_icr.jpg'];
  root.innerHTML = `
    <div>
      <div class="gallery">${fotos.map(f=>`<img src="${f}" alt="foto vehículo">`).join('')}</div>
    </div>
    <div class="specs">
      <h2>${v.marca} ${v.modelo}</h2>
      <p class="price">${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio)}</p>
      <p class="meta">${v.ano} · ${Intl.NumberFormat('es-ES').format(v.km)} km · ${v.combustible||'—'} · ${v.cambio||'—'} · ${v.potencia? v.potencia+' CV':'—'}</p>
      <p>${(v.descripcion||'').replace(/\n/g,'<br>')}</p>
      <hr style="border-color:#e5e5e7">
      <h3>¿Te interesa?</h3>
      <p>Escríbenos a <a href="mailto:cochesycasasia@gmail.com">cochesycasasia@gmail.com</a> o llama al +34 602 438 229.</p>
    </div>
  `;
}

// Admin
function initAdmin(){
  const loginForm = $("#loginForm");
  const form = $("#formVehiculo");
  const logoutBtn = $("#btnLogout");

  if(loginForm){
    if(isAdmin()) mostrarAdminUI(); else hideAdminUI();
    loginForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      loginAdmin($("#pin").value.trim());
    });
  }
  if(logoutBtn) logoutBtn.addEventListener('click', ()=> logoutAdmin());

  const adminListado = $("#adminListado");
  function renderAdminListado(){
    if(!adminListado) return;
    const data = leerVehiculos();
    adminListado.innerHTML = data.map(v=>`
      <article class="card">
        <img src="${(v.fotos&&v.fotos[0])||'logo_icr.jpg'}" alt="${v.marca} ${v.modelo}">
        <div class="body">
          <div class="title">${v.marca} ${v.modelo}</div>
          <div class="meta">${v.ano} · ${Intl.NumberFormat('es-ES').format(v.km)} km</div>
          <div class="actions">
            <button class="btn-outline" data-del="${v.id}">Borrar</button>
          </div>
        </div>
      </article>
    `).join('');
    adminListado.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', ()=>{
      if(confirm('¿Borrar este vehículo?')){ borrarVehiculo(b.dataset.del); renderAdminListado(); renderListado(); }
    }));
  }

  if(form){
    const inputFotos = $("#inputFotos");
    const borrar = $("#btnBorrarTodo");
    const exportar = $("#btnExportar");
    const importar = $("#btnImportar");
    const inputImportar = $("#inputImportar");

    let fotos = [];
    inputFotos.addEventListener('change', async (e)=>{
      fotos=[];
      const files = Array.from(e.target.files).slice(0,12);
      for(const f of files){
        const b64 = await toBase64(f);
        fotos.push(b64);
      }
      toast(fotos.length+' foto(s) añadidas');
    });

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!isAdmin()) return toast('Acceso restringido');
      const fd = new FormData(form);
      const v = Object.fromEntries(fd.entries());
      v.precio = Number(v.precio||0);
      v.km = Number(v.km||0);
      v.ano = Number(v.ano||0);
      v.potencia = Number(v.potencia||0);
      v.fotos = fotos;
      v.id = Date.now().toString(36);
      v._ts = Date.now();
      guardarVehiculo(v);
      toast('Vehículo guardado');
      form.reset(); fotos=[];
      renderAdminListado(); renderListado();
    });

    borrar.addEventListener('click', ()=>{
      if(confirm('¿Seguro que quieres borrar TODOS los vehículos reales en este navegador?')){
        safeLocalStorage.removeItem(KEY);
        toast('Inventario borrado');
        renderAdminListado(); renderListado();
      }
    });

    exportar.addEventListener('click', ()=>{
      const data = JSON.stringify(leerVehiculos(), null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'icr_inventario.json'; a.click();
      URL.revokeObjectURL(url);
    });

    importar.addEventListener('click', ()=> inputImportar.click());
    inputImportar.addEventListener('change', async (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      try{
        const arr = JSON.parse(text);
        safeLocalStorage.setItem(KEY, JSON.stringify(arr));
        toast('Importación completada');
        renderAdminListado(); renderListado();
      }catch(err){ alert('Archivo inválido'); }
    });

    renderAdminListado();
  }
}

// Helpers
function toBase64(file){
  return new Promise((res, rej)=>{
    const reader = new FileReader();
    reader.onload = ()=>res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  if(isAdmin()){ const nav = $("#adminNav"); if(nav) nav.hidden=false; }
  const loginBtn = $("#btnLogin");
  if(loginBtn){ loginBtn.addEventListener('click', ()=>{ const pin = prompt('Introduce tu PIN'); if(pin) loginAdmin(pin.trim()); }); }
  pintarEjemplo();
  renderListado();
  renderDetalle();
  initAdmin();
  const cf = $("#contactForm"); if(cf) cf.addEventListener('submit', e=>{ e.preventDefault(); toast('Mensaje enviado'); cf.reset(); });
});
