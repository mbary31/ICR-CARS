
// Supabase placeholders (pon aquí tus credenciales)
const SUPABASE_URL='https://TU-PROYECTO.supabase.co'; // cambia esto
const SUPABASE_ANON_KEY='TU-ANON-KEY'; // cambia esto

let supa=null, supaEnabled=false;
try{
  if(!SUPABASE_URL.includes('TU-PROYECTO') && SUPABASE_ANON_KEY!=='TU-ANON-KEY'){
    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supaEnabled = true;
  }
}catch(e){ console.warn('Supabase no disponible', e); }

const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
const toast=(m)=>{const t=$("#toast"); if(!t) return; t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200);};

let safeLocalStorage=null;
try{ localStorage.setItem('__t','1'); localStorage.removeItem('__t'); safeLocalStorage=localStorage; }catch(e){ let mem={}; safeLocalStorage={getItem:k=>mem[k]||null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}};}

const KEY='icr_vehiculos_pro'; const ADMIN_KEY='icr_admin_pro'; const ADMIN_PIN='602438229';
function isAdmin(){return sessionStorage.getItem(ADMIN_KEY)==='1';}
function loginAdmin(pin){ if(pin===ADMIN_PIN){ sessionStorage.setItem(ADMIN_KEY,'1'); toast('Sesión iniciada'); mostrarAdminUI(); } else toast('PIN incorrecto'); }
function logoutAdmin(){ sessionStorage.removeItem(ADMIN_KEY); ocultarAdminUI(); toast('Sesión cerrada'); }

function mostrarAdminUI(){ $("#adminNav")?.removeAttribute('hidden'); $("#formVehiculo")?.removeAttribute('hidden'); }
function ocultarAdminUI(){ $("#adminNav")?.setAttribute('hidden',true); if($("#formVehiculo")) $("#formVehiculo").hidden=true; }

const ejemplo=[
 {marca:'SEAT',modelo:'Leon Cupra 300',ano:2019,km:42000,precio:21990,color:'Gris metálico',foto:'assets/seat_leon_cupra.webp'},
 {marca:'Audi',modelo:'S3 8V',ano:2018,km:58000,precio:22990,color:'Blanco perla',foto:'assets/audi_s3.webp'},
 {marca:'Audi',modelo:'RS3',ano:2017,km:61000,precio:24990,color:'Azul Nardo',foto:'assets/audi_rs3.webp'},
 {marca:'Volkswagen',modelo:'Golf 7 R',ano:2018,km:55000,precio:23990,color:'Negro metálico',foto:'assets/golf_r.webp'},
];
function pintarEjemplo(){ const c=$("#cardsEjemplo"); if(!c) return;
  c.innerHTML=ejemplo.map(v=>`
    <article class="card">
      <div class="media"><img src="${v.foto}" alt="${v.marca} ${v.modelo}"></div>
      <div class="body">
        <div class="title">${v.marca} ${v.modelo}</div>
        <div class="meta">${v.ano} · ${Intl.NumberFormat('es-ES').format(v.km)} km · ${v.color}</div>
        <div class="price">${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio)}</div>
      </div>
    </article>`).join('');
}

async function dbList(){ if(supaEnabled){ const {data,error}=await supa.from('vehiculos').select('*').order('created_at',{ascending:false}); if(error){console.error(error); return [];} return data||[]; } try{ return JSON.parse(safeLocalStorage.getItem(KEY))||[]; }catch(e){ return []; } }
async function dbInsert(v){ if(supaEnabled){ const {data,error}=await supa.from('vehiculos').insert(v).select(); if(error){console.error(error); return null;} return data?.[0]||null; } const a=await dbList(); a.unshift(v); safeLocalStorage.setItem(KEY,JSON.stringify(a)); return v; }
async function dbDelete(id){ if(supaEnabled){ await supa.from('vehiculos').delete().eq('id',id); } else { const a=await dbList(); safeLocalStorage.setItem(KEY,JSON.stringify(a.filter(x=>x.id!==id))); } }
async function dbGet(id){ if(supaEnabled){ const {data}=await supa.from('vehiculos').select('*').eq('id',id).single(); return data; } const a=await dbList(); return a.find(x=>String(x.id)===String(id)); }

function card(v){ const foto=(v.fotos&&v.fotos[0])||'logo_icr.jpg'; const titulo=`${v.marca} ${v.modelo}`; const id=v.id||v._ts; const url=`detalle.html?id=${encodeURIComponent(id)}`;
  return `<article class="card"><div class="media"><img src="${foto}" alt="${titulo}"></div>
  <div class="body"><div class="title">${titulo}</div>
  <div class="meta">${v.ano||'—'} · ${v.km?Intl.NumberFormat('es-ES').format(v.km)+' km':'—'} · ${v.color||'—'}</div>
  <div class="actions"><span class="badge">${v.combustible||'—'}</span><a class="btn" href="${url}">Ver ficha</a></div>
  <div class="price">${v.precio?new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio):''}</div></div></article>`; }

async function renderListado(){ const cont=$("#listaVehiculos"); if(!cont) return;
  const filtro=($("#filtroTexto")?.value||'').toLowerCase(); const orden=$("#filtroOrden")?.value||'nuevo';
  let data=await dbList();
  data=data.filter(v=>[v.marca,v.modelo,v.combustible,v.descripcion,v.color].join(' ').toLowerCase().includes(filtro));
  if(orden==='precioAsc') data.sort((a,b)=>a.precio-b.precio);
  if(orden==='precioDesc') data.sort((a,b)=>b.precio-a.precio);
  if(orden==='kmAsc') data.sort((a,b)=>a.km-b.km);
  if(orden==='nuevo') data.sort((a,b)=> new Date(b.created_at||b._ts||0)-new Date(a.created_at||a._ts||0));
  cont.innerHTML = data.length? data.map(card).join('') : ($("#emptyState").hidden=false,'');
}

