
// Utils
const $ = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>Array.from(p.querySelectorAll(s));
const toast = (m)=>{ const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); };

// Storage
const KEY = 'icr_vehiculos_v1';

function leerVehiculos(){
  try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return []; }
}
function guardarVehiculo(v){
  const arr = leerVehiculos();
  arr.unshift(v);
  localStorage.setItem(KEY, JSON.stringify(arr));
}
function borrarTodo(){
  localStorage.removeItem(KEY);
}

// Render listado
function renderListado(){
  const cont = $("#listaVehiculos");
  if(!cont) return;
  const filtroTexto = $("#filtroTexto").value.toLowerCase();
  const orden = $("#filtroOrden").value;

  let data = leerVehiculos().filter(v=>{
    const t = [v.marca,v.modelo,v.combustible,v.descripcion].join(' ').toLowerCase();
    return t.includes(filtroTexto);
  });

  if(data.length===0){ $("#emptyState").hidden=false; cont.innerHTML=''; return; }
  $("#emptyState").hidden=true;

  if(orden==='precioAsc') data.sort((a,b)=>a.precio-b.precio);
  if(orden==='precioDesc') data.sort((a,b)=>b.precio-a.precio);
  if(orden==='kmAsc') data.sort((a,b)=>a.km-b.km);
  if(orden==='nuevo') data.sort((a,b)=> (b._ts||0)-(a._ts||0) );

  cont.innerHTML = data.map(v=>{
    const foto = (v.fotos && v.fotos[0]) ? v.fotos[0] : 'assets/logo_icr.jpg';
    const titulo = `${v.marca} ${v.modelo}`;
    const url = `detalle.html?id=${encodeURIComponent(v.id)}`;
    return `
      <article class="card vehicle">
        <img src="${foto}" alt="${titulo}">
        <div class="body">
          <div class="price">${fmtEUR(v.precio)}</div>
          <div class="meta">${titulo} · ${v.ano} · ${fmtKM(v.km)} km</div>
          <div class="actions">
            <span class="badge">${v.combustible||'—'}</span>
            <a class="btn" href="${url}">Ver ficha</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function fmtEUR(n){ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n); }
function fmtKM(n){ return new Intl.NumberFormat('es-ES').format(n); }

// Filtros eventos
if($("#filtroTexto")) $("#filtroTexto").addEventListener('input', renderListado);
if($("#filtroOrden")) $("#filtroOrden").addEventListener('change', renderListado);

// Detalle
function renderDetalle(){
  const root = $("#detalleVehiculo");
  if(!root) return;
  const id = new URLSearchParams(location.search).get('id');
  const v = leerVehiculos().find(x=>String(x.id)===String(id));
  if(!v){ root.innerHTML = '<p>No se encontró el vehículo.</p>'; return; }

  const fotos = (v.fotos && v.fotos.length) ? v.fotos : ['assets/logo_icr.jpg'];
  root.innerHTML = `
    <div>
      <div class="gallery">
        ${fotos.map(f=>`<img src="${f}" alt="foto vehículo">`).join('')}
      </div>
    </div>
    <div class="specs">
      <h2>${v.marca} ${v.modelo}</h2>
      <p class="price">${fmtEUR(v.precio)}</p>
      <p class="meta">${v.ano} · ${fmtKM(v.km)} km · ${v.combustible||'—'} · ${v.cambio||'—'} · ${v.potencia? v.potencia+' CV':'—'}</p>
      <p>${(v.descripcion||'').replace(/\n/g,'<br>')}</p>
      <hr style="border-color:#1f1f1f">
      <h3>¿Te interesa?</h3>
      <p>Escríbenos a <a href="mailto:info@icrcars.es">info@icrcars.es</a> indicando el título del anuncio.</p>
    </div>
  `;
}

// Admin
function initAdmin(){
  const form = $("#formVehiculo");
  if(!form) return;
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
    toast('Anuncio guardado');
    form.reset(); fotos=[];
  });

  borrar.addEventListener('click', ()=>{
    if(confirm('¿Seguro que quieres borrar todos los anuncios guardados en este navegador?')){
      borrarTodo(); toast('Todo borrado');
    }
  });

  exportar.addEventListener('click', ()=>{
    const data = JSON.stringify(leerVehiculos(), null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'icr_anuncios.json'; a.click();
    URL.revokeObjectURL(url);
  });

  importar.addEventListener('click', ()=> inputImportar.click());
  inputImportar.addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const text = await file.text();
    try{
      const arr = JSON.parse(text);
      localStorage.setItem(KEY, JSON.stringify(arr));
      toast('Importación completada');
    }catch(err){ alert('Archivo inválido'); }
  });
}

function toBase64(file){
  return new Promise((res, rej)=>{
    const reader = new FileReader();
    reader.onload = ()=>res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// Forms (demo)
if($("#contactForm")) $("#contactForm").addEventListener('submit', e=>{ e.preventDefault(); toast('Mensaje enviado'); e.target.reset(); });
if($("#tasacionForm")) $("#tasacionForm").addEventListener('submit', e=>{ e.preventDefault(); toast('Solicitud recibida'); e.target.reset(); });

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  renderListado();
  renderDetalle();
  initAdmin();
});