async function renderUltimo(){ const c=$("#ultimoVehiculo"); if(!c) return; const data=await dbList(); if(!data.length){ c.innerHTML='<div class="empty">Aún no hay vehículos.</div>'; return; } c.innerHTML=card(data[0]); }
async function renderDetalle(){ const root=$("#detalleVehiculo"); if(!root) return; const id=new URLSearchParams(location.search).get('id'); if(!id){root.innerHTML='<p>No se encontró el vehículo.</p>';return;} const v=await dbGet(id); if(!v){root.innerHTML='<p>No se encontró el vehículo.</p>';return;}
  const fotos=(v.fotos&&v.fotos.length)?v.fotos:['logo_icr.jpg'];
  root.innerHTML=`<div><div class="gallery">${fotos.map(f=>`<img src="${f}" alt="foto">`).join('')}</div></div>
  <div class="specs"><h2>${v.marca} ${v.modelo}</h2><p class="price">${v.precio?new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v.precio):''}</p>
  <p class="meta">${v.ano||'—'} · ${v.km?Intl.NumberFormat('es-ES').format(v.km)+' km':'—'} · ${v.combustible||'—'} · ${v.cambio||'—'} · ${v.potencia? v.potencia+' CV':'—'}</p>
  <p>${(v.descripcion||'').replace(/\\n/g,'<br>')}</p>
  <hr style="border-color:#e5e5e7"><h3>¿Te interesa?</h3><p>Escríbenos a <a href="mailto:cochesycasasia@gmail.com">cochesycasasia@gmail.com</a> o llama al +34 602 438 229.</p></div>`;
}

function bindAdmin(){
  const loginForm=$("#loginForm"); const form=$("#formVehiculo"); const logoutBtn=$("#btnLogout"); const adminListado=$("#adminListado");
  if(loginForm){ if(isAdmin()) mostrarAdminUI(); loginForm.addEventListener('submit',e=>{e.preventDefault(); loginAdmin($("#pin").value.trim());}); }
  if(logoutBtn){ logoutBtn.addEventListener('click', ()=> logoutAdmin()); }
  async function renderAdmin(){ if(!adminListado) return; const data=await dbList(); adminListado.innerHTML=data.map(card).join(''); adminListado.querySelectorAll('.card .btn').forEach(el=>el.remove()); // remove "Ver ficha" in admin list
    adminListado.querySelectorAll('.card').forEach((c,i)=>{ const id=data[i].id||data[i]._ts; const del=document.createElement('button'); del.className='btn-outline'; del.textContent='Borrar'; del.onclick=async()=>{ if(confirm('¿Borrar este vehículo?')){ await dbDelete(id); await renderAdmin(); await renderListado(); await renderUltimo(); } }; c.querySelector('.body .actions').appendChild(del); });
  }
  if(form){ let fotos=[]; const input=$("#inputFotos");
    input.addEventListener('change', async(e)=>{ fotos=[]; for(const f of Array.from(e.target.files).slice(0,12)){ const b64=await toBase64(f); fotos.push(b64);} toast(fotos.length+' foto(s) añadidas'); });
    form.addEventListener('submit', async(e)=>{ e.preventDefault(); if(!isAdmin()) return toast('Acceso restringido');
      const fd=new FormData(form); const v=Object.fromEntries(fd.entries());
      v.precio=Number(v.precio||0); v.km=Number(v.km||0); v.ano=Number(v.ano||0); v.potencia=Number(v.potencia||0);
      v.fotos=fotos; v.created_at=new Date().toISOString(); v.id = supaEnabled? undefined : Date.now().toString(36);
      const saved=await dbInsert(v); if(saved){ toast('Vehículo guardado'); form.reset(); fotos=[]; await renderAdmin(); await renderListado(); await renderUltimo(); }
    });
    $("#btnBorrarTodo")?.addEventListener('click', ()=>{ if(confirm('Solo borra el almacenamiento local de este navegador.')){ safeLocalStorage.removeItem(KEY); renderAdmin(); renderListado(); renderUltimo(); } });
    $("#btnExportar")?.addEventListener('click', async()=>{ const data=await dbList(); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='icr_inventario.json'; a.click(); URL.revokeObjectURL(url); });
    $("#btnImportar")?.addEventListener('click', ()=> $("#inputImportar").click());
    $("#inputImportar")?.addEventListener('change', async(e)=>{ const f=e.target.files[0]; if(!f) return; const txt=await f.text(); try{ const arr=JSON.parse(txt); if(supaEnabled){ for(const it of arr){ delete it.id; await dbInsert(it);} } else { safeLocalStorage.setItem(KEY, JSON.stringify(arr)); } toast('Importación completada'); await renderAdmin(); await renderListado(); await renderUltimo(); } catch(err){ alert('Archivo inválido'); } });
    renderAdmin();
  }
}

function toBase64(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

document.addEventListener('DOMContentLoaded',()=>{
  if(isAdmin()){ mostrarAdminUI(); }
  const loginBtn=$("#btnLogin"); if(loginBtn){ loginBtn.addEventListener('click', ()=>{ const pin=prompt('Introduce tu PIN'); if(pin) loginAdmin(pin.trim()); }); }
  pintarEjemplo(); renderListado(); renderUltimo(); renderDetalle(); bindAdmin();
  const cf=$("#contactForm"); if(cf) cf.addEventListener('submit', e=>{ e.preventDefault(); toast('Mensaje enviado'); cf.reset(); });
});
