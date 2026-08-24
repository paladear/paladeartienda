(function(){
const RUBRO_MAP={'FRUTOS SECOS':{id:'frutos',n:'Frutos Secos',ic:'🥜'},'DESHIDRATADOS':{id:'deshidratados',n:'Deshidratados',ic:'🍇'},'SEMILLAS':{id:'semillas',n:'Semillas',ic:'🌻'},'ESPECIAS':{id:'especias',n:'Especias',ic:'🌿'},'INFUSIONES Y HIERBAS':{id:'infusiones',n:'Infusiones y Hierbas',ic:'🍵'},'CEREALES':{id:'cereales',n:'Cereales',ic:'🥣'},'GRANOS Y LEGUMBRES':{id:'granos',n:'Granos y Legumbres',ic:'🫘'},'HARINAS':{id:'harinas',n:'Harinas',ic:'🌾'},'PRODUCTOS SIN TACC':{id:'sintacc',n:'Sin TACC',ic:'🌱'},'DULCES, MIEL Y CHOCOLATES':{id:'dulces',n:'Dulces, Miel y Chocolates',ic:'🍯'},'AZUCAR, CACAO Y REPOSTERIA':{id:'reposteria',n:'Azúcar, Cacao y Repostería',ic:'🍫'},'MANTECAS Y PASTAS':{id:'mantecas',n:'Mantecas y Pastas',ic:'🧈'},'ACEITES Y VINAGRES':{id:'aceites',n:'Aceites y Vinagres',ic:'🫙'},'ACEITUNAS':{id:'aceitunas',n:'Aceitunas',ic:'🫒'},'ENCURTIDOS':{id:'encurtidos',n:'Encurtidos',ic:'🥒'},'TOMATE TRITURADO':{id:'tomate',n:'Tomate',ic:'🍅'},'SNACK':{id:'snack',n:'Snacks',ic:'🍿'},'SUPLEMENTOS':{id:'suplementos',n:'Suplementos',ic:'💊'},'LINEA GOURMET':{id:'gourmet',n:'Línea Gourmet',ic:'⭐'},'BEBIDAS':{id:'bebidas',n:'Bebidas',ic:'🥤'},'VINOS':{id:'vinos',n:'Vinos y Licores',ic:'🍷'},'PRODUCTOS DE FRIO':{id:'frio',n:'Productos de Frío',ic:'❄️'},'PRODUCTOS CONGELADOS':{id:'congelados',n:'Congelados',ic:'🧊'},'PALADEAR HOME':{id:'home',n:'Paladear Home',ic:'🏠'}};
let CATS=[],PRODS=[],searchTerm='',activeCatId=null,miniCartTimer=null;
// Mapa de productos minoristas por productId (se construye bajo demanda).
// IMPORTANTE: declarado acá arriba —y no más abajo— porque sincronizarDesdeSheets()
// lo usa al iniciar; si se declaraba después, el render instantáneo desde cache
// tiraba un error TDZ (silenciado por try/catch) y nunca se ejecutaba.
let _MIN_BY_ID = null;

/* ── CARRITO: se guarda en localStorage para sobrevivir recargas ── */
function _saveCart(){try{localStorage.setItem('paladear_cart_v2',JSON.stringify(cart));}catch(e){}}
function _loadCart(){
  try{const s=localStorage.getItem('paladear_cart_v2');return s?JSON.parse(s):[];}catch(e){return [];}
}
function _guardarUltimoPedido(){try{if(cart && cart.length)localStorage.setItem('paladear_ultimo_pedido',JSON.stringify(cart));}catch(e){}}
function _cargarUltimoPedido(){try{const s=localStorage.getItem('paladear_ultimo_pedido');return s?JSON.parse(s):null;}catch(e){return null;}}
window._repetirUltimoPedido=function(){
  const u=_cargarUltimoPedido();
  if(!u||!u.length){return;}
  cart=u.slice();
  if(typeof updateCartCount==='function')updateCartCount();
  if(typeof renderCart==='function')renderCart();
};
let cart=_loadCart();
/* ── FAVORITOS: guardados localmente con el ID estable de cada producto ── */
const _FAVORITOS_KEY='paladear_favoritos_v1';
function _loadFavorites(){
  try{
    const a=JSON.parse(localStorage.getItem(_FAVORITOS_KEY)||'[]');
    return Array.isArray(a)?a.map(String):[];
  }catch(e){return[];}
}
let _favoritos=new Set(_loadFavorites());
function _favKey(p){
  const stable=p&&p[12]&&p[12].productId;
  return String(stable||p[0]);
}
function _isFavoriteProduct(p){return !!p&&_favoritos.has(_favKey(p));}
function _saveFavorites(){try{localStorage.setItem(_FAVORITOS_KEY,JSON.stringify(Array.from(_favoritos)));}catch(e){}}
function _syncFavoriteButtons(pid){
  const p=PRODS.find(x=>x[0]===pid);if(!p)return;
  const on=_isFavoriteProduct(p);
  document.querySelectorAll('.fav-btn[data-fav-pid="'+pid+'"]').forEach(function(btn){
    btn.classList.toggle('active',on);
    btn.setAttribute('aria-pressed',on?'true':'false');
    btn.setAttribute('aria-label',on?'Quitar de favoritos':'Agregar a favoritos');
    btn.title=on?'Quitar de favoritos':'Agregar a favoritos';
    btn.innerHTML='<span class="fav-heart" aria-hidden="true"></span>';
  });
}
window.toggleFavorite=function(pid){
  const p=PRODS.find(x=>x[0]===pid);if(!p)return;
  const key=_favKey(p);
  if(_favoritos.has(key))_favoritos.delete(key);else _favoritos.add(key);
  _saveFavorites();
  _syncFavoriteButtons(pid);
  if(document.body.classList.contains('hv-favoritos')&&typeof renderWishlistView==='function')renderWishlistView();
  return false;
};
// Reflejar el número en el badge al cargar. OJO: NO llamar updateCartCount() acá
// porque depende de _wasMay (declarada más abajo con let). Llamarla en este punto
// rompía todo el script cuando había productos guardados → pantalla de carga
// infinita. Actualizamos el badge a mano; updateCartCount() corre normal después.
try{if(cart.length){var _badge0=document.getElementById('cartCount');if(_badge0)_badge0.textContent=cart.length;}}catch(e){}
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbwpRm16QpdpCNTtRwtmoZsNPesqA3Vfli2LEubvunNiV0lFTH-rKPLNaIpsm531F3c9/exec';
function fmt(n){return n.toLocaleString('es-AR')}
let _loaderHidden=!!window.__palHomeRevealedEarly,_catalogDataReady=false;
function _removeHiddenLoader(){
  const o=document.getElementById('loadingOverlay');
  if(o&&_loaderHidden&&_catalogDataReady&&o.parentNode)o.remove();
}
function hideLoader(){
  if(_loaderHidden)return;
  _loaderHidden=true;
  const o=document.getElementById('loadingOverlay');
  if(o){o.classList.add('hidden');if(_catalogDataReady)setTimeout(_removeHiddenLoader,500);}
}
function showLoader(){
  if(_catalogDataReady)return;
  const o=document.getElementById('loadingOverlay');
  if(!o)return;
  _loaderHidden=false;
  o.style.display='flex';
  o.classList.remove('hidden');
}
function _markCatalogReady(){
  _catalogDataReady=true;
  if(_loaderHidden)setTimeout(_removeHiddenLoader,500);
}
function _palNeedsCatalogAtStart(){
  try{
    const q=new URLSearchParams(location.search);
    if(q.has('producto')||q.has('categoria'))return true;
    const raw=sessionStorage.getItem('paladear_view_state');
    if(raw){const st=JSON.parse(raw);if(st&&st.tab&&st.tab!=='home')return true;}
  }catch(e){}
  return false;
}
function _palAfterFirstPaint(fn){
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:1200});
    else setTimeout(fn,0);
  });});
}
function _palAfterLoadIdle(fn,timeout){
  function schedule(){
    if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:timeout||3500});
    else setTimeout(fn,250);
  }
  if(document.readyState==='complete')schedule();
  else window.addEventListener('load',schedule,{once:true});
}
// Timeout de seguridad: máximo 6s de espera
setTimeout(hideLoader,6000);

// ── EFECTO RIPPLE EN BOTONES ──
// Delegado global: cualquier click en uno de los selectores genera una onda
// que arranca desde el punto del click. Funciona en mouse y touch.
document.addEventListener('pointerdown',function(e){
  const btn=e.target.closest('.add-btn,.qty-btn,.opt-btn,.cat-list-btn,.cats-dd-btn,.hdrop-btn,.back-btn,.may-nav-btn,.may-promo-text,.tab-btn,.carousel-title-btn,.cart-tab,.qr-btn,.cats-mobile-catbtn,.recetas-filter-chip,.checkout-btn');
  if(!btn)return;
  const cs=getComputedStyle(btn);
  if(cs.position==='static')btn.style.position='relative';
  btn.style.overflow='hidden';
  const r=btn.getBoundingClientRect();
  const x=(e.clientX||0)-r.left, y=(e.clientY||0)-r.top;
  const size=Math.max(r.width,r.height)*2.2;
  const ink=document.createElement('span');
  ink.className='ripple-ink';
  ink.style.width=ink.style.height=size+'px';
  ink.style.left=(x-size/2)+'px';
  ink.style.top=(y-size/2)+'px';
  btn.appendChild(ink);
  setTimeout(()=>{if(ink.parentNode)ink.remove();},600);
},{passive:true});

// ── HEADER COMPACTO AL SCROLLEAR ──
// Aparece cuando scrolleas > umbral, SOLO en minorista o mayorista.
// En "Inspiración" (recetas) no aparece.
(function(){
  const THRESHOLD=180;
  let ticking=false;
  function _updateCompact(){
    const y=window.scrollY||window.pageYOffset||0;
    const tab=(typeof currentTab!=='undefined')?currentTab:'minorista';
    const searchInput=document.getElementById('compactSearchInput');
    const searchActive=!!((searchInput||{}).value)||document.activeElement===searchInput;
    const show=(y>THRESHOLD||searchActive)&&(tab==='minorista'||tab==='mayorista');
    document.body.classList.toggle('compact-on',show);
    ticking=false;
  }
  window.openHeaderSearch=function(){
    if(typeof closeAllHdrops==='function')closeAllHdrops();
    const input=document.getElementById('compactSearchInput');
    if(!input)return;
    document.body.classList.add('compact-on');
    try{input.focus({preventScroll:true});}catch(e){input.focus();}
    if(input.value)input.select();
  };
  window.compactSearchBlur=function(){
    setTimeout(_updateCompact,180);
  };
  window.addEventListener('scroll',function(){
    if(!ticking){requestAnimationFrame(_updateCompact);ticking=true;}
  },{passive:true});
  // Cuando se cambia de pestaña, re-evaluar (delay 0 para que currentTab ya esté actualizado)
  document.addEventListener('click',function(e){
    if(e.target.closest('.may-tab'))setTimeout(_updateCompact,0);
  });
  // Búsqueda del compacto: redirige al input correcto según la pestaña activa
  window.compactOnSearch=function(value){
    const tab=(typeof currentTab!=='undefined')?currentTab:'minorista';
    if(tab==='mayorista'){
      const inp=document.getElementById('searchInputMay');if(inp)inp.value=value;
      if(typeof onSearchMay==='function')onSearchMay(value);
    } else {
      const inp=document.getElementById('searchInput');if(inp)inp.value=value;
      if(typeof onSearch==='function')onSearch(value);
    }
  };
  // Hamburguesa del compacto: abre el panel de categorías de la pestaña activa
  window.compactOpenCats=function(){
    const tab=(typeof currentTab!=='undefined')?currentTab:'minorista';
    if(tab==='mayorista'){
      if(typeof toggleMayCatsDropdown==='function')toggleMayCatsDropdown();
      else window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    if(typeof toggleCatsDropdown==='function')toggleCatsDropdown();
    else window.scrollTo({top:0,behavior:'smooth'});
  };
})();

// ── (reservado) ──
(function(){
  function _noop(){}
  window._noop=_noop;
})();
function calcWeight(opc,qty){let m=opc.match(/^(\d+)g$/i);if(m){let t=parseInt(m[1])*qty;return t>=1000?(t/1000)%1===0?(t/1000)+' kg':(t/1000).toFixed(1)+' kg':t+' g'}m=opc.match(/^(\d[\d,.]*)\s*kg$/i);if(m){let v=parseFloat(m[1].replace(',','.'))*qty;return v%1===0?v+' kg':v.toFixed(1)+' kg'}return opc+(qty>1?' x'+qty:'')}
function _norm(s){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,' ').replace(/\s+/g,' ').trim()}
function _precio(s){const clean=(s||'').replace(/[^0-9,.]/g,'').replace(/\./g,'').replace(',','.');const n=parseFloat(clean);return isNaN(n)?0:Math.round(n)}
function _bultoLabel(n,unidad){const s=String(n).replace('.',',');if(unidad==='kg')return s+' Kg';return n===1?'1 Unidad':s+' Unidades';}
function _tc(s){return(s||'').toLowerCase().replace(/[^\s\-\/(]+/g,function(w){return w.charAt(0).toUpperCase()+w.slice(1);});}
const _STOPWORDS=new Set(['DE','DEL','LA','EL','LOS','LAS','UN','UNA','Y','O','CON','EN','X','POR']);
function _fuzzyMatch(q,t){const qn=_norm(q).split(' ').filter(w=>w.length>1&&!_STOPWORDS.has(w));const tn=_norm(t);if(!qn.length)return false;return qn.some(w=>tn.includes(w))}
function _levenshtein(a,b){
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i?j?0:i:j));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}
function _wordScore(qw,tw){
  // el texto ENTERO empieza con la palabra buscada (máxima prioridad)
  if(tw.startsWith(qw))return qw.length>=3?20:14;
  // alguna palabra DEL TEXTO empieza con la palabra buscada (ej "tr" en "mix tradicional")
  if(tw.split(' ').some(w=>w.startsWith(qw)))return qw.length>=3?16:11;
  // coincidencia exacta de subcadena en cualquier posición
  if(tw.includes(qw))return qw.length>=3?12:8;
  // si la palabra es muy corta no hacer fuzzy
  if(qw.length<3)return 0;
  // buscar si algún substring del texto de misma longitud es cercano
  const maxDist=qw.length<=4?1:qw.length<=7?2:3;
  for(let i=0;i<=tw.length-qw.length+maxDist;i++){
    const sub=tw.substr(i,qw.length);
    if(_levenshtein(qw,sub)<=maxDist)return 6-maxDist;
  }
  return 0;
}
function _matchScore(q,t){
  const qn=_norm(q).split(' ').filter(w=>w.length>1&&!_STOPWORDS.has(w));
  const tn=_norm(t);
  if(!qn.length)return 0;
  let score=0;
  qn.forEach(w=>{score+=_wordScore(w,tn);});
  const allMatch=qn.every(w=>_wordScore(w,tn)>0);
  if(allMatch&&qn.length>1)score+=15;
  return score;
}
function _imgZoomGoBack(){if(history.state&&history.state.modal==='imgZoom')history.back();else{const z=document.getElementById('imgZoom');if(z)z.remove();}}
function zoomImg(el){let src=el.dataset.src||'';if(!src)return;src=src.replace(/=w\d+/,'=w1200').replace(/\/w_\d+\//,'/w_1200/');const old=document.getElementById('imgZoom');if(old)old.remove();const z=document.createElement('div');z.id='imgZoom';z.onclick=e=>{if(e.target===z||e.target.tagName==='IMG')_imgZoomGoBack();};z.innerHTML=`<img src="${src}" alt="">`;document.body.appendChild(z);_palPushOverlay('imgZoom',{modal:'imgZoom'});}
window.addEventListener('popstate',function(e){const z=document.getElementById('imgZoom');if(z){z.remove();e.stopImmediatePropagation();}});

/* ── CARRUSELES ── */
let _carRotationInterval=null;
const _carState={}; // {cid:{prods:[...],cursor:0}}
var _catalogRenderMode=null;
var _catalogRenderedProds=null;
var _catalogRenderedCats=null;
var _catalogBatchObserver=null;
var _catalogBatchToken=0;
var _catalogSkipNextAllRender=false;

function _catalogStopBatches(){
  if(_catalogBatchObserver){_catalogBatchObserver.disconnect();_catalogBatchObserver=null;}
  _catalogBatchToken++;
}

function _catalogAllViewIsVisible(){
  if(_catalogSkipNextAllRender)return false;
  if(document.body.classList.contains('hv-home')||document.body.classList.contains('hv-ofertas')||document.body.classList.contains('hv-favoritos'))return false;
  // En la hidratación desde cache esta función puede correr antes de inicializar los `let`
  // de navegación que aparecen más abajo en el archivo. En ese instante no hay nada visible que renderizar.
  try{
    if(typeof currentTab!=='undefined'&&currentTab!=='minorista')return false;
    if(typeof activeCatId!=='undefined'&&activeCatId)return false;
    if(typeof searchTerm!=='undefined'&&searchTerm)return false;
  }catch(e){return false;}
  if(typeof _abriendoDesdeURL!=='undefined'&&_abriendoDesdeURL)return false;
  return true;
}

function _sortOpts(opts){
  // kg first: order by weight descending (1kg > 500g > 100g > und)
  function _optWeight(o){
    const g=_optToG(o); // misma interpretación de pesos en toda la app
    return g>0?g:-1;    // unidades al final
  }
  return [...opts].sort((a,b)=>_optWeight(b)-_optWeight(a));
}
function _cardHTML(p, xopts){
  const opts2=(xopts&&typeof xopts==='object'&&!Array.isArray(xopts))?xopts:{};
  const opts=_sortOpts(Object.keys(p[7]));
  const precio=opts.length?p[7][opts[0]][0]:0;
  const hasSrc=p[6]&&p[6].startsWith('http');
  const cat=CATS.find(c=>c.id===p[1]);
  const oferta=p[12]&&p[12].oferta?p[12].oferta:0;
  const precioOferta=oferta>0?Math.round(precio*(1-oferta/100)):precio;
  const ofertaBadge=oferta>0?`<div class="oferta-badge">−${oferta}%</div>`:'';
  const precioHTML=oferta>0
    ? `<div class="carousel-card-price"><span class="precio-tachado">$${fmt(precio)}</span> <span class="precio-oferta">$${fmt(precioOferta)}</span></div>`
    : `<div class="carousel-card-price">$${fmt(precio)}</div>`;
  const onclick=opts2.onclick||`selectCat('${p[1]}',${p[0]})`;
  return `<div class="carousel-card" onclick="${onclick}">
    ${ofertaBadge}
    <div class="carousel-card-img">${hasSrc?`<img src="${p[6]}" alt="${p[2]}" onerror="this.parentNode.innerHTML='🌿'" loading="lazy" decoding="async">`:`${cat?cat.ic:'🌿'}`}</div>
    <div class="carousel-card-body">
      <div class="carousel-card-name">${_tc(p[2])}</div>
      <div class="carousel-card-cat">${cat?cat.n:''}</div>
      ${precioHTML}
    </div>
  </div>`;
}

function renderCarruseles(){
  // limpiar rotación previa si había
  if(_carRotationInterval){clearInterval(_carRotationInterval);_carRotationInterval=null;}
  for(const k in _carState)delete _carState[k];

  if(!PRODS.length){
    document.getElementById('desktopProdsArea').innerHTML='';
    document.getElementById('mobileProdsArea').innerHTML='';
    return;
  }
  const isMobile=window.innerWidth<768;
  let htmlDesktop='',htmlMobile='';

  // Orden alfabético puro
  const catsCarousel=[...CATS].sort((a,b)=>a.n.localeCompare(b.n,'es'));

  // Encabezado solo mobile (en desktop ya hay sidebar "Categorías")
  if(catsCarousel.length) htmlMobile+=`<h2 class="cats-mobile-heading">Explorá por categoría</h2>`;

  catsCarousel.forEach((cat,i)=>{
    const prods=PRODS.filter(p=>p[1]===cat.id);
    if(!prods.length)return;
    const cid='car'+i;

    // DESKTOP: guardar todos, mostrar solo 4 (barajados)
    const shuffled=[...prods].sort(()=>Math.random()-.5);
    _carState[cid]={prods:shuffled,cursor:0};
    const visibles=shuffled.slice(0,4);
    htmlDesktop+=`<div class="carousel-section">
      <button class="carousel-title carousel-title-btn" onclick="selectCat('${cat.id}')">${cat.n} <span style="font-size:16px;opacity:.7">›</span></button>
      <div class="carousel-wrap">
        <div class="carousel-track" id="${cid}">${visibles.map(_cardHTML).join('')}</div>
      </div>
    </div>`;

    // MOBILE: todos los productos del rubro en el track scrolleable
    const cidM='carM'+i;
    htmlMobile+=`<div class="carousel-section">
      <button class="carousel-title carousel-title-btn" onclick="selectCat('${cat.id}')">${cat.n} <span style="font-size:16px;opacity:.7">›</span></button>
      <div class="carousel-wrap">
        <div class="carousel-track" id="${cidM}">${prods.map(_cardHTML).join('')}</div>
      </div>
    </div>`;
  });

  document.getElementById('desktopProdsArea').innerHTML=htmlDesktop||'<div></div>';
  document.getElementById('mobileProdsArea').innerHTML=htmlMobile||'<div></div>';
  document.getElementById('mobileProdsArea').classList.remove('hidden');

  // Auto-rotación en desktop cada 12s
  if(!isMobile){_carRotationInterval=setInterval(rotarCarruseles,12000);}
}

function rotarCarruseles(){
  // si el usuario navegó a una categoría, los carruseles ya no están
  for(const cid in _carState){
    const track=document.getElementById(cid);
    if(!track)continue;
    const st=_carState[cid];
    if(st.prods.length<=4)continue; // no rotar si hay 4 o menos
    st.cursor=(st.cursor+4)%st.prods.length;
    // tomar 4 a partir del cursor (con wrap)
    const nuevos=[];
    for(let k=0;k<4;k++)nuevos.push(st.prods[(st.cursor+k)%st.prods.length]);
    // fade out → cambiar → fade in
    track.style.transition='opacity .4s ease';
    track.style.opacity='0';
    setTimeout(()=>{
      track.innerHTML=nuevos.map(_cardHTML).join('');
      track.style.opacity='1';
    },400);
  }
}

/* ── RENDER CATEGORÍAS ── */
function _catsSidebarShouldRender(){
  if(document.body.classList.contains('hv-home')||document.body.classList.contains('hv-ofertas')||document.body.classList.contains('hv-favoritos'))return false;
  try{return typeof currentTab!=='undefined'&&currentTab==='minorista';}catch(e){return false;}
}
function renderCatsUI(opts){
  opts=opts||{};
  const sortedCats=[...CATS].sort((a,b)=>a.n.localeCompare(b.n,'es'));
  const allActive=!activeCatId&&!_activeOfertasMes;
  const renderKey=sortedCats.map(c=>c.id).join('|')+';'+(activeCatId||'all')+';'+(_activeOfertasMes?'of':'');

  // Desktop sidebar
  const sl=document.getElementById('catsSidebarList');
  if(sl&&(opts.sidebar||_catsSidebarShouldRender())&&sl.dataset.renderKey!==renderKey){
    sl.innerHTML=`<button class="cat-list-btn${allActive?' active':''}" style="background:var(--azul-dark)" onclick="volverInicio()"><div class="nm">Todos los productos</div></button>`+sortedCats.map((c,i)=>`<button class="cat-list-btn${activeCatId===c.id?' active':''}" style="background:var(--cat${i%4})" onclick="selectCat('${c.id}')"><div class="nm">${c.n}</div></button>`).join('');
    sl.dataset.renderKey=renderKey;
  }

  // El dropdown está oculto casi siempre: construir sus imágenes recién al abrirlo.
  const dg=document.getElementById('catsDropdownGrid');
  if(dg&&opts.dropdown&&dg.dataset.renderKey!==renderKey){
    dg.innerHTML=`<button class="cats-dd-btn" style="background:var(--azul-dark)" onclick="window.switchTab('minorista');volverInicio();closeCatsDropdown()"><span class="cats-dd-thumb all"><img src="icon-minorista.webp" alt="" aria-hidden="true"></span><div class="nm">Todos los productos</div></button>`+sortedCats.map((c,i)=>`<button class="cats-dd-btn" style="background:var(--cat${i%4})" onclick="hvGoCat('${c.id}');closeCatsDropdown()"><span class="cats-dd-thumb"><img src="cat-${c.id}.png" alt="" aria-hidden="true" loading="lazy" onerror="this.style.display='none'"></span><div class="nm">${c.n}</div></button>`).join('');
    dg.dataset.renderKey=renderKey;
  }
}

/* ── SELECCIONAR CATEGORÍA ── */
function selectCat(catId,productId,navOpts){
  navOpts=navOpts||{};
  var trackHistory=navOpts.history!==false&&!_palHistoryApplying;
  if(trackHistory&&!navOpts.preservePrevious)_palReplacePageState();
  // Guardar scroll del home para restaurarlo al volver
  if(!activeCatId){try{sessionStorage.setItem('paladear_home_scrollY',String(window.scrollY));}catch(e){}}
  if(_carRotationInterval){clearInterval(_carRotationInterval);_carRotationInterval=null;}
  activeCatId=catId;
  renderCatsUI();
  _saveAppState();
  const cat=CATS.find(c=>c.id===catId);
  const prods=PRODS.filter(p=>p[1]===catId);
  const isMobile=window.innerWidth<768;
  const prefix=isMobile?'mb':'dt';
  const html=renderProdsHTML(cat,prods,prefix,productId);
  const area=isMobile?document.getElementById('mobileProdsArea'):document.getElementById('desktopProdsArea');
  if(isMobile)area.classList.remove('hidden');
  area.innerHTML=html;
  area.dataset.catalogView='category';
  if(trackHistory)_palPushPageState({view:'cat',tab:'minorista',catId:catId,productId:productId||null});
  if(productId!=null){
    setTimeout(()=>{
      const card=document.getElementById(prefix+'_'+productId);
      if(card){
        card.scrollIntoView({behavior:'smooth',block:'center'});
        card.classList.add('highlight-card');
        setTimeout(()=>card.classList.remove('highlight-card'),2200);
      }else{
        area.scrollIntoView({behavior:'smooth',block:'start'});
      }
    },60);
  }else{
    area.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

let _activeOfertasMes=false;


function volverInicio(){
  _activeOfertasMes=false;
  activeCatId=null;
  renderCatsUI();
  renderCarruseles();
  if(typeof _bnavSet==='function')_bnavSet('minorista');
  const area=window.innerWidth<768?document.getElementById('mobileProdsArea'):document.getElementById('desktopProdsArea');
  if(area)setTimeout(()=>area.scrollIntoView({behavior:'smooth',block:'start'}),40);
}

function renderProdsHTML(cat,prods,prefix,priorityProductId){
  let h='<button class="back-btn" onclick="volverInicio()">← Volver a todos los productos</button>';
  h+=`<h2 style="font-size:22px;color:var(--azul-dark);margin-bottom:16px;font-weight:700">${cat.n}</h2>`;
  if(!prods.length)return h+'<div style="text-align:center;padding:48px 0;color:var(--muted-fg);font-size:17px">No se encontraron productos 🔍</div>';
  h+='<div class="prod-grid">';
  prods.forEach((p,i)=>{h+=renderCard(p,prefix,i<4||p[0]===priorityProductId)});
  h+='</div>';
  return h;
}

const TRASH_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
const EDIT_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const ADD_CART_ICON='<span class="add-cart-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l2.4 10.3a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6"/><circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none"/></svg></span>';
function _acumLabel(p){
  const cartAcum=cart.filter(i=>i.pid===p[0]);
  if(!cartAcum.length)return'';
  if(p[4]==='kg'){
    // nuevo modelo: item unificado con totalG
    const totalG=cartAcum.reduce((a,i)=>a+(i.totalG||0),0);
    return _gLabel(totalG);
  } else {
    return cartAcum.reduce((a,i)=>a+(i.c||0),0)+' und';
  }
}
function _priceMinContent(precio,oferta){
  if(!oferta)return '$'+fmt(precio);
  const rebajado=Math.round(precio*(1-oferta/100));
  return `<span class="precio-tachado-sm">$${fmt(precio)}</span><span class="precio-oferta">$${fmt(rebajado)}</span>`;
}
function renderCard(p,prefix,prioritizeImage){
  const opts=_sortOpts(Object.keys(p[7]));if(!opts.length)return'';
  const id=prefix+'_'+p[0];
  const hasSrc=p[6]&&p[6].startsWith('http');
  const infoText=p[8]||'';
  const sabores=p[9]||null;
  const acumLbl=_acumLabel(p);
  const oferta=p[12]&&p[12].oferta?p[12].oferta:0;
  const favOn=_isFavoriteProduct(p);
  let h=`<div class="pcard" id="${id}" data-pid="${p[0]}">`;
  h+=`<button type="button" class="fav-btn${favOn?' active':''}" data-fav-pid="${p[0]}" onclick="return toggleFavorite(${p[0]})" aria-label="${favOn?'Quitar de favoritos':'Agregar a favoritos'}" aria-pressed="${favOn?'true':'false'}" title="${favOn?'Quitar de favoritos':'Agregar a favoritos'}"><span class="fav-heart" aria-hidden="true"></span></button>`;
  if(oferta>0)h+=`<div class="oferta-badge oferta-badge-lg">−${oferta}% OFF</div>`;
  const imgLoading=prioritizeImage?'loading="eager" fetchpriority="high"':'loading="lazy"';
  h+=`<div class="pcard-img" onclick="zoomImg(this)" data-src="${hasSrc?p[6]:''}">${hasSrc?`<img src="${p[6]}" alt="${p[2]}" onerror="this.parentNode.innerHTML='🌿'" ${imgLoading} decoding="async">`:`🌿`}</div>`;
  h+=`<div class="pcard-body">`;
  h+=`<div class="pcard-head"><div class="pcard-name">${_tc(p[2])}</div>`;
  if(infoText)h+=`<button class="info-btn" onclick="showInfo(${p[0]})" title="Ver información">ℹ️</button>`;
  h+=`</div>`;
  if(p[3]&&p[3]!=='Varios'&&p[3]!=='Granel')h+=`<div class="pcard-brand">${p[3]}</div>`;
  h+='<div class="opt-btns">';
  opts.forEach((o,i)=>{h+=`<button class="opt-btn${i===0?' active':''}" onclick="selOpt('${id}','${o.replace(/'/g,"\\'")}',${p[7][o][0]},${p[7][o][1]})">${o}</button>`});
  h+='</div>';
  if(sabores&&sabores.length){
    h+=`<div class="sabor-row"><label class="sabor-label" for="${id}_sab">Sabor:</label><select class="sabor-select" id="${id}_sab" onchange="selSabor('${id}',this.value)">`;
    sabores.forEach(s=>{h+=`<option value="${s.replace(/"/g,'&quot;')}">${s}</option>`});
    h+='</select></div>';
  }
  const precioMin=p[7][opts[0]][0];
  const minHTML=`<div class="price-min">${_priceMinContent(precioMin,oferta)}</div>`;
  h+=`<div class="prices"><div><span class="price-label">Precio${oferta>0?' (Oferta)':''}</span>${minHTML}</div><div><span class="price-label">Con descuento</span><div class="price-may">$${fmt(p[7][opts[0]][1])}</div></div></div>`;
  const aplicaVolumen=cart.reduce((a,it)=>a+_itemMin(it),0)>=80000;
  const acumSub=acumLbl?cart.filter(i=>i.pid===p[0]).reduce((a,it)=>a+(aplicaVolumen?_itemMay(it):_itemMinConOferta(it)),0):0;
  const acumInfo=acumLbl?`<span class="acum-badge">🛒 ${acumLbl} · $${fmt(acumSub)}</span>`:'';
  h+=`<div class="qty-row"><button class="qty-btn" onclick="chgQty('${id}',-1)">−</button><span class="qty-val" id="${id}_q">1</span><button class="qty-btn" onclick="chgQty('${id}',1)">+</button>${acumInfo}</div>`;
  h+=`<button class="add-btn" id="${id}_ab" onclick="addToCart(${p[0]},'${id}')">${ADD_CART_ICON} Agregar al pedido</button>`;
  // Trash + edit buttons — only shown when item is in cart
  const cartItem=cart.find(i=>i.pid===p[0]);
  if(cartItem){
    h+=`<div class="card-cart-actions">
      <button class="card-del-btn" onclick="cardDelProduct(${p[0]})" title="Quitar del carrito">${TRASH_SVG}</button>
      <button class="card-edit-btn" onclick="openCart()" title="Editar en carrito">${EDIT_SVG} Ver en carrito</button>
    </div>`;
  }
  h+=`</div></div>`;
  return h;
}

function cardDelProduct(pid){
  cart=cart.filter(i=>i.pid!==pid);
  updateCartCount();
  _reRenderCard(pid);
}
function selOpt(id,opt,p1,p2){
  const el=document.getElementById(id);if(!el)return;
  el.querySelectorAll('.opt-btn').forEach(b=>b.classList.toggle('active',b.textContent===opt));
  const pid=parseInt(el.dataset.pid,10);
  const p=PRODS.find(x=>x[0]===pid);
  const oferta=p&&p[12]&&p[12].oferta?p[12].oferta:0;
  el.querySelector('.price-min').innerHTML=_priceMinContent(p1,oferta);
  el.querySelector('.price-may').textContent='$'+fmt(p2);
  el.dataset.opt=opt;
}
function selSabor(id,sab){const el=document.getElementById(id);el.dataset.sabor=sab}
function chgQty(id,d){const el=document.getElementById(id+'_q');let v=parseInt(el.textContent)+d;if(v<1)v=1;el.textContent=v}

function showInfo(pid){
  const p=PRODS.find(x=>x[0]===pid);if(!p||!p[8])return;
  const old=document.getElementById('infoModal');if(old)old.remove();
  const m=document.createElement('div');
  m.id='infoModal';
  m.className='info-modal';
  m.onclick=e=>{if(e.target===m)m.remove()};
  const hasSrc=p[6]&&p[6].startsWith('http');
  m.innerHTML=`<div class="info-modal-box">
    <button class="info-modal-close" onclick="document.getElementById('infoModal').remove()">×</button>
    ${hasSrc?`<div class="info-modal-img"><img src="${p[6]}" alt="${p[2]}"></div>`:''}
    <h3 class="info-modal-title">${_tc(p[2])}</h3>
    <div class="info-modal-text">${p[8].replace(/\n/g,'<br>')}</div>
  </div>`;
  document.body.appendChild(m);
  _palPushOverlay('info');
}

// Convierte una opción (ej "500g","1 kg","250g") a gramos
function _optToG(opt){
  // Acepta variantes de cómo se escribe el kilo en la planilla: "1KG", "1 KG", "1K", "1 KILO".
  // (ROOIBOS venía cargado como "1K" y no se reconocía como kilo → precio mal calculado.)
  const mkg=opt.match(/^(\d[\d,.]*)\s*(?:kgs?|kilos?|k)$/i);if(mkg)return parseFloat(mkg[1].replace(',','.'))*1000;
  const mg=opt.match(/^(\d+)\s*(?:grs?|gr|g)$/i);if(mg)return parseInt(mg[1]);
  return 0; // unidades: no es kg
}
// Precio POR KILO de un producto a granel (li: 0 = lista 1, 1 = lista 2).
// Si no hay una opción de 1 kg, escala la más grande disponible (ej. 250G × 4).
// Los armadores de mix/granola/blend antes tomaban el precio de la opción tal cual, sin
// escalar: si el producto no tenía una opción llamada exactamente "1KG", terminaban
// cobrando el precio de 50g o 250g como si fuera el del kilo.
function _precioKg(p,li){
  li=li||0;
  const opts=_sortOpts(Object.keys(p[7]));
  if(!opts.length)return 0;
  const refOpt=opts.find(o=>_optToG(o)===1000)||opts[0];
  const refG=_optToG(refOpt);
  const base=p[7][refOpt][li];
  return refG>0?Math.round(base*(1000/refG)):base;
}
// Dado un item unificado (gramos totales), elige el precio unitario x kg más apropiado
function _precioXG(p,totalG,nivel){
  // nivel: 0=minorista 1=mayorista
  const opts=_sortOpts(Object.keys(p[7])); // ordenado de mayor a menor
  // buscar la opción de 1 kg como referencia base
  const ref=opts.find(o=>_optToG(o)===1000)||opts[0];
  const precioKg=p[7][ref][nivel]; // precio por kg
  return precioKg; // devuelve precio por kg; el total = precioKg * totalG/1000
}
function _reRenderCard(pid){
  const p=PRODS.find(x=>x[0]===pid);if(!p)return;
  ['mb','dt','rp','of','fav'].forEach(function(prefix){
    const cardEl=document.getElementById(prefix+'_'+pid);
    if(!cardEl)return;
    const tmp=document.createElement('div');
    tmp.innerHTML=renderCard(p,prefix,true);
    cardEl.parentNode.replaceChild(tmp.firstChild,cardEl);
    // Restaurar el opt seleccionado
    const opts=_sortOpts(Object.keys(p[7]));
    if(opts.length)selOpt(prefix+'_'+pid,opts[0],p[7][opts[0]][0],p[7][opts[0]][1]);
  });
}

function addToCart(pid,elId){
  const p=PRODS.find(x=>x[0]===pid);if(!p)return;
  const el=document.getElementById(elId);if(!el)return;
  const opts=_sortOpts(Object.keys(p[7]));
  const opt=el.dataset.opt||opts[0];
  const sabores=p[9];
  const sabSelect=document.getElementById(elId+'_sab');
  const sabor=sabSelect?sabSelect.value:(sabores&&sabores.length?sabores[0]:'');
  const qty=parseInt(document.getElementById(elId+'_q').textContent)||1;
  const nombreConSabor=sabor?p[2]+' ('+sabor+')':p[2];

  if(p[4]==='kg'){
    const addedG=_optToG(opt)*qty;
    const key=pid+(sabor?'-'+sabor:'');
    const ex=cart.find(i=>i.key===key);
    // Calcular precio POR KG para guardar en l1/l2 (para que _itemMin sea correcto)
    const refOpt=opts.find(o=>_optToG(o)===1000)||opts[0];
    const refG=_optToG(refOpt);
    const l1kg=refG>0?Math.round(p[7][refOpt][0]*(1000/refG)):p[7][refOpt][0];
    const l2kg=refG>0?Math.round(p[7][refOpt][1]*(1000/refG)):p[7][refOpt][1];
    if(ex){ex.totalG=(ex.totalG||0)+addedG;}
    else cart.push({key,pid,n:nombreConSabor,o:refOpt,totalG:addedG,unidad:'kg',sabor,l1:l1kg,l2:l2kg});
    const it=cart.find(i=>i.key===key);
    it.l1=l1kg;it.l2=l2kg;
  } else {
    const key=pid+'-'+opt+(sabor?'-'+sabor:'');
    const ex=cart.find(i=>i.key===key);
    if(ex)ex.c+=qty;else cart.push({key,pid,n:nombreConSabor,o:opt,c:qty,l1:p[7][opt][0],l2:p[7][opt][1],unidad:'und',sabor});
  }

  // Resetear qty a 1 en la card después de agregar
  const qEl=document.getElementById(elId+'_q');
  if(qEl)qEl.textContent='1';

  // ── FLY-TO-CART ANIMATION ──
  {const cardEl=document.getElementById(elId);if(cardEl)_flyToCart(cardEl.querySelector('.pcard-img img, .pcard-img'));}

  updateCartCount();

  // re-render card immediately to show badge + action buttons
  _reRenderCard(pid);

  // flash the new button briefly
  setTimeout(function(){
    const newBtn=document.getElementById(elId+'_ab');
    if(newBtn){
      newBtn.classList.add('added');
      newBtn.innerHTML='✓ Agregado!';
      setTimeout(function(){newBtn.classList.remove('added');newBtn.innerHTML=ADD_CART_ICON+' Agregar al pedido';},1400);
    }
  },20);
}

// Animación de vuelo de la imagen hacia el carrito (compartida por las cards y los box del Mundial)
function _flyToCart(imgEl){
  const fab=document.getElementById('cart-fab');
  if(!imgEl||!fab)return;
  const srcRect=imgEl.getBoundingClientRect();
  const destRect=fab.getBoundingClientRect();
  const fly=document.createElement('div');
  fly.className='fly-img';
  if(imgEl.tagName==='IMG'&&imgEl.src){
    const inner=document.createElement('img');
    inner.src=imgEl.src;
    inner.style.cssText='width:100%;height:100%;object-fit:contain;border-radius:50%';
    fly.appendChild(inner);
  } else {
    fly.textContent='🛒';
    fly.style.fontSize='28px';
    fly.style.display='flex';
    fly.style.alignItems='center';
    fly.style.justifyContent='center';
  }
  const startX=srcRect.left+srcRect.width/2-30;
  const startY=srcRect.top+srcRect.height/2-30;
  const endX=destRect.left+destRect.width/2-30;
  const endY=destRect.top+destRect.height/2-30;
  fly.style.cssText+=`;left:${startX}px;top:${startY}px;`;
  document.body.appendChild(fly);
  const dur=650;const start=performance.now();
  function step(now){
    const t=Math.min((now-start)/dur,1);
    const ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    const mx=(startX+endX)/2;
    const my=Math.min(startY,endY)-80;
    const x=(1-ease)*(1-ease)*startX+2*(1-ease)*ease*mx+ease*ease*endX;
    const y=(1-ease)*(1-ease)*startY+2*(1-ease)*ease*my+ease*ease*endY;
    const sc=1-ease*0.75;
    fly.style.left=x+'px';
    fly.style.top=y+'px';
    fly.style.transform=`scale(${sc})`;
    fly.style.opacity=t>0.75?(1-(t-0.75)/0.25)+'':1;
    if(t<1){requestAnimationFrame(step);}
    else{fly.remove();fab.style.transform='scale(1.3)';setTimeout(()=>{fab.style.transform='';},200);}
  }
  requestAnimationFrame(step);
}

function showMiniCart(lastKey){}
function closeMiniCart(){}
function miniQty(key,d){
  const it=cart.find(i=>i.key===key);if(!it)return;
  if(it.unidad==='kg'){it.totalG=Math.max(250,(it.totalG||0)+d*250);}
  else{it.c=Math.max(1,(it.c||1)+d);}
  updateCartCount();showMiniCart(key);
}
function miniDel(key){cart=cart.filter(i=>i.key!==key);updateCartCount();}
let _wasMay=false;
function updateCartCount(){
  document.getElementById('cartCount').textContent=cart.length;
  const totalMin=cart.reduce((a,i)=>a+_itemMin(i),0);
  const isMay=totalMin>=80000;
  if(isMay&&!_wasMay)_triggerMayoristaConfetti();
  _wasMay=isMay;
  _saveCart();
  _pintarDescBanner();
}

/* Banner "Descuento por cantidad": arranca en $0 y sube con lo que hay en el carrito.
   Antes hacía una animación de muestra de 0 a $80.000 al aparecer en pantalla. */
function _pintarDescBanner(){
  const cnt=document.getElementById('descbCnt'), fill=document.getElementById('descbFill'),
        rw=document.getElementById('descbRw'), goal=document.getElementById('descbGoal');
  if(!cnt||!fill||!rw||!goal)return;
  const totalMin=cart.reduce((a,i)=>a+_itemMin(i),0);
  const esMay=totalMin>=80000;
  fill.style.width=Math.min(100,(totalMin/80000)*100)+'%';
  if(esMay){
    // Ya superó la meta: mostrar el total sin descuento al lado de "Meta: $80.000" se leía
    // como un error. Se muestra lo que realmente se cobra y cuánto ahorra.
    const totalMay=cart.reduce((a,i)=>a+_itemMay(i),0);
    cnt.textContent='$'+fmt(totalMay);
    goal.textContent='✓ Descuento aplicado';
    goal.style.color='#1c9d63';
    rw.textContent='¡Descuento por cantidad activado! Ahorrás $'+fmt(totalMin-totalMay);
    rw.style.color='';
    rw.classList.add('on');
  }else{
    cnt.textContent='$'+fmt(totalMin);
    goal.textContent='Meta: $80.000';
    goal.style.color='';
    if(cart.length){
      rw.textContent='Te faltan $'+fmt(80000-totalMin)+' para el descuento';
      rw.style.color='#54677d';
      rw.classList.add('on');
    }else{
      rw.classList.remove('on');   // carrito vacío: sin mensaje
    }
  }
}
window._pintarDescBanner=_pintarDescBanner;
/* Al abrir la página hay que pintarlo aparte: updateCartCount() NO corre al cargar
   (ver la nota de más arriba sobre _wasMay y la pantalla de carga infinita).
   Va con try/catch para que, pase lo que pase, nunca frene el resto del script. */
(function(){
  function _pintarAlInicio(){ try{ _pintarDescBanner(); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_pintarAlInicio);
  else _pintarAlInicio();
})();

function openCart(){
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartPanel').classList.add('open');
  document.body.classList.add('cart-open');
  document.body.style.overflow='hidden';
  closeMiniCart();
  renderCart();
  _palPushOverlay('cart');
}
function closeCart(){
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartPanel').classList.remove('open');
  document.body.classList.remove('cart-open');
  document.body.style.overflow='';
}

/* ═══════════ MI CUENTA (perfil + direcciones + historial de pedidos, todo local) ═══════════ */
var _PALADEAR_PEDIDOS_KEY='paladear_pedidos_v1';
function _ctaEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function _cuentaCargarPedidos(){try{var a=JSON.parse(localStorage.getItem(_PALADEAR_PEDIDOS_KEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function _cuentaGuardarPedidos(a){try{localStorage.setItem(_PALADEAR_PEDIDOS_KEY,JSON.stringify(a));}catch(e){}}
// Direcciones como OBJETOS {dir, piso, tipo, entre, indic, lat, lng}. Migra formatos viejos
// (strings; la 1ª hereda los detalles sueltos que antes vivían en el perfil).
function _cuentaDirecciones(p){
  p=p||_coCargarPerfil();
  var raw=Array.isArray(p.direcciones)?p.direcciones.filter(Boolean):(p.direccion?[p.direccion]:[]);
  return raw.map(function(d,i){
    if(typeof d==='string'){
      var o={dir:d};
      if(i===0){if(p.pisoDepto)o.piso=p.pisoDepto;if(p.tipoViv)o.tipo=p.tipoViv;if(p.entreCalles)o.entre=p.entreCalles;if(p.indicaciones)o.indic=p.indicaciones;}
      return o;
    }
    return (d&&d.dir)?d:null;
  }).filter(Boolean);
}
// Guarda un pedido en el historial (lo llama el checkout al enviar). snap = copia del carrito con subtotal efectivo.
function _cuentaGuardarPedido(cartArr,esMay,total,direccion){
  try{
    var snap=(cartArr||[]).map(function(it){var o=JSON.parse(JSON.stringify(it));o._sub=esMay?_itemMay(it):_itemMinConOferta(it);return o;});
    if(!snap.length)return;
    var hist=_cuentaCargarPedidos();
    var n=(parseInt(localStorage.getItem('paladear_pedido_n')||'0',10)||0)+1;
    localStorage.setItem('paladear_pedido_n',String(n));
    var d=new Date();
    var fecha=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
    hist.unshift({n:n,fecha:fecha,total:total,count:snap.length,direccion:direccion||'',cart:snap});
    if(hist.length>50)hist=hist.slice(0,50);
    _cuentaGuardarPedidos(hist);
  }catch(e){}
}
window._cuentaGuardarPedido=_cuentaGuardarPedido;
function openCuenta(){
  document.getElementById('cuentaOverlay').classList.add('open');
  document.getElementById('cuentaPanel').classList.add('open');
  document.body.style.overflow='hidden';
  renderCuenta();
  _palPushOverlay('cuenta');
}
window.openCuenta=openCuenta;
function closeCuenta(){
  document.getElementById('cuentaOverlay').classList.remove('open');
  document.getElementById('cuentaPanel').classList.remove('open');
  document.body.style.overflow='';
}
window.closeCuenta=closeCuenta;
function renderCuenta(){
  var p=_coCargarPerfil();
  var nombre=(p.nombre||'').trim();
  var dirs=_cuentaDirecciones(p);
  var tienePerfil=!!(nombre||dirs.length);
  var pinSvg='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  var editSvg='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  var personSvg='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.2-5.6 7-5.6s7 2 7 5.6"/></svg>';
  var inicial=nombre?nombre.charAt(0).toUpperCase():'';
  var h='<div class="cta-perfil"><div class="cta-perfil-row">';
  h+='<div class="cta-mono">'+(inicial?_ctaEsc(inicial):personSvg)+'</div>';
  h+='<div class="cta-perfil-info"><div class="cta-hola">'+(nombre?('Hola, '+_ctaEsc(nombre)):'Tu cuenta')+'</div>';
  h+='<div class="cta-perfil-sub">'+(tienePerfil?'Tus datos quedan guardados en este dispositivo':'Guardá tus datos y pedí más rápido')+'</div></div>';
  if(tienePerfil)h+='<button class="cta-edit-ic" onclick="_cuentaAbrirForm()" title="Editar mis datos" aria-label="Editar mis datos">'+editSvg+'</button>';
  h+='</div>';
  if(dirs.length)h+='<div class="cta-dirs-view">'+dirs.map(function(d){return '<div class="cta-dir-chip">'+pinSvg+'<span>'+_ctaEsc(d.dir)+'</span></div>';}).join('')+'</div>';
  if(!tienePerfil)h+='<button class="cta-completar" onclick="_cuentaAbrirForm()">Completar mis datos</button>';
  h+='</div>';
  h+=_cuentaFormHTML(p,dirs);
  var boxSvg='<img src="icon-minorista.webp" alt="" loading="lazy">';
  var chevSvg='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
  var ped=_cuentaCargarPedidos();
  h+='<div class="cta-sec"><h3 class="cta-sec-title">Mis pedidos</h3>';
  if(!ped.length){
    h+='<div class="cta-vacio"><img src="icon-minorista.webp" alt="" loading="lazy" style="width:34px;height:34px;object-fit:contain;display:block;margin:0 auto 10px;opacity:.55">Todavía no hiciste pedidos.<br>Cuando envíes uno por WhatsApp, va a quedar guardado acá.</div>';
  }else{
    h+='<div class="cta-pedidos">';
    ped.forEach(function(pe,i){
      h+='<button class="cta-pedido" onclick="_cuentaAbrirPedido('+i+')">'
        +'<div class="cta-pedido-ic">'+boxSvg+'</div>'
        +'<div class="cta-pedido-mid"><b>Pedido #'+pe.n+'</b><span class="cta-pedido-meta">'+pe.count+' '+(pe.count===1?'producto':'productos')+' · '+_ctaEsc(pe.fecha)+'</span></div>'
        +'<div class="cta-pedido-right"><span class="cta-pedido-total">$'+fmt(pe.total)+'</span>'+chevSvg+'</div>'
        +'</button>';
    });
    h+='</div>';
  }
  h+='</div>';
  document.getElementById('cuentaBody').innerHTML=h;
}
// Misma estructura y mismos campos obligatorios (Calle/Número/Localidad/Provincia) que usa
// el checkout, para que una dirección cargada acá quede igual de completa que una cargada
// al hacer un pedido.
function _cuentaDirRowHTML(d,i){
  d=d||{};
  var tipoCasa=d.tipo==='casa'?' checked':'';
  var tipoDepto=d.tipo==='depto'?' checked':'';
  return '<div class="cta-dir-row" data-oi="'+i+'">'
    +'<div class="cta-dir-row-head"><span class="cta-dir-row-title">Dirección '+(i+1)+'</span><button type="button" class="cta-dir-del" onclick="_cuentaDelDir(this)" aria-label="Quitar dirección">✕</button></div>'
    +'<div class="co-field-row">'
      +'<div class="co-field" style="flex:2;margin-bottom:0"><label>Calle <span style="color:#e53935">*</span></label><input type="text" class="co-input cta-calle" placeholder="Ej: San Martín" autocomplete="address-line1" value="'+_ctaEsc(d.calle||'')+'"></div>'
      +'<div class="co-field" style="flex:1;margin-bottom:0"><label>Número <span style="color:#e53935">*</span></label><input type="text" class="co-input cta-numero" placeholder="Ej: 1234" inputmode="numeric" value="'+_ctaEsc(d.num||'')+'"></div>'
    +'</div>'
    +'<div class="co-field-row" style="margin-top:10px">'
      +'<div class="co-field" style="flex:1.3;margin-bottom:0"><label>Localidad <span style="color:#e53935">*</span></label><input type="text" class="co-input cta-localidad" placeholder="Ej: Godoy Cruz" autocomplete="address-level2" value="'+_ctaEsc(d.loc||'')+'"></div>'
      +'<div class="co-field" style="flex:1;margin-bottom:0"><label>Provincia <span style="color:#e53935">*</span></label><input type="text" class="co-input cta-provincia" autocomplete="address-level1" value="'+_ctaEsc(d.prov||'Mendoza')+'"></div>'
    +'</div>'
    +'<div class="co-field-row" style="margin-top:10px">'
      +'<div class="co-field" style="flex:1;margin-bottom:0"><label>Piso / Depto <span class="opt-lbl">(opcional)</span></label><input type="text" class="co-input cta-piso" placeholder="Ej: 3°B" value="'+_ctaEsc(d.piso||'')+'"></div>'
      +'<div class="co-field" style="flex:1.4;margin-bottom:0"><label>Tipo <span class="opt-lbl">(opcional)</span></label><div class="co-tipo-opts"><label class="co-tipo-radio"><input type="radio" name="ctaTipo_'+i+'" value="casa"'+tipoCasa+'><span>🏠 Casa</span></label><label class="co-tipo-radio"><input type="radio" name="ctaTipo_'+i+'" value="depto"'+tipoDepto+'><span>🏢 Depto</span></label></div></div>'
    +'</div>'
    +'<div class="co-field" style="margin-top:10px;margin-bottom:0"><label>Entre calles <span class="opt-lbl">(opcional)</span></label><input type="text" class="co-input cta-entre" placeholder="Ej: entre Belgrano y San Martín" value="'+_ctaEsc(d.entre||'')+'"></div>'
    +'<div class="co-field" style="margin-top:10px;margin-bottom:0"><label>Indicaciones para llegar <span class="opt-lbl">(opcional)</span></label><textarea class="co-input cta-indic" placeholder="Ej: casa rosada, tocar timbre 2 veces" rows="2">'+_ctaEsc(d.indic||'')+'</textarea></div>'
    +'</div>';
}
function _cuentaFormHTML(p,dirs){
  var list=(dirs&&dirs.length)?dirs:[{}];
  var rows=list.map(function(d,i){return _cuentaDirRowHTML(d,i);}).join('');
  return '<form class="cta-form" id="cuentaForm" hidden onsubmit="return _cuentaGuardarForm(event)">'
    +'<div class="cta-field"><label class="cta-label">Nombre</label><input type="text" id="ctaNombre" class="cta-input" placeholder="Tu nombre" value="'+_ctaEsc(p.nombre||'')+'"></div>'
    +'<label class="cta-label">Direcciones</label><div id="ctaDirs">'+rows+'</div>'
    +'<button type="button" class="cta-add-dir" onclick="_cuentaAddDir()">+ Agregar otra dirección</button>'
    +'<div class="cta-form-actions"><button type="button" class="cta-btn-sec" onclick="_cuentaCerrarForm()">Cancelar</button><button type="submit" class="cta-btn-pri">Guardar</button></div>'
    +'</form>';
}
function _cuentaAbrirForm(){var f=document.getElementById('cuentaForm');if(f){f.hidden=false;var n=document.getElementById('ctaNombre');if(n)n.focus();}}
window._cuentaAbrirForm=_cuentaAbrirForm;
function _cuentaCerrarForm(){var f=document.getElementById('cuentaForm');if(f)f.hidden=true;}
window._cuentaCerrarForm=_cuentaCerrarForm;
function _cuentaAddDir(){
  var w=document.getElementById('ctaDirs');if(!w)return;
  var i=w.querySelectorAll('.cta-dir-row').length;
  var tmp=document.createElement('div');
  tmp.innerHTML=_cuentaDirRowHTML({},i);
  var d=tmp.firstElementChild;
  d.setAttribute('data-oi','-1');
  w.appendChild(d);
  var first=d.querySelector('.cta-calle');if(first)first.focus();
}
window._cuentaAddDir=_cuentaAddDir;
function _cuentaDelDir(btn){
  var w=document.getElementById('ctaDirs');var row=btn.closest('.cta-dir-row');if(row)row.remove();
  if(w){
    // Renumerar los títulos "Dirección N" tras borrar una
    w.querySelectorAll('.cta-dir-row').forEach(function(r,i){var t=r.querySelector('.cta-dir-row-title');if(t)t.textContent='Dirección '+(i+1);});
    if(!w.querySelector('.cta-dir-row'))_cuentaAddDir();
  }
}
window._cuentaDelDir=_cuentaDelDir;
// Mismo highlight de "campo obligatorio" que usa el checkout (_coMarkRequired), pero tomando
// el elemento directo en vez de un id (acá hay varias direcciones, no ids únicos por campo).
function _ctaMarkRequired(el){
  if(!el)return;
  el.style.borderColor='#e53935';
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.focus();
  el.addEventListener('input',function(){el.style.borderColor='';},{once:true});
}
function _cuentaGuardarForm(e){
  e.preventDefault();
  var p=_coCargarPerfil();
  var n=document.getElementById('ctaNombre');
  p.nombre=(n?n.value:'').trim();
  // Reconstruir el array preservando los detalles de cada dirección original (data-oi)
  var orig=_cuentaDirecciones(p);
  var rows=[].slice.call(document.querySelectorAll('#ctaDirs .cta-dir-row'));
  var dirs=[];
  for(var idx=0;idx<rows.length;idx++){
    var row=rows[idx];
    var calleEl=row.querySelector('.cta-calle'),numEl=row.querySelector('.cta-numero'),
        locEl=row.querySelector('.cta-localidad'),provEl=row.querySelector('.cta-provincia'),
        pisoEl=row.querySelector('.cta-piso'),entreEl=row.querySelector('.cta-entre'),indicEl=row.querySelector('.cta-indic');
    var tipoEl=row.querySelector('input[type="radio"]:checked');
    var calle=(calleEl.value||'').trim(),num=(numEl.value||'').trim(),loc=(locEl.value||'').trim(),prov=(provEl.value||'').trim();
    var piso=(pisoEl.value||'').trim(),entre=(entreEl.value||'').trim(),indic=(indicEl.value||'').trim();
    var tipo=tipoEl?tipoEl.value:'';
    // Fila sin usar (nunca tocada): calle/num/loc/piso/entre/indic/tipo vacíos y Provincia
    // en el valor por defecto "Mendoza" — se ignora en vez de forzar a completarla.
    var tocada=calle||num||loc||piso||entre||indic||tipo||(prov&&_norm(prov)!=='MENDOZA');
    if(!tocada)continue;
    if(!calle){_ctaMarkRequired(calleEl);return false;}
    if(!num){_ctaMarkRequired(numEl);return false;}
    if(!loc){_ctaMarkRequired(locEl);return false;}
    if(!prov){_ctaMarkRequired(provEl);return false;}
    var oi=parseInt(row.getAttribute('data-oi'),10);
    var base=(oi>=0&&orig[oi])?orig[oi]:{};
    var o={};for(var k in base)o[k]=base[k];
    o.dir=calle+' '+num+', '+loc+', '+prov;
    o.calle=calle;o.num=num;o.loc=loc;o.prov=prov;
    o.piso=piso;o.tipo=tipo;o.entre=entre;o.indic=indic;
    dirs.push(o);
  }
  p.direcciones=dirs;
  if(dirs.length)p.direccion=dirs[0].dir;else delete p.direccion;
  _coGuardarPerfil(p);
  _cuentaCerrarForm();
  renderCuenta();
  return false;
}
window._cuentaGuardarForm=_cuentaGuardarForm;
var _cuentaPedidoActual=null;
function _cuentaAbrirPedido(i){
  var ped=_cuentaCargarPedidos();var pe=ped[i];if(!pe)return;
  _cuentaPedidoActual=pe;
  var h='<div class="cpm-fecha">'+_ctaEsc(pe.fecha)+'</div>';
  (pe.cart||[]).forEach(function(it){
    var sub=(it._sub!=null)?it._sub:_itemMin(it);
    var q=it.unidad==='und'?(it.c+'×'):_gLabel(it.totalG).replace(/ g$/,' gr');
    h+='<div class="cpm-item"><div class="cpm-item-name">'+_tc(it.n)+'</div><div class="cpm-item-q">'+q+'</div><div class="cpm-item-sub">$'+fmt(sub)+'</div></div>';
  });
  h+='<div class="cpm-total"><span>Total</span><b>$'+fmt(pe.total)+'</b></div>';
  if(pe.direccion)h+='<div class="cpm-dir"><b>Enviado a:</b> '+_ctaEsc(pe.direccion)+'</div>';
  document.getElementById('cuentaPedidoTitle').textContent='Pedido #'+pe.n;
  document.getElementById('cuentaPedidoBody').innerHTML=h;
  var rb=document.getElementById('cuentaReorderBtn');if(rb)rb.disabled=!(pe.cart&&pe.cart.length);
  document.getElementById('cuentaPedidoModal').classList.add('open');
  _palPushOverlay('cuentaPedido');
}
window._cuentaAbrirPedido=_cuentaAbrirPedido;
function _cuentaCerrarPedido(){document.getElementById('cuentaPedidoModal').classList.remove('open');}
window._cuentaCerrarPedido=_cuentaCerrarPedido;
function _cuentaVolverAPedir(){
  var pe=_cuentaPedidoActual;if(!pe||!pe.cart||!pe.cart.length)return;
  cart=pe.cart.map(function(it){var o=JSON.parse(JSON.stringify(it));delete o._sub;return o;});
  if(typeof updateCartCount==='function')updateCartCount();
  if(typeof renderCart==='function')renderCart();
  _cuentaCerrarPedido();
  closeCuenta();
  if(typeof openCart==='function')openCart();
}
window._cuentaVolverAPedir=_cuentaVolverAPedir;

// Formatea gramos: 1500g → "1.5 kg", 500 → "500 g"
function _gLabel(g){return g>=1000?(g/1000)%1===0?(g/1000)+' kg':(g/1000).toFixed(2).replace(/\.?0+$/,'')+' kg':g+' g'}
// Precio total de un item (maneja kg unificados y unidades)
function _itemMin(it){if(it.unidad==='mix')return it.l1;if(it.unidad==='kg')return Math.round(it.l1*(it.totalG/1000));return it.l1*it.c}
function _itemMay(it){if(it.unidad==='mix')return it.l2;if(it.unidad==='kg')return Math.round(it.l2*(it.totalG/1000));return it.l2*it.c}

// ─── DESCUENTO POR OFERTA DEL MES ───
// Devuelve el % de oferta de un producto por pid (0 si no tiene)
function _getOfertaPct(pid){
  const p = PRODS.find(p => p[0] === pid);
  return (p && p[12] && p[12].oferta) ? p[12].oferta : 0;
}
// Devuelve el precio minorista con oferta aplicada para un item del carrito
function _itemMinConOferta(it){
  // Mix y granola no tienen oferta (son compuestos)
  if(it.unidad==='mix') return _itemMin(it);
  const pct = _getOfertaPct(it.pid);
  const base = _itemMin(it);
  return pct > 0 ? Math.round(base * (1 - pct/100)) : base;
}
// Devuelve true si hay AL MENOS UN producto con oferta en PRODS
function _hayOfertasDelMes(){
  return PRODS.some(p => p[12] && p[12].oferta > 0);
}
// Cantidad a mostrar (stepper del carrito): para kg en gramos +250g/-250g, para und en unidades
function _itemCount(it){return it.unidad==='kg'?_gLabel(it.totalG):it.c}
function renderCart(){
  const body=document.getElementById('cartBody'),footer=document.getElementById('cartFooter');
  if(!cart.length){
    var _ult=_cargarUltimoPedido();
    var _ultBtn=(_ult&&_ult.length)?'<button class="cart-empty-repeat" onclick="_repetirUltimoPedido()">🔄 Volver a pedir lo último ('+_ult.length+' producto'+(_ult.length!==1?'s':'')+')</button>':'';
    body.innerHTML='<div class="cart-empty"><span class="big">🛒</span><div style="font-size:16px;font-weight:600;margin-bottom:6px">Tu carrito está vacío</div><div style="font-size:14px;color:var(--muted-fg)">Agregá productos para armar tu pedido</div>'+_ultBtn+'</div>';
    footer.classList.add('hidden');return}
  let h='';
  const _esMayCart=cart.reduce((a,i)=>a+_itemMin(i),0)>=80000;
  cart.forEach(it=>{
    const sMin=_itemMin(it);
    const sMay=_itemMay(it);
    const ofertaPct=_getOfertaPct(it.pid);
    const sOferta=_itemMinConOferta(it);
    const priceHTML=_esMayCart
      ?`<div class="cart-item-price"><span class="precio-tachado-sm">$${fmt(sMin)}</span><span class="cart-price-desc">$${fmt(sMay)}</span></div>`
      :ofertaPct>0
        ?`<div class="cart-item-price"><span class="precio-tachado-sm">$${fmt(sMin)}</span><span class="precio-oferta">$${fmt(sOferta)}</span></div>`
        :`<div class="cart-item-price">$${fmt(sMin)}</div>`;
    const isMix=it.unidad==='mix';
    const qLabel=isMix?_gLabel(it.totalG):_itemCount(it);
    const subLabel=isMix
      ?`<span class="cart-item-opt" style="font-size:11px;line-height:1.4">${it.mixDetalle||''}</span>`
      :`<span class="cart-item-opt">${qLabel}${ofertaPct>0&&!_esMayCart?' · Oferta -'+ofertaPct+'%':' · $'+fmt(it.l1)+'/kg'}</span>`;
    const controls=isMix
      ?'' // mixes no se editan cantidad, solo se eliminan
      :`<div style="display:flex;align-items:center;gap:4px"><button class="qty-btn" style="width:26px;height:26px;font-size:15px" onclick="cartQty('${it.key}',-1)">−</button><span style="font-size:12px;font-weight:700;min-width:32px;text-align:center">${qLabel}</span><button class="qty-btn" style="width:26px;height:26px;font-size:15px" onclick="cartQty('${it.key}',1)">+</button></div>`;
    const trashSvg='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
    const editBtn=isMix?`<button onclick="editBuilder('${it.key}')" title="Editar" style="background:none;border:1.5px solid var(--azul);color:var(--azul-dark);border-radius:8px;padding:3px 9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-right:4px;white-space:nowrap">✏ Editar</button>`:'';
    h+=`<div class="cart-item"><div class="cart-item-name">${_tc(it.n)}${subLabel}</div>${controls}${editBtn}${priceHTML}<button class="cart-item-del" onclick="cartDel('${it.key}')" title="Eliminar">${trashSvg}</button></div>`;
  });
  body.innerHTML=h;
  const totalMin=cart.reduce((a,i)=>a+_itemMin(i),0);
  const totalMay=cart.reduce((a,i)=>a+_itemMay(i),0);
  const totalConOferta=cart.reduce((a,i)=>a+_itemMinConOferta(i),0);
  const esMay=totalMin>=80000;
  const ahorroMay=totalMin-totalMay;
  const ahorroOferta=totalMin-totalConOferta;
  const huboOferta=ahorroOferta>0;
  const totalFinal=esMay?totalMay:(huboOferta?totalConOferta:totalMin);
  const appDesc=0;
  const totalConApp=totalFinal;
  // Badge principal
  let fh='';
  if(esMay){
    fh=`<div class="may-badge may-active">✅ ¡Descuento por volumen activado!<div style="font-size:17px;font-weight:800;margin-top:3px">Ahorrás $${fmt(ahorroMay)}</div></div>`;
    if(huboOferta){
      fh+=`<div style="background:#e8f5e9;border-radius:10px;padding:9px 13px;margin-top:6px;font-size:13px;color:#2e7d32;text-align:center;font-weight:600;line-height:1.35">🎉 Felicitaciones, ahorrás más con el descuento por volumen</div>`;
    }
  } else if(huboOferta){
    fh=`<div class="may-badge may-active" style="background:#fff3e0;border-color:#e65100;color:#e65100">🏷️ Ofertas del mes aplicadas<div style="font-size:17px;font-weight:800;margin-top:3px">Ahorrás $${fmt(ahorroOferta)}</div></div>`;
    fh+=`<div class="may-badge may-inactive" style="margin-top:6px;font-size:12px">Agregá $${fmt(Math.max(0,80000-totalMin))} más para activar el descuento por volumen</div>`;
  } else {
    fh=`<div class="may-badge may-inactive">🏷️ Agregá $${fmt(Math.max(0,80000-totalMin))} más para obtener precios con descuento</div>`;
  }

  // Líneas de total
  fh+=`<div class="total-rows"><div class="total-row"><span>Subtotal Minorista</span><span>$${fmt(totalMin)}</span></div>`;
  if(!esMay&&huboOferta)fh+=`<div class="total-row disc"><span>Ofertas del mes</span><span>−$${fmt(ahorroOferta)}</span></div>`;
  if(esMay)fh+=`<div class="total-row disc"><span>Descuento por volumen</span><span>−$${fmt(ahorroMay)}</span></div>`;

  fh+=`<div class="total-row main"><span>Total a pagar</span><span>$${fmt(totalConApp)}</span></div></div>`;
  fh+='<button class="wa-btn" onclick="pedirWA()"><svg viewBox="0 0 24 24" width="19" height="19" fill="#fff" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.006 22l4.984-1.307A9.961 9.961 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25a8.24 8.24 0 01-4.258-1.178l-.306-.181-3.157.828.844-3.07-.2-.319A8.25 8.25 0 1112 20.25z"/></svg> Pedir por WhatsApp</button>';
  footer.innerHTML=fh;footer.classList.remove('hidden');
}
function cartQty(key,d){
  const it=cart.find(i=>i.key===key);if(!it)return;
  if(it.unidad==='kg'){it.totalG=Math.max(250,(it.totalG||0)+d*250);}
  else{it.c=Math.max(1,(it.c||1)+d);}
  updateCartCount();renderCart();
  if(it.pid&&it.pid>0)_reRenderCard(it.pid);
}
function cartDel(key){
  const it=cart.find(i=>i.key===key);
  const pid=it?it.pid:null;
  cart=cart.filter(i=>i.key!==key);
  updateCartCount();
  renderCart();
  if(pid&&pid>0)_reRenderCard(pid);
}
function pedirWA(){
  try {
    if (typeof abrirCheckout !== 'function') {
      console.error('abrirCheckout no está definida');
      alert('Hubo un error al abrir el formulario. Por favor recargá la página e intentá de nuevo.');
      return;
    }
    closeCart();
    abrirCheckout('minorista');
  } catch(e) {
    console.error('Error en pedirWA:', e);
    alert('Error: ' + e.message);
  }
}

let _searchTimer=null;
let _searchPreScrollY=0;
let _searchOverlayOpen=false;
function cerrarBusqueda(){
  const inp=document.getElementById('compactSearchInput');
  if(inp)inp.value='';
  searchTerm='';
  clearTimeout(_searchTimer);
  _doSearch('');
  const saved=_searchPreScrollY;
  _searchOverlayOpen=false;
  _searchPreScrollY=0;
  if(saved>0)requestAnimationFrame(()=>window.scrollTo(0,saved));
}
window.cerrarBusqueda=cerrarBusqueda;
function onSearch(val){
  clearTimeout(_searchTimer);
  _searchTimer=setTimeout(()=>_doSearch(val),300);
}

// Sugerencias tipo Google mientras se escribe (nombres de productos que empiezan
// con lo tipeado tienen prioridad sobre los que solo lo contienen en el medio).
function _updateSuggestions(value){
  const box=document.getElementById('searchSuggestions');
  if(!box)return;
  const term=(value||'').trim();
  if(term.length<2){box.classList.remove('active');box.innerHTML='';return;}
  const tab=(typeof currentTab!=='undefined')?currentTab:'minorista';
  const list=(tab==='mayorista'&&typeof PRODS_MAY!=='undefined')?PRODS_MAY:PRODS;
  const qn=_norm(term);

  // Rubros que matchean el término (hasta 2), para saltar directo a la categoría.
  // Solo aplica en minorista: mayorista tiene su propio mecanismo de categorías.
  let catMatches=[];
  if(tab!=='mayorista'&&typeof CATS!=='undefined'){
    catMatches=CATS.map(c=>{
      const cn=_norm(c.n);
      let score=0;
      if(cn.startsWith(qn))score=3;
      else if(cn.split(' ').some(w=>w.startsWith(qn)))score=2;
      else if(cn.includes(qn))score=1;
      return{c,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,2).map(x=>x.c);
  }

  const scored=(list||[]).map(p=>{
    const tn=_norm(p[2]);
    let score=0;
    if(tn.startsWith(qn))score=3;
    else if(tn.split(' ').some(w=>w.startsWith(qn)))score=2;
    else if(tn.includes(qn))score=1;
    return{p,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  const seen=new Set();
  const top=[];
  for(const{p}of scored){
    const nombre=_tc(p[2]);
    if(seen.has(nombre))continue;
    seen.add(nombre);
    top.push(nombre);
    if(top.length>=6)break;
  }
  if(!top.length&&!catMatches.length){box.classList.remove('active');box.innerHTML='';return;}
  const catHTML=catMatches.map(c=>
    `<div class="search-suggestion-item sug-cat" onmousedown="_pickCategorySuggestion('${c.id}')"><span class="sug-icon">${c.ic}</span>${c.n}</div>`
  ).join('');
  const prodHTML=top.map(n=>`<div class="search-suggestion-item" onmousedown="_pickSuggestion('${n.replace(/'/g,"\\'")}')"><span class="sug-icon">🔍</span>${n}</div>`).join('');
  box.innerHTML=catHTML+prodHTML;
  box.classList.add('active');
}
window._updateSuggestions=_updateSuggestions;
function _pickSuggestion(nombre){
  const box=document.getElementById('searchSuggestions');
  if(box){box.classList.remove('active');box.innerHTML='';}
  const inp=document.getElementById('compactSearchInput');
  if(inp)inp.value=nombre;
  if(typeof window.compactOnSearch==='function')window.compactOnSearch(nombre);
}
window._pickSuggestion=_pickSuggestion;

// Click en una sugerencia de RUBRO: a diferencia de un producto, no busca —
// cierra el buscador y va directo a la categoría (mismo cierre que irAProducto).
function _pickCategorySuggestion(catId){
  const box=document.getElementById('searchSuggestions');
  if(box){box.classList.remove('active');box.innerHTML='';}
  const inp=document.getElementById('compactSearchInput');
  if(inp){inp.value='';inp.blur();}
  searchTerm='';
  clearTimeout(_searchTimer);
  const header=document.querySelector('.header');
  const banner=document.querySelector('.banner');
  const tabs=document.getElementById('mainTabs');
  if(header)header.classList.remove('collapsed');
  if(banner)banner.classList.remove('collapsed');
  if(tabs)tabs.classList.remove('collapsed');
  document.body.style.overflow='';
  _searchOverlayOpen=false;_searchPreScrollY=0;
  const srMobile=document.getElementById('searchResultsMobile');
  if(srMobile){srMobile.classList.remove('active');srMobile.classList.add('hidden');srMobile.innerHTML='';}
  const bannersWrap=document.getElementById('bannersTrackWrap');
  if(bannersWrap)bannersWrap.style.display='';
  if(typeof window.switchTab==='function')window.switchTab('minorista');
  selectCat(catId);
}
window._pickCategorySuggestion=_pickCategorySuggestion;
function _hideSuggestionsDelayed(){
  setTimeout(()=>{
    const box=document.getElementById('searchSuggestions');
    if(box)box.classList.remove('active');
  },150);
}
window._hideSuggestionsDelayed=_hideSuggestionsDelayed;

function _onSearchFocus(){
  if(window.innerWidth>=768)return;
  // Colapsar header, banner y tabs en mobile para ganar espacio
  const header=document.querySelector('.header');
  const banner=document.querySelector('.banner');
  const tabs=document.getElementById('mainTabs');
  if(header)header.classList.add('collapsed');
  if(banner)banner.classList.add('collapsed');
  if(tabs)tabs.classList.add('collapsed');
}

function _onSearchBlur(input){
  // Pequeño delay para que no colapse antes de procesar el click en un resultado
  setTimeout(function(){
    if(window.innerWidth>=768)return;
    const val=input?input.value:'';
    if(val)return; // si hay texto, mantener colapsado mientras busca
    const header=document.querySelector('.header');
    const banner=document.querySelector('.banner');
    const tabs=document.getElementById('mainTabs');
    if(header)header.classList.remove('collapsed');
    if(banner)banner.classList.remove('collapsed');
    if(tabs)tabs.classList.remove('collapsed');
  },250);
}
function _doSearch(val){
  searchTerm=val.trim();
  const isMobile=window.innerWidth<768;
  const bannersWrap=document.getElementById('bannersTrackWrap');
  const srMobile=document.getElementById('searchResultsMobile');

  if(!searchTerm){
    // Restaurar header colapsado
    const header=document.querySelector('.header');
    const banner=document.querySelector('.banner');
    const tabs=document.getElementById('mainTabs');
    if(header)header.classList.remove('collapsed');
    if(banner)banner.classList.remove('collapsed');
    if(tabs)tabs.classList.remove('collapsed');
    // Desbloquear scroll del body
    document.body.style.overflow='';
    _searchOverlayOpen=false;
    // Limpiar resultados mobile
    if(srMobile){srMobile.classList.remove('active');srMobile.classList.add('hidden');srMobile.innerHTML='';}
    if(bannersWrap)bannersWrap.style.display='';
    if(activeCatId)selectCat(activeCatId);
    else{renderCarruseles();document.getElementById('mobileProdsArea').classList.remove('hidden');}
    return;
  }
  // Guardar posición de scroll al abrir el overlay por primera vez
  if(isMobile&&!_searchOverlayOpen){
    _searchPreScrollY=window.scrollY||window.pageYOffset||0;
    _searchOverlayOpen=true;
    _palPushOverlay('search',{scrollY:_searchPreScrollY});
  }

  // Ocultar banners en mobile mientras se busca
  if(bannersWrap&&isMobile)bannersWrap.style.display='none';

  // Calcular score
  const scored=PRODS.map(p=>({p,score:_matchScore(searchTerm,p[2])*2+_matchScore(searchTerm,p[3])})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  const results=scored.map(x=>x.p);

  // Calcular el top del header para el padding del overlay mobile
  if(isMobile&&srMobile){
    const headerEl=document.querySelector('.header');
    const bannerEl=document.querySelector('.banner');
    const headerH=(headerEl?headerEl.offsetHeight:80)+(bannerEl?bannerEl.offsetHeight:36);
    srMobile.style.paddingTop=(headerH+12)+'px';
  }

  let h=`<h1 style="font-size:18px;color:var(--azul-dark);margin-bottom:12px;font-weight:700">Resultados para "${searchTerm}"</h1>`;
  if(!results.length){
    h+='<div style="text-align:center;padding:44px 0;color:var(--muted-fg);font-size:17px">No se encontraron productos 🔍</div>';
  } else {
    // Tarjetas completas (igual que el catálogo): se puede agregar al carrito acá mismo,
    // sin salir de los resultados de búsqueda.
    const prefix=isMobile?'mb':'dt';
    h+='<div class="prod-grid">';
    results.forEach((p,i)=>{h+=renderCard(p,prefix,i<4);});
    h+='</div>';
  }

  if(isMobile&&srMobile){
    const backBtn='<button class="back-btn" style="margin-bottom:12px" onclick="cerrarBusqueda()">← Volver</button>';
    srMobile.innerHTML=backBtn+h;
    srMobile.classList.remove('hidden');
    srMobile.classList.add('active');
    srMobile.scrollTop=0;
    document.body.style.overflow='hidden';
    document.getElementById('mobileProdsArea').innerHTML='';
    document.getElementById('mobileProdsArea').dataset.catalogView='search';
    document.getElementById('desktopProdsArea').innerHTML='';
  } else {
    const _area=document.getElementById('desktopProdsArea');
    _area.innerHTML=h;
    _area.dataset.catalogView='search';
    document.getElementById('mobileProdsArea').innerHTML='';
    if(srMobile){srMobile.classList.remove('active');srMobile.innerHTML='';}
    // Scroll hasta los resultados (solo si no están ya arriba, para no re-scrollear en cada tecla)
    requestAnimationFrame(()=>{
      const header=document.querySelector('.header');
      const hh=header?header.offsetHeight:0;
      const rect=_area.getBoundingClientRect();
      if(Math.abs(rect.top-hh)>40){
        const y=rect.top+window.pageYOffset-hh-12;
        window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
      }
    });
  }
}

// Al hacer click en un resultado del buscador, ir al rubro y scrollear al producto
function irAProducto(pid){
  const p=PRODS.find(x=>x[0]===pid);if(!p)return;
  const inp=document.getElementById('searchInput');if(inp)inp.value='';
  searchTerm='';
  clearTimeout(_searchTimer);
  // Restaurar header
  const header=document.querySelector('.header');
  const banner=document.querySelector('.banner');
  const tabs=document.getElementById('mainTabs');
  if(header)header.classList.remove('collapsed');
  if(banner)banner.classList.remove('collapsed');
  if(tabs)tabs.classList.remove('collapsed');
  // Cerrar overlay mobile de búsqueda
  document.body.style.overflow='';
  _searchOverlayOpen=false;_searchPreScrollY=0;
  const srMobile=document.getElementById('searchResultsMobile');
  if(srMobile){srMobile.classList.remove('active');srMobile.classList.add('hidden');srMobile.innerHTML='';}
  const bannersWrap=document.getElementById('bannersTrackWrap');
  if(bannersWrap)bannersWrap.style.display='';
  selectCat(p[1],pid);
  // al final: selectCat toca el historial, así que la dirección del producto se marca después
  try{ if(typeof _urlProducto==='function') _urlProducto(p); }catch(e){}
}

function closeModal(){document.getElementById('catModal').classList.add('hidden');document.body.style.overflow=''}

/* ── CHATBOT ── */
let chatOpen=false;
const QUICK_FAQS=[
  {label:'🛒 Venta minorista',msg:'¿Cuál es el horario y contacto de ventas minoristas?'},
  {label:'📦 Venta mayorista',msg:'¿Cómo funciona la venta mayorista?'},
  {label:'🥜 Mixes de frutos secos',msg:'¿Qué mixes de frutos secos ofrecen?'},
  {label:'🥣 Variedades de granola',msg:'¿Qué variedades de granola tienen?'},
  {label:'💰 Cómo funcionan los precios',msg:'¿Cómo se expresan los precios?'},
  {label:'📦 Cómo hacer un pedido',msg:'¿Cómo hago mi pedido paso a paso?'},
  {label:'🚚 Envíos a domicilio',msg:'¿Cómo funciona el envío a domicilio?'},
  {label:'💳 Métodos de pago',msg:'¿Qué métodos de pago aceptan?'},
];
function _renderQuickFaqs(){
  const d=document.getElementById('chat-msgs');
  const wrap=document.createElement('div');
  wrap.className='chat-quick-faqs';
  wrap.innerHTML='<div class="chat-faq-title">Preguntas frecuentes:</div>'+
    QUICK_FAQS.map(f=>`<button class="chat-faq-btn" onclick="sendQuickFaq(this,'${f.msg.replace(/'/g,"\\'")}')">${f.label}</button>`).join('');
  d.appendChild(wrap);
  // no scroll — el usuario se queda viendo la respuesta del bot
}
function sendQuickFaq(btn,msg){
  const wrap=btn.closest('.chat-quick-faqs');
  if(wrap)wrap.remove();
  addUserMsg(msg);
  const typing=addBotMsg('...');
  typing.classList.add('typing');
  setTimeout(()=>{
    const reply=responderChat(msg);
    typing.style.whiteSpace='pre-wrap';
    typing.innerHTML=reply;
    typing.classList.remove('typing');
    document.getElementById('chat-msgs').scrollTop=9999;
    setTimeout(()=>_renderQuickFaqs(),200);
  },420);
}
function toggleChat(){
  chatOpen=!chatOpen;
  const box=document.getElementById('chat-box');
  box.classList.toggle('open',chatOpen);
  if(chatOpen&&!document.getElementById('chat-msgs').children.length){
    addBotMsg('¡Hola! 👋 Bienvenido a Paladear Mercado de Sabores.\n¿En qué te puedo ayudar?');
    _renderQuickFaqs();
  }
}
function addBotMsg(txt){
  const d=document.getElementById('chat-msgs');
  const m=document.createElement('div');
  m.className='cmsg bot';
  m.style.whiteSpace='pre-wrap';
  m.innerHTML=txt;
  d.appendChild(m);
  d.scrollTop=9999;
  return m;
}
function addUserMsg(txt){
  const d=document.getElementById('chat-msgs');
  const m=document.createElement('div');
  m.className='cmsg user';
  m.textContent=txt;
  d.appendChild(m);
  d.scrollTop=9999;
}
function responderChat(msg){
  const t=msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/minorista.*horario|horario.*minorista|contacto.*minorista|minorista.*contacto|venta minorista/.test(t))
    return '🛒 Ventas Minoristas\n\n📞 Contacto: +549 261 651 2823\n🕙 Horario: Lunes a Sábados · 10:00 a 20:00 hs\n📍 Pueyrredón 588, esq. Paso de los Andes, Quinta Sección, Mendoza\n\n🏷️ Sin mínimos de compra. Descuentos en compras mayores a $80.000.\n\n🚚 Para envíos, consultá por nuestros canales de venta al por menor.';
  if(/envio|enviar|delivery|despacho|mando|mandar|entrega|reparto/.test(t))
    return '🚚 Envíos a domicilio\n\nHacemos envíos en Mendoza Capital y Gran Mendoza.\n\n✅ ENVÍO GRATIS en compras mayores a $40.000 dentro de:\nCiudad, Godoy Cruz, Guaymallén, Las Heras, Luján de Cuyo o Maipú.\n\nSi tu compra es menor a ese monto, el envío se abona aparte.\n\nTambién podés retirar en el local sin costo:\nPueyrredón 588, Mendoza.';
  if(/metodo.*pago|medio.*pago|como.*pagar|abonar|pagar|transferencia|efectivo|tarjeta|mercado.*pago|mp|qr/.test(t)||t==='¿qué métodos de pago aceptan?')
    return '💳 Métodos de pago\n\n📍 En el local:\n• Efectivo (5% de descuento)\n• Tarjetas de crédito y débito\n• Mercado Pago o MODO\n\n🚚 Envíos a domicilio:\n• Transferencia bancaria (pedinos el ALIAS)\n• Tarjeta de crédito/débito via link de Mercado Pago\n\nEl descuento en efectivo se aplica sobre el total del pedido.';
  if(/horario|hora|abren|abrir|cuando|dias|abre|cierra/.test(t))
    return 'Nuestros horarios son:\n\n🛒 Lunes a Sábados · 10:00 a 20:00 hs\nPueyrredón 588, Mendoza\n\nTambién podés hacer tu pedido online las 24hs por este catálogo.';
  if(/direccion|ubicacion|donde|local|tienda|lugar|mapa/.test(t))
    return '📍 Nuestra dirección:\n\nPueyrredón 588, esq. Paso de los Andes — Quinta Sección, Ciudad de Mendoza.\nLunes a Sábados de 10:00 a 20:00 hs.\n(En Google Maps: "Paladear Mercado de Sabores")';
  if(/mayorista|mayor|precio mayor|lista mayor|lista 2|250000|250\.000/.test(t))
    return '📦 Venta mayorista\n\nLas ventas por mayor (revendedores, bulto cerrado) las manejamos en nuestra Distribuidora, un sitio aparte. Ahí vas a encontrar los precios y condiciones de compra al por mayor.\n<a href="https://paladear.github.io/paladeardistribuidora" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;background:var(--azul);color:#fff;padding:9px 16px;border-radius:9px;text-decoration:none;font-weight:700;font-size:13px">📦 Ir a la Distribuidora →</a>';
  if(/precio|cuanto.*cuesta|valor|kilo|kg|como.*se.*expresa|descuento|80000|80\.000/.test(t))
    return '💰 Precios\n\nLos precios están publicados por kilogramo en el catálogo.\n\n🏷️ Descuento por cantidad: En compras que superen los $80.000 se aplica automáticamente un descuento. El precio en azul en cada producto es el precio con descuento.';
  if(/pedido|como comprar|como pedir|comprar|hacer pedido|proceso|paso a paso/.test(t))
    return '📦 Cómo hacer tu pedido\n\n1. Navegá el catálogo y elegí tus productos\n2. Seleccioná la cantidad y tocá "Agregar al pedido"\n3. Abrí el carrito y revisá tu selección\n4. Tocá "Pedir por WhatsApp" para enviarnos tu pedido\n5. Confirmá el pedido con el equipo Paladear\n6. Informanos el método de pago\n7. ¡Lo recibís en casa o lo retirás en el local! 🎉';
  if(/whatsapp.*mayorista|mayorista.*whatsapp|contacto.*mayorista|mayorista.*contacto|numero.*mayorista/.test(t))
    return '📦 Para venta mayorista (revendedores), visitá nuestra Distribuidora:\n<a href="https://paladear.github.io/paladeardistribuidora" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;background:var(--azul);color:#fff;padding:9px 16px;border-radius:9px;text-decoration:none;font-weight:700;font-size:13px">📦 Ir a la Distribuidora →</a>';
  if(/whatsapp|telefono|contacto|llamar|numero|comunicar/.test(t))
    return 'Podés contactarnos por WhatsApp:\n\n📱 +549 261 651 2823\nLunes a Sábados · 10:00 a 20:00 hs';
  if(/mix tradicional/.test(t))
    return 'Mix Tradicional 🥜\nUn clásico que nunca falla.\nContenido: nueces, almendras, pasas rubias, pasas morochas y maní.';
  if(/mix tropical/.test(t))
    return 'Mix Tropical 🌴\nPara los que buscan un toque exótico.\nContenido: nuez, almendras, castañas, pasas morochas y rubias, fruta glaseada y chips de banana.';
  if(/mix patagonico|mix patagónico/.test(t))
    return 'Mix Patagónico 🏔️\nIntenso y equilibrado.\nContenido: nuez, almendras, castañas, pasas morochas, arándanos, frutilla glaseada y coco en escamas.';
  if(/mix sin pasas|sin pasas premium/.test(t))
    return 'Mix Sin Pasas Premium ✨\nPuro sabor, sin pasas.\nContenido: nuez mariposa extra light, almendras nonpareil, castañas y maní tostado.';
  if(/mix salado/.test(t))
    return 'Mix Salado 🧂\nIdeal para picadas.\nContenido: maní, pasas de uva rubia, castañas de cajú, almendras.';
  if(/mix cervecero/.test(t))
    return 'Mix Cervecero 🍺\nContenido: frutos secos variados, ideal para acompañar bebidas.';
  if(/que mixes|mixes de frutos|variedades.*mix/.test(t))
    return '🥜 Mixes de frutos secos\n\n• Mix Tradicional: nueces, almendras, pasas rubias, pasas morochas y maní\n• Mix Tropical: nuez, castañas, fruta glaseada y chips de banana\n• Mix Patagónico: nuez, almendras, arándanos, frutilla glaseada y coco\n• Mix Sin Pasas Premium: nuez extra light, almendras nonpareil y castañas\n• Mix Salado: maní, cajú, almendras (ideal para picadas)\n\n¿Querés saber los ingredientes de alguno en particular?';
  if(/granola.*berries|granola mix berries/.test(t))
    return 'Granola Mix Berries 🫐\nIngredientes: avena arrollada gruesa, pepitas de girasol, pasas de uva, jarabe de maíz, copos de maíz, arándanos deshidratados, almendras y nueces.';
  if(/granola.*energeti|granola.*energético/.test(t))
    return 'Granola Mix Energético ⚡\nIngredientes: avena arrollada gruesa, pepitas de girasol, maní tostado, jarabe de maíz, pasas de uva, copos de maíz, almendras y nueces.';
  if(/granola.*tropical/.test(t))
    return 'Granola Mix Tropical 🌺\nIngredientes: avena arrollada gruesa, pepitas de girasol, pasas de uva, jarabe de maíz, copos de maíz, almendras, chips de banana, papaya y manzana deshidratada.';
  if(/granola tradicional/.test(t))
    return 'Granola Tradicional 🌾\nIngredientes: avena, lino y girasol tostado, cereal de maíz sin azúcar, quínoa pop, pasas de uva, coco rallado, vainillín, azúcar rubia orgánica y miel.';
  if(/granola.*sin pasas/.test(t))
    return 'Granola Mix Sin Pasas 🌾\nIngredientes: avena, lino y girasol tostado, cereal de maíz sin azúcar, quínoa pop, coco rallado, vainillín, azúcar rubia orgánica y miel.';
  if(/granola.*choco|granola.*chocolate/.test(t))
    return 'Granola con Chips de Chocolate 🍫\nIngredientes: avena, lino y girasol tostado, cereal de maíz sin azúcar, quínoa pop, pasas de uva, chips de chocolate, coco rallado, vainillín, azúcar rubia orgánica y miel.';
  if(/que granola|variedades.*granola|granola/.test(t))
    return '🥣 Variedades de granola\n\n• Mix Berries: con arándanos, almendras y nueces\n• Mix Energético: con maní tostado\n• Mix Tropical: con chips de banana y papaya\n• Tradicional: con miel y coco\n• Mix Sin Pasas\n• Con Chips de Chocolate\n\n¿Querés los ingredientes de alguna en particular?';
  if(/nuez|nueces|variedad.*nuez/.test(t))
    return 'Trabajamos con nuez variedad Chandler del Valle de Uco 🌰\nLas presentamos como: nuez mariposa extra light, light, ámbar y negras.\n\nPueden variar en color y tamaño según temporada.';
  if(/almendra|almendras/.test(t))
    return 'Tenemos almendras Nonpareil (Mendoza y Chile) y Guara (Mendoza) 🌰\nAmbas son de excelente calidad y sabor exquisito.';
  if(/nueces.*almendras|almendras.*nueces|variedades.*nueces/.test(t))
    return '🌰 Nueces y Almendras\n\nNueces: Variedad Chandler del Valle de Uco.\nPresentaciones: mariposa extra light, light, ámbar y negras.\n\nAlmendras: Nonpareil (Mendoza y Chile) y Guara (Mendoza).\nAmbas de excelente calidad y sabor exquisito.';
  if(/miel/.test(t))
    return 'Contamos con miel de tres productores mendocinos 🍯\nCada uno con características y bondades únicas.\n\nContanos tus preferencias (sabor suave, fuerte, floral) y te recomendamos la ideal para vos.';
  if(/celiaco|celiaca|celíaco|celíaca|sin tacc|gluten|tacc/.test(t))
    return 'Tenemos una sección especial Sin TACC 🌱\nPodés encontrarla en el catálogo. Si tenés dudas sobre un producto específico, consultanos por WhatsApp.';
  if(/vegano|vegana|plant based/.test(t))
    return 'Muchos de nuestros productos son aptos para veganos 🌱\nFrutos secos, semillas, harinas, legumbres, especias y más. Si querés saber sobre un producto específico, consultanos.';
  if(/retiro|retirar|buscar|paso a buscar/.test(t))
    return 'Podés retirar tu pedido sin problema 🏠\n\nPueyrredón 588, Mendoza · Lunes a Sábados de 10:00 a 20:00 hs.';
  if(/^(hola|buen|buenas|saludos|hey|hi|buenos dias|buenas tardes|buenas noches)/.test(t))
    return '¡Hola! 👋 Bienvenido a Paladear Mercado de Sabores.\n¿En qué te puedo ayudar?';
  if(/gracias|muchas gracias|genial|perfecto|excelente|ok gracias/.test(t))
    return '¡De nada! 😊 Si tenés más preguntas estoy acá. También podés escribirnos por WhatsApp: +549 261 651 2823';
  return 'No estoy seguro de poder responder eso con exactitud 🤔\n\nEscribinos por WhatsApp: +549 261 651 2823\n\nTambién puedo contarte sobre:\n• Mixes de frutos secos y granolas\n• Envíos y métodos de pago\n• Cómo hacer un pedido\n• Horarios y ubicación\n• Precios y descuentos';
}
function sendChat(){
  const input=document.getElementById('chat-input');
  const text=input.value.trim();
  if(!text)return;
  input.value='';
  // remove quick faqs if still visible
  const qf=document.querySelector('.chat-quick-faqs');if(qf)qf.remove();
  addUserMsg(text);
  const typing=addBotMsg('...');
  typing.classList.add('typing');
  setTimeout(()=>{
    const reply=responderChat(text);
    typing.style.whiteSpace='pre-wrap';
    typing.innerHTML=reply;
    typing.classList.remove('typing');
    document.getElementById('chat-msgs').scrollTop=9999;
    setTimeout(()=>_renderQuickFaqs(),200);
  },420);
}

/* ── CARGA DESDE SHEETS ── */
// URL pública de la hoja "Info" como CSV. Se completa cuando la publiques.
// Va a ser algo tipo: https://docs.google.com/spreadsheets/d/e/XXXXXX/pub?gid=YYY&single=true&output=csv
const INFO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT2RlZaSdlV-aaVGUw7YI9MVE1MHjopNhbjTOfWBZwPNo_clhJUao2KNcNowEzsdBGpd2Bh5-2rt1aH/pub?gid=1603230501&single=true&output=csv';

function _parseCSV(csv){
  const rows=[];
  const lines=csv.trim().split(/\r?\n/);
  let i=0;
  while(i<lines.length){
    // una celda puede tener saltos de línea si está entre comillas, así que
    // acumulamos líneas hasta cerrar todas las comillas abiertas
    let raw=lines[i++];
    let quoteCount=(raw.match(/"/g)||[]).length;
    while(quoteCount%2!==0&&i<lines.length){
      raw+='\n'+lines[i++];
      quoteCount=(raw.match(/"/g)||[]).length;
    }
    // parsear la fila acumulada caracter a caracter
    const cols=[];let cur='',inQ=false;
    for(let j=0;j<raw.length;j++){
      const ch=raw[j];
      if(ch==='"'){
        if(inQ&&raw[j+1]==='"'){cur+='"';j++;}  // comilla escapada ""
        else inQ=!inQ;
      } else if(ch===','&&!inQ){
        cols.push(cur.trim());cur='';
      } else {
        cur+=ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function _driveToImg(raw){
  if(!raw)return '';
  let m=raw.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if(!m)m=raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  const hoy=new Date();
  const bust=hoy.getFullYear()+''+('0'+(hoy.getMonth()+1)).slice(-2)+''+('0'+hoy.getDate()).slice(-2);
  // =w600: pedimos a Google la imagen redimensionada a 600px de ancho (nítida en
  // tarjetas y modal) en vez del original de ~200KB. Reduce el peso a la mitad.
  // El zoom (zoomImg) sube la resolución a w1200 bajo demanda para verla grande.
  return m?'https://lh3.googleusercontent.com/d/'+m[1]+'=w600?v='+bust:raw;
}

// Fotos de productos servidas desde Cloudinary (public_id = ID del artículo).
// El Apps Script del dueño sube cada foto acá con ese mismo ID.
const _CLOUD='hswu4zpv';
function _prodImg(id,w){ return id?('https://res.cloudinary.com/'+_CLOUD+'/image/upload/f_auto,q_auto,w_'+(w||500)+'/'+id):''; }

// Parsea "250g/500g/1kg" o "1 unidad" y devuelve array de claves de opciones válidas
function _parseCantidades(str){
  if(!str)return null;
  const items=str.split('/').map(s=>s.trim()).filter(Boolean);
  return items.length?items:null;
}

// Dada una opción (ej "250g", "1 kg", "1 unidad") y precios base (precio por kg o por und),
// calcula el precio final para esa opción
function _calcPrecioOpc(opc,p1,p2,esKg){
  const s=opc.toLowerCase().replace(/\s+/g,'');
  // gramos: "250g", "500g"
  let m=s.match(/^(\d+)g$/);
  if(m&&esKg){const f=parseInt(m[1])/1000;return [Math.round(p1*f),Math.round(p2*f)];}
  // kg: "1kg", "2kg", "0.5kg"
  m=s.match(/^([\d.,]+)kg$/);
  if(m&&esKg){const f=parseFloat(m[1].replace(',','.'));return [Math.round(p1*f),Math.round(p2*f)];}
  // unidad: "1 unidad", "1und", "1 und", "2 unidades"
  m=s.match(/^(\d+)(unidad|unidades|und|u)$/);
  if(m){const f=parseInt(m[1]);return [Math.round(p1*f),Math.round(p2*f)];}
  // si no se pudo parsear, usar precio base
  return [p1,p2];
}

// Carga hoja Info. Intenta primero el archivo estático del repo (cacheable por SW),
// si no está disponible cae al CSV directo del Sheet.
function _cargarInfo(useSnapshot){
  return new Promise(resolve=>{
    function _procesar(csv){
      const filas=_parseCSV(csv);
      const mapa={};
      filas.forEach((cols,idx)=>{
        if(idx===0||cols.length<1)return;
        const nombre=(cols[0]||'').replace(/^"|"$/g,'').trim();
        if(!nombre)return;
        const id=(cols[6]||'').replace(/^"|"$/g,'').trim().replace(/\./g,'').replace(/,.*$/,'');
        const k=id||_norm(nombre);
        const entrada={
          nombre:nombre,
          cantidades:_parseCantidades((cols[1]||'').replace(/^"|"$/g,'').trim()),
          info:(cols[2]||'').replace(/^"|"$/g,'').trim(),
          sabores:_parseCantidades((cols[3]||'').replace(/^"|"$/g,'').trim()),
          imagen:_driveToImg((cols[4]||'').replace(/^"|"$/g,'').trim()),
          mix:/^si$/i.test((cols[5]||'').replace(/^"|"$/g,'').trim()),
          oferta:parseInt((cols[7]||'').replace(/^"|"$/g,'').trim().replace('%',''))||0
        };
        mapa[k]=entrada;
        if(id&&_norm(nombre)!==id)mapa[_norm(nombre)]=entrada;
      });
      console.log(`📘 Info: ${Object.keys(mapa).length} entradas cargadas`);
      resolve(mapa);
    }
    // La copia local se actualiza automáticamente desde GitHub Actions y permite
    // dibujar las cards sin esperar a Google Sheets. Luego se revalida en segundo plano.
    if(!useSnapshot&&(!INFO_CSV_URL||INFO_CSV_URL.indexOf('REEMPLAZAR')>=0)){console.warn('ℹ️ Hoja Info no configurada aún');resolve({});return;}
    const infoUrl=useSnapshot?'info-min.csv':INFO_CSV_URL+'&t='+Date.now();
    fetch(infoUrl,{cache:useSnapshot?'default':'no-store'})
      .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}).then(csv=>_procesar(csv))
      .catch(err=>{console.warn('⚠️ Error cargando Info:',err);resolve({});});
  });
}

function _hydrateMinCatalog(data,source){
  if(!data||!Array.isArray(data.prods)||!data.prods.length||!Array.isArray(data.cats)||!data.cats.length)return false;
  CATS=data.cats;
  PRODS=data.prods;
  // Las fotos se ven a ~159px de ancho: pedirlas a 320 (el doble, para pantallas retina)
  // pesa la mitad que a 500. El catálogo preparado las trae a 500, así que se ajusta acá
  // y no en el archivo, para que siga valiendo cada vez que se regenere.
  for(var _i=0;_i<PRODS.length;_i++){
    var _u=PRODS[_i][6];
    if(_u&&_u.indexOf('/w_500/')>-1)PRODS[_i][6]=_u.replace('/w_500/','/w_320/');
  }
  _MIN_BY_ID=null;
  _markCatalogReady();
  renderCatsUI();
  renderCarruseles();
  if(searchTerm)_doSearch(searchTerm);
  hideLoader();
  console.log('⚡ Paladear: catálogo desde '+source+' ('+PRODS.length+' productos)');
  return true;
}

function sincronizarDesdeSheets(){
  // Stale-while-revalidate: hidratar UI desde cache local para render instantáneo
  let _cacheReady=false;
  try {
    const raw = localStorage.getItem('paladear_min_v1');
    if (raw) {
      const data = JSON.parse(raw);
      if (_hydrateMinCatalog(data,'cache')) {
        _cacheReady=true;
      }
    }
  } catch(e) {}
  function _refreshFromSheets(useSnapshot){
    useSnapshot=!!useSnapshot;
    _cargarInfo(useSnapshot).then(INFO=>{

    function _procesarCSV(csv){
      const filas=_parseCSV(csv);
      const catMap={},prodsTemp=[];let pid=1;
      filas.forEach((cols,idx)=>{
        if(idx===0||cols.length<6)return;
        const nombre=cols[2].replace(/^"|"$/g,'');
        const p1=_precio(cols[3]),p2=_precio(cols[4]);
        const rubro=(cols[5]||'').replace(/^"|"$/g,'').trim().toUpperCase();
        const productId=(cols[6]||'').replace(/^"|"$/g,'').trim().replace(/\./g,'').replace(/,.*$/,'');
        const imgPrecios=_driveToImg((cols[7]||'').replace(/^"|"$/g,'').trim());
        if(!nombre||!p1||!p2||!rubro)return;
        const cat=RUBRO_MAP[rubro];if(!cat)return;
        if(!catMap[cat.id])catMap[cat.id]=cat;
        const inf=INFO[productId]||INFO[_norm(nombre)]||{};
        const nombreFinal=inf.nombre||nombre;
        const _infCants=inf.cantidades||[];
        const esKgInfo=_infCants.some(o=>/g$|kg$/i.test(o.replace(/\s+/g,'')));
        const esKgNombre=/x kg|xkg|x 1 kg| kg/i.test(nombre);
        const esKg=_infCants.length?esKgInfo:esKgNombre;
        const esEspecia=['especias','infusiones'].includes(cat.id);
        const imgUrl=(inf.imagen||imgPrecios)?_prodImg(productId,320):'';
        const infoText=inf.info||'';
        const sabores=inf.sabores||null;
        let opts;
        if(inf.cantidades&&inf.cantidades.length){
          opts={};
          inf.cantidades.forEach(opc=>{opts[opc]=_calcPrecioOpc(opc,p1,p2,esKg)});
        } else if(esKg&&esEspecia){
          opts={'100g':[Math.round(p1*.1),Math.round(p2*.1)],'500g':[Math.round(p1*.5),Math.round(p2*.5)],'1 kg':[p1,p2]};
        } else if(esKg){
          opts={'500g':[Math.round(p1*.5),Math.round(p2*.5)],'1 kg':[p1,p2]};
        } else {
          opts={'1 und':[p1,p2]};
        }
        const esMix=inf.mix===true;const esGranola=inf.granola===true;
        const ofertaPct=inf.oferta||0;
        prodsTemp.push([pid++,cat.id,nombreFinal,esKg?'Granel':'Varios',esKg?'kg':'und',false,imgUrl,opts,infoText,sabores,esMix,esGranola,{productId,oferta:ofertaPct}]);
      });
      CATS=Object.keys(RUBRO_MAP).filter(k=>catMap[RUBRO_MAP[k].id]).map(k=>RUBRO_MAP[k]);
      PRODS=prodsTemp;
      _MIN_BY_ID=null;
      _markCatalogReady();
      // Guardar en localStorage para hidratación instantánea en próxima visita
      try{localStorage.setItem('paladear_min_v1',JSON.stringify({cats:CATS,prods:PRODS,ts:Date.now()}));}catch(e){}
      console.log(`✅ Paladear: ${PRODS.length} productos, ${CATS.length} categorías`);
      renderCatsUI();
      renderCarruseles();
      if(searchTerm)_doSearch(searchTerm);
      hideLoader();
      // Cargar recetas en background (no bloquea la UI)
      if (!useSnapshot && typeof cargarRecetas === 'function') {
        setTimeout(function(){
          _palAfterLoadIdle(function(){
            cargarRecetas().then(function() {
              // Re-render del catálogo si hay recetas (para mostrar badges)
              if (RECETAS && RECETAS.length && typeof renderCatsUI === 'function') {
                renderCatsUI();
                if (activeCatId && typeof selectCat === 'function') selectCat(activeCatId);
              }
            });
          },5000);
        },6000);
      }
    }

    // Primera visita: usar el snapshot local cacheable para mostrar las cards enseguida.
    if(useSnapshot){
      fetch('precios-min.csv',{cache:'default'})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})
        .then(function(csv){
          _procesarCSV(csv);
          _palAfterLoadIdle(function(){_refreshFromSheets(false);},4500);
        })
        .catch(function(err){
          console.warn('⚠️ Snapshot local no disponible:',err);
          _refreshFromSheets(false);
        });
      return;
    }

    // Revalidación: cargar directamente desde Apps Script JSONP (referencia la hoja por nombre, no GID)
    window.recibirPrecios=function(csv){
      try { _procesarCSV(csv); }
      catch(e){ console.warn('⚠️ Error procesando CSV:',e); hideLoader(); }
    };
    let _retried=false;
    function _cargarScript(){
      const s=document.createElement('script');
      s.async=true;
      s.onerror=()=>{
        if(!_retried){
          _retried=true;
          console.warn('⚠️ Error cargando Sheet, reintentando en 3s...');
          setTimeout(_cargarScript,3000);
        } else {
          console.warn('⚠️ Error cargando Sheet tras reintento');
          renderCatsUI();renderCarruseles();hideLoader();
        }
      };
      s.src=APPS_SCRIPT_URL+'?callback=recibirPrecios&t='+Date.now()+'&v='+Math.random().toString(36).slice(2);
      document.head.appendChild(s);
    }
    _cargarScript();
    });
  }
  // Con caché la tienda ya está utilizable: actualizar precios cuando el arranque quede libre.
  if(_cacheReady){
    _palAfterLoadIdle(function(){_refreshFromSheets(false);},4500);
  }else{
    fetch('catalog-min.json',{cache:'default'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(data){
        if(!_hydrateMinCatalog(data,'snapshot local'))throw new Error('Snapshot inválido');
        try{localStorage.setItem('paladear_min_v1',JSON.stringify(data));}catch(e){}
        _palAfterLoadIdle(function(){_refreshFromSheets(false);},4500);
      })
      .catch(function(err){
        console.warn('⚠️ Catálogo preparado no disponible:',err);
        _refreshFromSheets(true);
      });
  }
}
let _catalogSyncStarted=false;
function _ensureCatalogSync(){
  if(_catalogSyncStarted)return;
  _catalogSyncStarted=true;
  sincronizarDesdeSheets();
}
if(_palNeedsCatalogAtStart())_ensureCatalogSync();
else{
  // Home es estático: catálogo y precios se preparan cuando ya terminó la carga visible.
  hideLoader();
  _palAfterLoadIdle(_ensureCatalogSync,3500);
}

// ── HISTORIAL REAL DE VISTAS + BOTÓN "ATRÁS" ──
// Cada pestaña/categoría ocupa una entrada real. Los overlays agregan una entrada
// encima, de modo que Atrás primero los cierra y luego vuelve a la vista anterior.
var _palHistoryApplying=false;
try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch(e){}
if(!history.state||!history.state.paladear){
  history.replaceState({paladear:true,view:'tab',tab:document.body.classList.contains('hv-home')?'home':'minorista',scrollY:0},'');
}

function _palVisibleTab(){
  if(document.body.classList.contains('hv-home'))return 'home';
  if(document.body.classList.contains('hv-ofertas'))return 'ofertas';
  if(document.body.classList.contains('hv-favoritos'))return 'favoritos';
  return (typeof currentTab!=='undefined'&&currentTab)?currentTab:'minorista';
}
function _palBuildPageState(extra){
  var tab=_palVisibleTab();
  var st={paladear:true,view:'tab',tab:tab,scrollY:Math.max(0,Math.round(window.scrollY||window.pageYOffset||0))};
  if(tab==='minorista'&&typeof activeCatId!=='undefined'&&activeCatId){st.view='cat';st.catId=activeCatId;}
  if(tab==='mayorista'&&typeof activeCatIdMay!=='undefined'&&activeCatIdMay){st.view='catMay';st.catId=activeCatIdMay;}
  if(extra)Object.assign(st,extra);
  return st;
}
function _palReplacePageState(){
  if(_palHistoryApplying)return;
  try{history.replaceState(_palBuildPageState(),'');}catch(e){}
}
function _palPushPageState(extra){
  if(_palHistoryApplying)return;
  try{history.pushState(_palBuildPageState(extra),'');}catch(e){}
}
function _palPushOverlay(view,extra){
  if(_palHistoryApplying)return;
  try{
    var cur=history.state||{};
    if(cur.view==='tab'||cur.view==='cat'||cur.view==='catMay'||!cur.paladear)_palReplacePageState();
    history.pushState(Object.assign({paladear:true,view:view,tab:_palVisibleTab()},extra||{}),'');
  }catch(e){}
}
function _palRestoreScroll(y){
  y=Math.max(0,parseInt(y,10)||0);
  [60,220,600,1200,2200].forEach(function(ms){setTimeout(function(){window.scrollTo(0,y);},ms);});
}
function _palCloseTopLayer(){
  if(_searchOverlayOpen){cerrarBusqueda();return true;}
  var el=document.getElementById('inspLightbox');
  if(el&&!el.classList.contains('hidden')){cerrarLightbox();return true;}
  el=document.getElementById('recetaProdOverlay');
  if(el&&!el.classList.contains('hidden')){cerrarProductoReceta();var rm=document.getElementById('recetaModalOverlay');if(rm&&!rm.classList.contains('hidden'))document.body.style.overflow='hidden';return true;}
  el=document.getElementById('recetaModalOverlay');
  if(el&&!el.classList.contains('hidden')){cerrarRecetaModal();return true;}
  el=document.getElementById('checkoutOverlay');
  if(el&&!el.classList.contains('hidden')){cerrarCheckout();return true;}
  el=document.getElementById('cuentaPedidoModal');
  if(el&&el.classList.contains('open')){_cuentaCerrarPedido();return true;}
  el=document.getElementById('mixModal');
  if(el&&!el.classList.contains('hidden')){closeMix();return true;}
  el=document.getElementById('granolaModal');
  if(el&&!el.classList.contains('hidden')){closeGranola();return true;}
  el=document.getElementById('blendModal');
  if(el&&!el.classList.contains('hidden')){closeBlend();return true;}
  el=document.getElementById('catsDropdownPanel');
  if(el&&el.style.display!=='none'){closeCatsDropdown();return true;}
  el=document.getElementById('mayCatsDropdownPanel');
  if(el&&el.style.display!=='none'){closeMayCatsDropdown();return true;}
  el=document.getElementById('cartPanel');
  if(el&&el.classList.contains('open')){closeCart();return true;}
  el=document.getElementById('cartPanelMay');
  if(el&&el.classList.contains('open')){closeCartMay();return true;}
  el=document.getElementById('cuentaPanel');
  if(el&&el.classList.contains('open')){closeCuenta();return true;}
  el=document.getElementById('infoModal');
  if(el){el.remove();return true;}
  return false;
}
function _palApplyHistoryState(st,done){
  st=st||{};
  var tab=st.tab;
  if(!tab){
    if(st.view==='home')tab='home';
    else if(st.view==='wishlist')tab='favoritos';
    else if(st.view==='ofertasMes')tab='ofertas';
    else if(st.view==='cat')tab='minorista';
    else if(st.view==='catMay')tab='mayorista';
  }
  if(!tab){done();return;}
  window.switchTab(tab);
  var catId=(st.view==='cat'||st.view==='catMay')?st.catId:null;
  if(catId){
    var tries=0;
    var wait=setInterval(function(){
      tries++;
      var ready=tab==='mayorista'?(typeof PRODS_MAY!=='undefined'&&PRODS_MAY.length):(typeof PRODS!=='undefined'&&PRODS.length);
      if(ready||tries>80){
        clearInterval(wait);
        if(ready){if(tab==='mayorista')selectMayCat(catId,null,{history:false});else selectCat(catId,null,{history:false});}
        _palRestoreScroll(st.scrollY);
        done();
      }
    },100);
    return;
  }
  _palRestoreScroll(st.scrollY);
  done();
}

window.addEventListener('popstate',function(e){
  _palHistoryApplying=true;
  if(_palCloseTopLayer()){
    setTimeout(function(){_palHistoryApplying=false;if(typeof _saveAppState==='function')_saveAppState();},0);
    return;
  }
  _palApplyHistoryState(e.state,function(){
    setTimeout(function(){_palHistoryApplying=false;if(typeof _saveAppState==='function')_saveAppState();},0);
  });
});

// ═══ PERSISTENCIA DE ESTADO (sobrevive al reload) ═══

let _saveStateTimer = null;
function _appStateSnapshot(){
  var tab=_palVisibleTab();
  return {
    tab: tab,
    catMin: tab==='minorista'?(activeCatId||null):null,
    catMay: tab==='mayorista'?(activeCatIdMay||null):null,
    ofertasMes: tab==='ofertas'&&(_activeOfertasMes||false),
    scrollY: Math.max(0,Math.round(window.scrollY||window.pageYOffset||0)),
    ts: Date.now()
  };
}
function _writeAppState(syncHistory){
  try{sessionStorage.setItem('paladear_view_state',JSON.stringify(_appStateSnapshot()));}catch(e){}
  if(syncHistory&&!_palHistoryApplying){
    var st=history.state||{};
    if(st.view==='tab'||st.view==='cat'||st.view==='catMay'||!st.paladear)_palReplacePageState();
  }
}
function _saveAppState() {
  // Debounce: guardar máximo cada 200ms
  if (_saveStateTimer) clearTimeout(_saveStateTimer);
  _saveStateTimer = setTimeout(function(){_writeAppState(true);},200);
}

// Guardar scroll periódicamente (debounced)
let _scrollSaveTimer = null;
window.addEventListener('scroll', function() {
  if (_scrollSaveTimer) clearTimeout(_scrollSaveTimer);
  _scrollSaveTimer = setTimeout(_saveAppState, 500);
}, { passive: true });

// Guardar antes de descargar la página (último intento)
window.addEventListener('beforeunload',function(){_writeAppState(true);});
window.addEventListener('pagehide',function(){_writeAppState(true);});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')_writeAppState(false);});

function _restoreAppState() {
  _palHistoryApplying=true;
  let state;
  try {
    const raw = sessionStorage.getItem('paladear_view_state');
    if (!raw) {_palHistoryApplying=false;_palReplacePageState();return;}
    state = JSON.parse(raw);
    // Solo restaurar si el estado es reciente (menos de 30 minutos)
    if (!state || Date.now() - state.ts > 30 * 60 * 1000) {
      sessionStorage.removeItem('paladear_view_state');
      _palHistoryApplying=false;_palReplacePageState();return;
    }
  } catch(e) {_palHistoryApplying=false;return;}

  function _finishRestore(){
    setTimeout(function(){
      _palHistoryApplying=false;
      _writeAppState(true);
    },2300);
  }

  function _restoreScroll() {
    if (state.scrollY > 0) {
      // Múltiples intentos porque el layout puede seguir reacomodándose
      setTimeout(() => window.scrollTo(0, state.scrollY), 100);
      setTimeout(() => window.scrollTo(0, state.scrollY), 350);
      setTimeout(() => window.scrollTo(0, state.scrollY), 800);
    }
  }

  if (state.tab === 'mayorista') {
    // Cambiar a mayorista, esperar productos, restaurar categoría
    switchTab('mayorista');
    let intentos = 0;
    const waitMay = setInterval(function() {
      intentos++;
      if (PRODS_MAY && PRODS_MAY.length) {
        clearInterval(waitMay);
        if (state.catMay) {
          selectMayCat(state.catMay,null,{history:false});
        }
        _restoreScroll();
        _finishRestore();
      } else if (intentos > 80) { // ~8s timeout
        clearInterval(waitMay);
        _restoreScroll();
        _finishRestore();
      }
    }, 100);
  } else {
    // Restaurar la pestaña (con Home como default del tester, hay que volver explícitamente)
    if (state.tab === 'home' || state.tab === 'minorista' || state.tab === 'recetas' || state.tab === 'ofertas' || state.tab === 'favoritos') window.switchTab(state.tab);
    // Minorista: esperar a que PRODS esté listo
    let intentos = 0;
    const waitMin = setInterval(function() {
      intentos++;
      if (PRODS && PRODS.length) {
        clearInterval(waitMin);
        if (state.tab==='ofertas'&&state.ofertasMes) {
          selectOfertasMes();
        } else if (state.tab==='minorista'&&state.catMin) {
          selectCat(state.catMin,null,{history:false});
        }
        _restoreScroll();
        _finishRestore();
      } else if (intentos > 80) {
        clearInterval(waitMin);
        _restoreScroll();
        _finishRestore();
      }
    }, 100);
  }
}

// Llamar al restaurar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _restoreAppState);
} else {
  setTimeout(_restoreAppState, 100);
}

/* ── MIX BUILDER ── */
const MIX_SIZES=[{g:500,lbl:'500 g'},{g:1000,lbl:'1 kg'},{g:2000,lbl:'2 kg'},{g:5000,lbl:'5 kg'}];
let mixSelSize=null,mixActiveCat=null,mixIngreds={},mixCounter=0,mixEditKey=null,mixEditLabel=null,granolaEditKey=null,granolaEditLabel=null;

function openMix(){
  document.getElementById('mixModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
  document.body.classList.add('builder-open');
  mixRenderSizes();
  if(!mixActiveCat&&PRODS.length){
    const granel=PRODS.filter(p=>p[4]==='kg');
    const cats=new Set(granel.map(p=>p[1]));
    const order=['frutos','semillas','deshidratados','cereales','granos','harinas'];
    mixActiveCat=order.find(c=>cats.has(c))||[...cats][0]||null;
  }
  mixRenderCatTabs();mixRenderProdList();
  _palPushOverlay('mix');
}
function closeMix(){
  document.getElementById('mixModal').classList.add('hidden');
  document.body.style.overflow='';
  document.body.classList.remove('builder-open');
  // reset state so next open starts fresh
  mixSelSize=null;mixIngreds={};mixActiveCat=null;
  document.getElementById('mixBuilderArea').style.display='none';
  mixRenderSizes();
}

function mixRenderSizes(){
  document.getElementById('mixSizes').innerHTML=MIX_SIZES.map(s=>
    `<button class="mix-size-btn${mixSelSize&&mixSelSize.g===s.g?' sel':''}" onclick="mixPickSize(${s.g})">
      <strong>${s.lbl}</strong><span>bolsón</span>
    </button>`
  ).join('');
}

function mixPickSize(g){
  mixSelSize=MIX_SIZES.find(s=>s.g===g);
  mixIngreds={};
  // Asegurar que el primer rubro esté seleccionado para que la lista aparezca con productos
  const cats=mixGranelCats();
  if(cats.length) mixActiveCat=cats[0].id;
  document.getElementById('mixBuilderArea').style.display='block';
  mixRenderSizes();mixRenderCatTabs();mixRenderProdList();mixRenderSummary();
  // Scrollear suavemente al paso 2 para que el usuario vea inmediatamente la lista de productos
  setTimeout(function(){
    var area=document.getElementById('mixBuilderArea');
    var modal=document.getElementById('mixModal');
    var scrollEl=modal.querySelector('.mix-modal-body')||modal;
    if(area && scrollEl){
      var top=area.getBoundingClientRect().top-scrollEl.getBoundingClientRect().top+scrollEl.scrollTop-8;
      scrollEl.scrollTo({top:top,behavior:'smooth'});
    }
  },120);
}

const MIX_ALLOWED_CATS=['frutos','semillas','deshidratados'];
function mixGranelProds(){return PRODS.filter(p=>p[4]==='kg'&&p[10]===true&&MIX_ALLOWED_CATS.includes(p[1]));}
function mixGranelCats(){
  const catIds=[...new Set(mixGranelProds().map(p=>p[1]))];
  return CATS.filter(c=>catIds.includes(c.id));
}

function mixRenderCatTabs(){
  const cats=mixGranelCats();
  if(!mixActiveCat&&cats.length)mixActiveCat=cats[0].id;
  const palette=['#4d7d8a','#3a6370','#6e9aa6','#5a8f9e'];
  document.getElementById('mixCatTabs').innerHTML=cats.map((c,i)=>
    `<button class="mix-cat-tab${mixActiveCat===c.id?' active':''}" style="--tab-color:${palette[i%4]}" onclick="mixSetCat('${c.id}')">${c.n}</button>`
  ).join('');
}

function mixSetCat(id){mixActiveCat=id;mixRenderCatTabs();mixRenderProdList();}
window._scrollMixProductoTop=function(catId,pid){
  if(mixActiveCat!==catId){mixSetCat(catId);}
  setTimeout(function(){
    var btn=document.querySelector('.prod-step-btn[onclick*="mixIncProd('+pid+',"]');
    if(!btn)return;
    var row=btn.closest('.mix-prod-row');
    if(!row)return;
    var list=document.getElementById('mixProdList');
    // En desktop: list tiene overflow propio. En mobile: scrollea el modal entero.
    var listScrollable=list && list.scrollHeight>list.clientHeight;
    if(listScrollable){
      list.scrollTo({top:row.offsetTop-list.offsetTop,behavior:'smooth'});
    }else{
      // Scrollear el modal/page; calcular offset por la mini progress sticky
      var miniBar=document.getElementById('mixMiniProgress');
      var miniH=miniBar && getComputedStyle(miniBar).display!=='none'?miniBar.offsetHeight:0;
      var headerH=document.querySelector('#mixModal .mix-modal-header').offsetHeight;
      var modal=document.getElementById('mixModal');
      var scrollEl=modal.querySelector('.mix-modal-body')||modal;
      var top=row.getBoundingClientRect().top-scrollEl.getBoundingClientRect().top+scrollEl.scrollTop-(headerH+miniH+8);
      scrollEl.scrollTo({top:top,behavior:'smooth'});
    }
    // Highlight breve para indicar dónde quedó
    row.style.transition='background .3s';
    row.style.background='rgba(122,79,42,.12)';
    setTimeout(function(){row.style.background='';},900);
  },80);
};

function _mixQuickNav(){
  const ings=Object.entries(mixIngreds).filter(([,v])=>v&&v.g>0);
  const el=document.getElementById('mixQuickNav');
  if(!el)return;
  if(!ings.length){el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML='<button class="qn-toggle" onclick="this.parentNode.classList.toggle(\'open\')">📋 Mis ingredientes <span class="qn-count">'+ings.length+'</span><span class="qn-arrow">▼</span></button>'+
    '<div class="qn-list">'+ings.map(([pid,v])=>{
      const p=PRODS.find(x=>x[0]===+pid);if(!p)return'';
      return`<div class="ing-qn-row">
        <span class="ing-qn-name">${_capName(p[2])}</span>
        <span class="ing-qn-g">${_gLabel(v.g)}</span>
        <button class="ing-qn-btn" onclick="_scrollMixProductoTop('${p[1]}',${p[0]})">Ver</button>
      </div>`;
    }).join('')+'</div>';
}
function mixRenderProdList(){
  if(!mixSelSize){document.getElementById('mixProdList').innerHTML='<div style="padding:16px;font-size:13px;color:var(--muted-fg);text-align:center">Elegí primero el tamaño del bolsón</div>';_mixQuickNav();return;}
  const prods=mixGranelProds().filter(p=>p[1]===mixActiveCat);
  const usedG=Object.values(mixIngreds).reduce((a,v)=>a+(v.g||0),0);
  document.getElementById('mixProdList').innerHTML=prods.map(p=>{
    const pxkg=_precioKg(p,0);
    const cur=(mixIngreds[p[0]]&&mixIngreds[p[0]].g)||0;
    const isOver=usedG>mixSelSize.g;
    const canAdd=usedG<mixSelSize.g;
    return`<div class="mix-prod-row${cur>0?' has-trash is-sel':''}">
      <div class="mix-prod-name">${_capName(p[2])}</div>
      <div class="mix-prod-price">$${fmt(pxkg)}/kg</div>
      <div class="prod-stepper${isOver?' over':''}">
        <button class="prod-step-btn" ${cur<=0?'disabled':''} onclick="mixDecProd(${p[0]},${pxkg})" aria-label="Restar 100g">−</button>
        <span class="prod-step-val">${cur ? cur+' g' : '0 g'}</span>
        <button class="prod-step-btn" ${!canAdd?'disabled':''} onclick="mixIncProd(${p[0]},${pxkg})" aria-label="Sumar 100g">+</button>
      </div>
      ${cur>0?`<button class="prod-trash-btn" onclick="mixRemoveProd(${p[0]})" aria-label="Quitar" title="Quitar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>`:''}
    </div>`;
  }).join('');
  if(!prods.length)document.getElementById('mixProdList').innerHTML='<div style="padding:16px;font-size:13px;color:var(--muted-fg);text-align:center">No hay productos a granel en esta categoría</div>';
  _mixQuickNav();
}

function mixRemoveProd(pid){delete mixIngreds[pid];mixRenderProdList();mixRenderSummary();}
function granolaRemoveProd(pid){delete granolaIngreds[pid];granolaRenderProdList();granolaRenderSummary();}
function mixIncProd(pid,pxkg){
  if(!mixSelSize)return;
  const cur=(mixIngreds[pid]&&mixIngreds[pid].g)||0;
  const usedG=Object.values(mixIngreds).reduce((a,v)=>a+(v.g||0),0);
  const remG=mixSelSize.g-usedG;
  if(remG<=0)return;
  const newG=cur+Math.min(100,remG);
  mixIngreds[pid]={g:newG,pxkg};
  mixRenderProdList();mixRenderSummary();
}
function mixDecProd(pid,pxkg){
  const cur=(mixIngreds[pid]&&mixIngreds[pid].g)||0;
  if(cur<=100){delete mixIngreds[pid];}
  else{mixIngreds[pid]={g:cur-100,pxkg};}
  mixRenderProdList();mixRenderSummary();
}
function granolaIncProd(pid,pxkg){
  if(!granolaSelSize)return;
  const cur=(granolaIngreds[pid]&&granolaIngreds[pid].g)||0;
  const usedG=Object.values(granolaIngreds).reduce((a,v)=>a+(v.g||0),0);
  const remG=granolaSelSize.g-usedG;
  if(remG<=0)return;
  const newG=cur+Math.min(100,remG);
  granolaIngreds[pid]={g:newG,pxkg};
  granolaRenderProdList();granolaRenderSummary();
}
function granolaDecProd(pid,pxkg){
  const cur=(granolaIngreds[pid]&&granolaIngreds[pid].g)||0;
  if(cur<=100){delete granolaIngreds[pid];}
  else{granolaIngreds[pid]={g:cur-100,pxkg};}
  granolaRenderProdList();granolaRenderSummary();
}
window.mixIncProd=mixIncProd;window.mixDecProd=mixDecProd;
window.granolaIncProd=granolaIncProd;window.granolaDecProd=granolaDecProd;
function mixGLabel(g){return g>=1000?(g%1000===0?(g/1000)+' kg':(g/1000).toFixed(1)+' kg'):g+' g'}
function _capName(s){return (s||'').toLowerCase().replace(/(^|\s|\-|\/)([a-záéíóúñ])/g,(m,p,c)=>p+c.toUpperCase());}
function _builderFinalStep(stepId,ready){
  const step=document.getElementById(stepId);
  if(step)step.classList.toggle('ready',!!ready);
}
function _scrollBuilderToBottom(modalId){
  const modal=document.getElementById(modalId);if(!modal)return;
  const scrollEl=modal.querySelector('.mix-modal-body,.granola-modal-body,.blend-modal-body')||modal;
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){scrollEl.scrollTo({top:scrollEl.scrollHeight,behavior:'smooth'});});
  });
}

function mixRenderSummary(){
  if(!mixSelSize)return;
  const ings=Object.entries(mixIngreds).filter(([,v])=>v&&v.g>0);
  const usedG=ings.reduce((a,[,v])=>a+v.g,0);
  const pct=Math.min(100,(usedG/mixSelSize.g)*100);
  const full=usedG===mixSelSize.g;
  const over=usedG>mixSelSize.g;
  _builderFinalStep('mixStep3',full&&ings.length>0);
  const fillColor=over?'#e8633a':full?'#16a34a':'var(--azul)';
  document.getElementById('mixFillFill').style.cssText=`width:${pct}%;background:${fillColor}`;
  document.getElementById('mixFillLbl').textContent=mixGLabel(usedG)+' / '+mixGLabel(mixSelSize.g);
  document.getElementById('mixSumHead').textContent='Tu bolsón de '+mixGLabel(mixSelSize.g);
  // Mini progress bar (sticky en top del modal): se muestra al elegir tamaño y oculta al completar
  var mp=document.getElementById('mixMiniProgress');
  var mf=document.getElementById('mixMiniFill');
  var ml=document.getElementById('mixMiniLbl');
  var mt=document.getElementById('mixMiniTotal');
  if(mf){mf.style.cssText='width:'+pct+'%;background:'+fillColor;}
  if(ml){ml.textContent=mixGLabel(usedG)+' / '+mixGLabel(mixSelSize.g);}
  const hint=document.getElementById('mixFillHint');
  const rem=mixSelSize.g-usedG;
  if(over){hint.textContent='⚠ Excedés por '+mixGLabel(usedG-mixSelSize.g);hint.style.color='#e8633a';}
  else if(full){hint.textContent='✓ Bolsón completo';hint.style.color='#16a34a';}
  else{hint.textContent='Faltan '+mixGLabel(rem);hint.style.color='var(--muted-fg)';}

  // ingredient list
  const ingEl=document.getElementById('mixIngList');
  if(!ings.length){ingEl.innerHTML='<div style="padding:10px 0;font-size:13px;color:var(--muted-fg);text-align:center">Aún vacío</div>';
  }else{
    ingEl.innerHTML=ings.map(([pid,v])=>{
      const p=PRODS.find(x=>x[0]===+pid);
      const sub=Math.round(v.pxkg*(v.g/1000));
      return`<div class="mix-ing-row"><span class="mix-ing-name">${p?_capName(p[2]):'?'}</span><span class="mix-ing-detail">${mixGLabel(v.g)} · $${fmt(sub)}</span></div>`;
    }).join('');
  }
  const total=ings.reduce((a,[,v])=>a+Math.round(v.pxkg*(v.g/1000)),0);
  document.getElementById('mixIngCount').textContent=ings.length;
  document.getElementById('mixTotal').textContent='$'+fmt(total);
  if(mt) mt.textContent='$'+fmt(total);
  const btn=document.getElementById('mixAddBtn');
  if(full&&ings.length>0){
    btn.disabled=false;btn.textContent='🛒 Agregar mix al carrito';
    // Bolsón completo: ocultar mini bar y scrollear al botón de agregar
    if(mp){mp.style.display='none';}
    setTimeout(function(){_scrollBuilderToBottom('mixModal');},100);
  }
  else if(over){
    btn.disabled=true;btn.textContent='Excedés el peso del bolsón';
    if(mp){mp.style.display='flex';}
  }
  else{
    btn.disabled=true;btn.textContent=ings.length?'Faltan '+mixGLabel(rem):'Agregar a tu carrito';
    if(mp){mp.style.display='flex';}
  }
}

function mixAgregarAlCarrito(){
  if(!mixSelSize)return;
  const ings=Object.entries(mixIngreds).filter(([,v])=>v&&v.g>0);
  const usedG=ings.reduce((a,[,v])=>a+v.g,0);
  if(usedG!==mixSelSize.g)return;
  // Cada mix es un item único en el carrito identificado por un número correlativo
  let mixId,mixLabel;
  if(mixEditKey){mixId=mixEditKey;mixLabel=mixEditLabel;mixEditKey=null;mixEditLabel=null;}
  else{mixCounter++;mixId='mix'+mixCounter;mixLabel='Mix #'+mixCounter+' ('+_gLabel(mixSelSize.g)+')';}
  // Construir detalle de ingredientes
  const ingDetails=ings.map(([pid,v])=>{
    const p=PRODS.find(x=>x[0]===+pid);
    return p?p[2]+' '+_gLabel(v.g):'?';
  }).join(', ');
  // Calcular precio total del mix (suma proporcional de cada ingrediente)
  const totalL1=ings.reduce((a,[pid,v])=>{
    const p=PRODS.find(x=>x[0]===+pid);if(!p)return a;
    return a+Math.round(_precioKg(p,0)*(v.g/1000));
  },0);
  const totalL2=ings.reduce((a,[pid,v])=>{
    const p=PRODS.find(x=>x[0]===+pid);if(!p)return a;
    return a+Math.round(_precioKg(p,1)*(v.g/1000));
  },0);
  // Un solo item en el carrito representando el mix completo
  cart.push({
    key:mixId,
    pid:-1,
    n:mixLabel,
    o:mixId,
    totalG:mixSelSize.g,
    unidad:'mix',
    sabor:'',
    l1:totalL1,
    l2:totalL2,
    mixDetalle:ingDetails,
    mixIngreds:ings.map(([pid,v])=>({pid:+pid,g:v.g}))
  });
  updateCartCount();
  mixIngreds={};mixSelSize=null;
  closeMix();
  const fab=document.getElementById('cart-fab');
  if(fab){fab.style.transform='scale(1.25)';setTimeout(()=>{fab.style.transform='';},400);}
  if(window.innerWidth>=768)openCart();
}


/* ── BANNER CAROUSEL (mobile swipe + auto-slide) ── */
let _bannerCur=0,_bannerTimer=null;
function goSlide(i,smooth){
  const track=document.getElementById('bannersTrack');
  if(!track||window.innerWidth>=600)return;
  _bannerCur=Math.max(0,Math.min(i,1));
  track.style.transition=smooth===false?'none':'transform .35s cubic-bezier(.4,0,.2,1)';
  track.style.transform='translateX(-'+(_bannerCur*100)+'%)';
}
function _startBannerTimer(){
  if(_bannerTimer)clearInterval(_bannerTimer);
  _bannerTimer=setInterval(()=>{
    if(window.innerWidth>=600)return;
    goSlide((_bannerCur+1)%2);
  },7000);
}
// Touch swipe
(function _initBannerSwipe(){
  let tx0=0,ty0=0,dragging=false,startCur=0;
  function onStart(e){
    const t=e.touches?e.touches[0]:e;
    tx0=t.clientX;ty0=t.clientY;dragging=true;startCur=_bannerCur;
    const track=document.getElementById('bannersTrack');
    if(track)track.style.transition='none';
    if(_bannerTimer)clearInterval(_bannerTimer);
  }
  function onMove(e){
    if(!dragging)return;
    const t=e.touches?e.touches[0]:e;
    const dx=t.clientX-tx0,dy=t.clientY-ty0;
    if(Math.abs(dy)>Math.abs(dx)+8){dragging=false;return;} // scroll vertical → no interferir
    e.preventDefault();
    const track=document.getElementById('bannersTrack');
    if(!track||window.innerWidth>=600)return;
    const pct=startCur*100-(dx/track.parentElement.offsetWidth*100);
    track.style.transform='translateX(-'+Math.max(0,Math.min(100,pct))+'%)';
  }
  function onEnd(e){
    if(!dragging)return;
    dragging=false;
    const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-tx0;
    const THRESHOLD=40;
    if(dx<-THRESHOLD)goSlide(startCur+1);
    else if(dx>THRESHOLD)goSlide(startCur-1);
    else goSlide(startCur); // snap back
    _startBannerTimer();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    _startBannerTimer();
    const wrap=document.getElementById('bannersTrackWrap');
    if(!wrap)return;
    wrap.addEventListener('touchstart',onStart,{passive:true});
    wrap.addEventListener('touchmove',onMove,{passive:false});
    wrap.addEventListener('touchend',onEnd,{passive:true});
    document.getElementById('cartCount').textContent=cart.length;
    const btt=document.getElementById('backToTop');
    window.addEventListener('scroll',()=>{btt.classList.toggle('visible',window.scrollY>400);},{passive:true});
  });
})();
window.addEventListener('resize',()=>{
  if(window.innerWidth>=600){
    const track=document.getElementById('bannersTrack');
    if(track)track.style.transform='';
  }
});

/* Las animaciones viejas de íconos mix/granola (mixIconSvg/granolaIconSvg) se
   eliminaron: esos elementos ya no existen (ahora se usan los sprites CSS de los
   banners). El código viejo reintentaba encontrarlos cada 300ms para siempre. */

/* ── GRANOLA BUILDER ── */
const GRANOLA_SIZES=[{g:500,lbl:'500 g'},{g:1000,lbl:'1 kg'},{g:2000,lbl:'2 kg'},{g:5000,lbl:'5 kg'}];
let granolaSelSize=null,granolaActiveCat=null,granolaIngreds={},granolaCounter=0;

function openGranola(){
  document.getElementById('granolaModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
  document.body.classList.add('builder-open');
  granolaRenderSizes();
  if(!granolaActiveCat&&PRODS.length){
    const granel=PRODS.filter(p=>p[4]==='kg');
    const cats=new Set(granel.map(p=>p[1]));
    granolaActiveCat=[...cats][0]||null;
  }
  granolaRenderCatTabs();granolaRenderProdList();
  _palPushOverlay('granola');
}
function closeGranola(){
  document.getElementById('granolaModal').classList.add('hidden');
  document.body.style.overflow='';
  document.body.classList.remove('builder-open');
  granolaSelSize=null;granolaIngreds={};granolaActiveCat=null;
  document.getElementById('granolaBuilderArea').style.display='none';
  granolaRenderSizes();
}

function granolaRenderSizes(){
  document.getElementById('granolaSizes').innerHTML=GRANOLA_SIZES.map(s=>
    `<button class="mix-size-btn${granolaSelSize&&granolaSelSize.g===s.g?' sel':''}" onclick="granolaPickSize(${s.g})"><strong>${s.lbl}</strong><span>bolsón</span></button>`
  ).join('');
}
function granolaPickSize(g){
  granolaSelSize=GRANOLA_SIZES.find(s=>s.g===g);
  granolaIngreds={};
  // Asegurar que el primer rubro esté seleccionado
  const availCats=new Set(granolaGranelProds().map(p=>p[1]));
  const availGroups=GRANOLA_GROUPS.filter(g=>{
    if(g.cats)return g.cats.some(c=>availCats.has(c));
    return [...availCats].some(c=>_granolaGroup(c)==='otros');
  });
  if(availGroups.length) granolaActiveCat=availGroups[0].id;
  document.getElementById('granolaBuilderArea').style.display='block';
  granolaRenderSizes();granolaRenderCatTabs();granolaRenderProdList();granolaRenderSummary();
  // Scrollear al paso 2
  setTimeout(function(){
    var area=document.getElementById('granolaBuilderArea');
    var modal=document.getElementById('granolaModal');
    var scrollEl=modal.querySelector('.granola-modal-body')||modal;
    if(area && scrollEl){
      var top=area.getBoundingClientRect().top-scrollEl.getBoundingClientRect().top+scrollEl.scrollTop-8;
      scrollEl.scrollTo({top:top,behavior:'smooth'});
    }
  },120);
}

function granolaGranelProds(){return PRODS.filter(p=>p[4]==='kg'&&p[10]===true);}
// Grupos fijos de granola: cereales | frutos secos | otros
const GRANOLA_GROUPS=[
  {id:'cereales', lbl:'Cereales', cats:['cereales','granos','harinas','semillas']},
  {id:'frutos',   lbl:'Frutos secos', cats:['frutos','deshidratados']},
  {id:'otros',    lbl:'Otros', cats:null}, // null = todo lo que no esté en los anteriores
];
function _granolaGroup(catId){
  for(const g of GRANOLA_GROUPS){
    if(g.cats&&g.cats.includes(catId))return g.id;
  }
  return 'otros';
}
function granolaRenderCatTabs(){
  if(!granolaActiveCat)granolaActiveCat='cereales';
  // solo mostrar grupos que tengan productos disponibles
  const availCats=new Set(granolaGranelProds().map(p=>p[1]));
  const availGroups=GRANOLA_GROUPS.filter(g=>{
    if(g.cats)return g.cats.some(c=>availCats.has(c));
    // otros: hay algún cat que no esté en ningún grupo fijo
    return [...availCats].some(c=>_granolaGroup(c)==='otros');
  });
  const palette=['#4d7d8a','#3a6370','#6e9aa6','#5a8f9e'];
  document.getElementById('granolaCatTabs').innerHTML=availGroups.map((g,i)=>
    `<button class="granola-cat-tab${granolaActiveCat===g.id?' active':''}" style="--tab-color:${palette[i%4]}" onclick="granolaSetCat('${g.id}')">${g.lbl}</button>`
  ).join('');
}
function granolaSetCat(id){granolaActiveCat=id;granolaRenderCatTabs();granolaRenderProdList();}
window._scrollGranolaProductoTop=function(grpId,pid){
  if(granolaActiveCat!==grpId){granolaSetCat(grpId);}
  setTimeout(function(){
    var btn=document.querySelector('.prod-step-btn[onclick*="granolaIncProd('+pid+',"]');
    if(!btn)return;
    var row=btn.closest('.granola-prod-row');
    if(!row)return;
    var list=document.getElementById('granolaProdList');
    var listScrollable=list && list.scrollHeight>list.clientHeight;
    if(listScrollable){
      list.scrollTo({top:row.offsetTop-list.offsetTop,behavior:'smooth'});
    }else{
      var miniBar=document.getElementById('granolaMiniProgress');
      var miniH=miniBar && getComputedStyle(miniBar).display!=='none'?miniBar.offsetHeight:0;
      var headerH=document.querySelector('#granolaModal .granola-modal-header').offsetHeight;
      var modal=document.getElementById('granolaModal');
      var scrollEl=modal.querySelector('.granola-modal-body')||modal;
      var top=row.getBoundingClientRect().top-scrollEl.getBoundingClientRect().top+scrollEl.scrollTop-(headerH+miniH+8);
      scrollEl.scrollTo({top:top,behavior:'smooth'});
    }
    row.style.transition='background .3s';
    row.style.background='rgba(143,175,155,.25)';
    setTimeout(function(){row.style.background='';},900);
  },80);
};

function _granolaQuickNav(){
  const ings=Object.entries(granolaIngreds).filter(([,v])=>v&&v.g>0);
  const el=document.getElementById('granolaQuickNav');
  if(!el)return;
  if(!ings.length){el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML='<button class="qn-toggle" onclick="this.parentNode.classList.toggle(\'open\')">📋 Mis ingredientes <span class="qn-count">'+ings.length+'</span><span class="qn-arrow">▼</span></button>'+
    '<div class="qn-list">'+ings.map(([pid,v])=>{
      const p=PRODS.find(x=>x[0]===+pid);if(!p)return'';
      const grp=_granolaGroup(p[1]);
      return`<div class="ing-qn-row">
        <span class="ing-qn-name">${_capName(p[2])}</span>
        <span class="ing-qn-g">${_gLabel(v.g)}</span>
        <button class="granola-ing-qn-btn" onclick="_scrollGranolaProductoTop('${grp}',${p[0]})">Ver</button>
      </div>`;
    }).join('')+'</div>';
}
function granolaRenderProdList(){
  if(!granolaSelSize){document.getElementById('granolaProdList').innerHTML='<div style="padding:16px;font-size:13px;color:var(--muted-fg);text-align:center">Elegí primero el tamaño del bolsón</div>';_granolaQuickNav();return;}
  const group=GRANOLA_GROUPS.find(g=>g.id===granolaActiveCat);
  const prods=granolaGranelProds().filter(p=>group?
    (group.cats?group.cats.includes(p[1]):_granolaGroup(p[1])==='otros')
    :false);
  const usedG=Object.values(granolaIngreds).reduce((a,v)=>a+(v.g||0),0);
  document.getElementById('granolaProdList').innerHTML=prods.map(p=>{
    const pxkg=_precioKg(p,0);
    const cur=granolaIngreds[p[0]]?granolaIngreds[p[0]].g:0;
    const isOver=usedG>granolaSelSize.g;
    const canAddG=usedG<granolaSelSize.g;
    return`<div class="granola-prod-row${cur>0?' has-trash is-sel':''}">
      <div class="granola-prod-name">${_capName(p[2])}</div>
      <div class="granola-prod-price">$${fmt(pxkg)}/kg</div>
      <div class="prod-stepper granola-stepper${isOver?' over':''}">
        <button class="prod-step-btn" ${cur<=0?'disabled':''} onclick="granolaDecProd(${p[0]},${pxkg})" aria-label="Restar 100g">−</button>
        <span class="prod-step-val">${cur ? cur+' g' : '0 g'}</span>
        <button class="prod-step-btn" ${!canAddG?'disabled':''} onclick="granolaIncProd(${p[0]},${pxkg})" aria-label="Sumar 100g">+</button>
      </div>
      ${cur>0?`<button class="prod-trash-btn" onclick="granolaRemoveProd(${p[0]})" aria-label="Quitar" title="Quitar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>`:''}
    </div>`;
  }).join('');
  if(!prods.length)document.getElementById('granolaProdList').innerHTML='<div style="padding:16px;font-size:13px;color:var(--muted-fg);text-align:center">No hay productos a granel en esta categoría</div>';
  _granolaQuickNav();
}

function granolaRenderSummary(){
  if(!granolaSelSize)return;
  const ings=Object.entries(granolaIngreds).filter(([,v])=>v&&v.g>0);
  const usedG=ings.reduce((a,[,v])=>a+v.g,0);
  const pct=Math.min(100,(usedG/granolaSelSize.g)*100);
  const full=usedG===granolaSelSize.g,over=usedG>granolaSelSize.g;
  _builderFinalStep('granolaStep3',full&&ings.length>0);
  const fillColor=over?'#e8633a':full?'#16a34a':'#8faf9b';
  document.getElementById('granolaFillFill').style.cssText=`width:${pct}%;background:${fillColor}`;
  document.getElementById('granolaFillLbl').textContent=_gLabel(usedG)+' / '+_gLabel(granolaSelSize.g);
  document.getElementById('granolaSumHead').textContent='Tu granola de '+_gLabel(granolaSelSize.g);
  // Mini progress bar (sticky en top del modal): se muestra al elegir tamaño y oculta al completar
  var gmp=document.getElementById('granolaMiniProgress');
  var gmf=document.getElementById('granolaMiniFill');
  var gml=document.getElementById('granolaMiniLbl');
  var gmt=document.getElementById('granolaMiniTotal');
  if(gmf){gmf.style.cssText='width:'+pct+'%;background:'+fillColor;}
  if(gml){gml.textContent=_gLabel(usedG)+' / '+_gLabel(granolaSelSize.g);}
  const hint=document.getElementById('granolaFillHint');
  const rem=granolaSelSize.g-usedG;
  if(over){hint.textContent='Excedés por '+_gLabel(usedG-granolaSelSize.g);hint.style.color='#e8633a';}
  else if(full){hint.textContent='Bolsón completo';hint.style.color='#16a34a';}
  else{hint.textContent='Faltan '+_gLabel(rem);hint.style.color='var(--muted-fg)';}
  const ingEl=document.getElementById('granolaIngList');
  if(!ings.length){ingEl.innerHTML='<div style="padding:10px 0;font-size:13px;color:var(--muted-fg);text-align:center">Aún vacío</div>';}
  else{ingEl.innerHTML=ings.map(([pid,v])=>{const p=PRODS.find(x=>x[0]===+pid);const sub=Math.round(v.pxkg*(v.g/1000));return`<div class="granola-ing-row"><span class="granola-ing-name">${p?_capName(p[2]):'?'}</span><span class="granola-ing-detail">${_gLabel(v.g)} · $${fmt(sub)}</span></div>`;}).join('');}
  const total=ings.reduce((a,[,v])=>a+Math.round(v.pxkg*(v.g/1000)),0);
  document.getElementById('granolaIngCount').textContent=ings.length;
  document.getElementById('granolaTotal').textContent='$'+fmt(total);
  if(gmt) gmt.textContent='$'+fmt(total);
  const btn=document.getElementById('granolaAddBtn');
  if(full&&ings.length>0){
    btn.disabled=false;btn.textContent='Agregar granola al carrito';
    if(gmp){gmp.style.display='none';}
    setTimeout(function(){_scrollBuilderToBottom('granolaModal');},100);
  }
  else if(over){
    btn.disabled=true;btn.textContent='Excedés el peso del bolsón';
    if(gmp){gmp.style.display='flex';}
  }
  else{
    btn.disabled=true;btn.textContent=ings.length?'Faltan '+_gLabel(rem):'Agregar a tu carrito';
    if(gmp){gmp.style.display='flex';}
  }
}

function granolaAgregarAlCarrito(){
  if(!granolaSelSize)return;
  const ings=Object.entries(granolaIngreds).filter(([,v])=>v&&v.g>0);
  const usedG=ings.reduce((a,[,v])=>a+v.g,0);
  if(usedG!==granolaSelSize.g)return;
  let granolaId,granolaLabel;
  if(granolaEditKey){granolaId=granolaEditKey;granolaLabel=granolaEditLabel;granolaEditKey=null;granolaEditLabel=null;}
  else{granolaCounter++;granolaId='granola'+granolaCounter;granolaLabel='Granola #'+granolaCounter+' ('+_gLabel(granolaSelSize.g)+')';}
  const ingDetails=ings.map(([pid,v])=>{const p=PRODS.find(x=>x[0]===+pid);return p?p[2]+' '+_gLabel(v.g):'?';}).join(', ');
  const totalL1=ings.reduce((a,[pid,v])=>{const p=PRODS.find(x=>x[0]===+pid);if(!p)return a;return a+Math.round(_precioKg(p,0)*(v.g/1000));},0);
  const totalL2=ings.reduce((a,[pid,v])=>{const p=PRODS.find(x=>x[0]===+pid);if(!p)return a;return a+Math.round(_precioKg(p,1)*(v.g/1000));},0);
  cart.push({key:granolaId,pid:-2,n:granolaLabel,o:granolaId,totalG:granolaSelSize.g,unidad:'mix',sabor:'',l1:totalL1,l2:totalL2,mixDetalle:ingDetails,mixIngreds:ings.map(([pid,v])=>({pid:+pid,g:v.g}))});
  updateCartCount();
  granolaIngreds={};granolaSelSize=null;
  closeGranola();
  if(window.innerWidth>=768)openCart();
}


function editBuilder(key){
  const it=cart.find(i=>i.key===key);if(!it)return;
  closeCart();
  const isGranola=key.startsWith('granola');
  const isBlend=key.startsWith('blend');
  // remove from cart, will be re-added with SAME key to preserve number
  const origKey=key;
  const origLabel=it.n; // preserve "Mix #3 (1 kg)" label
  cart=cart.filter(i=>i.key!==key);
  updateCartCount();
  if(isGranola){
    // pre-load granola state
    granolaSelSize=GRANOLA_SIZES.find(s=>s.g===it.totalG)||GRANOLA_SIZES[1];
    granolaIngreds={};
    (it.mixIngreds||[]).forEach(({pid,g})=>{
      const p=PRODS.find(x=>x[0]===pid);if(!p)return;
      granolaIngreds[pid]={g,pxkg:_precioKg(p,0)};
    });
    granolaEditKey=origKey;granolaEditLabel=origLabel;
    openGranola();
    setTimeout(()=>{
      document.getElementById('granolaBuilderArea').style.display='block';
      granolaRenderSizes();granolaRenderCatTabs();granolaRenderProdList();granolaRenderSummary();
    },80);
  } else if(isBlend){
    // pre-load blend state
    blendSelSize=BLEND_SIZES.find(s=>s.g===it.totalG)||BLEND_SIZES[1];
    blendIngreds={};
    (it.mixIngreds||[]).forEach(({pid,g})=>{
      const p=PRODS.find(x=>x[0]===pid);if(!p)return;
      blendIngreds[pid]={g,pxkg:_precioKg(p,0)};
    });
    blendEditKey=origKey;blendEditLabel=origLabel;
    openBlend();
    setTimeout(()=>{
      document.getElementById('blendBuilderArea').style.display='block';
      blendRenderSizes();blendRenderCatTabs();blendRenderProdList();blendRenderSummary();
    },80);
  } else {
    // pre-load mix state
    mixSelSize=MIX_SIZES.find(s=>s.g===it.totalG)||MIX_SIZES[1];
    mixIngreds={};
    (it.mixIngreds||[]).forEach(({pid,g})=>{
      const p=PRODS.find(x=>x[0]===pid);if(!p)return;
      mixIngreds[pid]={g,pxkg:_precioKg(p,0)};
    });
    mixEditKey=origKey;mixEditLabel=origLabel;
    openMix();
    setTimeout(()=>{
      document.getElementById('mixBuilderArea').style.display='block';
      mixRenderSizes();mixRenderCatTabs();mixRenderProdList();mixRenderSummary();
    },80);
  }
}

/* ── BLEND DE TÉ BUILDER ── */
const BLEND_SIZES=[{g:50,lbl:'50 g'},{g:100,lbl:'100 g'},{g:250,lbl:'250 g'}];
let blendSelSize=null,blendActiveCat=null,blendIngreds={},blendCounter=0,blendEditKey=null,blendEditLabel=null;
const BLEND_ALLOWED_CATS=['infusiones','especias'];

function openBlend(){
  document.getElementById('blendModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
  document.body.classList.add('builder-open');
  blendRenderSizes();
  if(!blendActiveCat){
    const cats=blendGranelCats();
    blendActiveCat=cats.length?cats[0].id:null;
  }
  blendRenderCatTabs();blendRenderProdList();
  _palPushOverlay('blend');
}
window.openBlend=openBlend;
function closeBlend(){
  document.getElementById('blendModal').classList.add('hidden');
  document.body.style.overflow='';
  document.body.classList.remove('builder-open');
  blendSelSize=null;blendIngreds={};blendActiveCat=null;
  document.getElementById('blendBuilderArea').style.display='none';
  blendRenderSizes();
}
window.closeBlend=closeBlend;

function blendRenderSizes(){
  document.getElementById('blendSizes').innerHTML=BLEND_SIZES.map(s=>
    `<button class="mix-size-btn${blendSelSize&&blendSelSize.g===s.g?' sel':''}" onclick="blendPickSize(${s.g})"><strong>${s.lbl}</strong><span>blend</span></button>`
  ).join('');
}
function blendPickSize(g){
  blendSelSize=BLEND_SIZES.find(s=>s.g===g);
  blendIngreds={};
  const cats=blendGranelCats();
  if(cats.length) blendActiveCat=cats[0].id;
  document.getElementById('blendBuilderArea').style.display='block';
  blendRenderSizes();blendRenderCatTabs();blendRenderProdList();blendRenderSummary();
  setTimeout(function(){
    var area=document.getElementById('blendBuilderArea');
    var modal=document.getElementById('blendModal');
    var scrollEl=modal.querySelector('.blend-modal-body')||modal;
    if(area && scrollEl){
      var top=area.getBoundingClientRect().top-scrollEl.getBoundingClientRect().top+scrollEl.scrollTop-8;
      scrollEl.scrollTo({top:top,behavior:'smooth'});
    }
  },120);
}
window.blendPickSize=blendPickSize;

function blendGranelProds(){return PRODS.filter(p=>p[4]==='kg'&&p[10]===true&&BLEND_ALLOWED_CATS.includes(p[1]));}
function blendGranelCats(){
  const catIds=[...new Set(blendGranelProds().map(p=>p[1]))];
  return BLEND_ALLOWED_CATS.map(id=>CATS.find(c=>c.id===id)).filter(c=>c&&catIds.includes(c.id));
}
function blendRenderCatTabs(){
  const cats=blendGranelCats();
  if(!blendActiveCat&&cats.length)blendActiveCat=cats[0].id;
  const palette=['#a8752e','#8a641f','#c9932f','#b8863a'];
  document.getElementById('blendCatTabs').innerHTML=cats.map((c,i)=>
    `<button class="mix-cat-tab${blendActiveCat===c.id?' active':''}" style="--tab-color:${palette[i%4]}" onclick="blendSetCat('${c.id}')">${c.n}</button>`
  ).join('');
}
function blendSetCat(id){blendActiveCat=id;blendRenderCatTabs();blendRenderProdList();}
window.blendSetCat=blendSetCat;
window._scrollBlendProductoTop=function(catId,pid){
  if(blendActiveCat!==catId){blendSetCat(catId);}
  setTimeout(function(){
    var btn=document.querySelector('.prod-step-btn[onclick*="blendIncProd('+pid+',"]');
    if(!btn)return;
    var row=btn.closest('.mix-prod-row');
    if(!row)return;
    var list=document.getElementById('blendProdList');
    var listScrollable=list && list.scrollHeight>list.clientHeight;
    if(listScrollable){
      list.scrollTo({top:row.offsetTop-list.offsetTop,behavior:'smooth'});
    }else{
      var miniBar=document.getElementById('blendMiniProgress');
      var miniH=miniBar && getComputedStyle(miniBar).display!=='none'?miniBar.offsetHeight:0;
      var headerH=document.querySelector('#blendModal .blend-modal-header').offsetHeight;
      var modal=document.getElementById('blendModal');
      var scrollEl=modal.querySelector('.blend-modal-body')||modal;
      var top=row.getBoundingClientRect().top-scrollEl.getBoundingClientRect().top+scrollEl.scrollTop-(headerH+miniH+8);
      scrollEl.scrollTo({top:top,behavior:'smooth'});
    }
    row.style.transition='background .3s';
    row.style.background='rgba(168,117,46,.14)';
    setTimeout(function(){row.style.background='';},900);
  },80);
};

function _blendQuickNav(){
  const ings=Object.entries(blendIngreds).filter(([,v])=>v&&v.g>0);
  const el=document.getElementById('blendQuickNav');
  if(!el)return;
  if(!ings.length){el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML='<button class="qn-toggle" onclick="this.parentNode.classList.toggle(\'open\')">📋 Mis ingredientes <span class="qn-count">'+ings.length+'</span><span class="qn-arrow">▼</span></button>'+
    '<div class="qn-list">'+ings.map(([pid,v])=>{
      const p=PRODS.find(x=>x[0]===+pid);if(!p)return'';
      return`<div class="ing-qn-row">
        <span class="ing-qn-name">${_capName(p[2])}</span>
        <span class="ing-qn-g">${_gLabel(v.g)}</span>
        <button class="blend-ing-qn-btn" onclick="_scrollBlendProductoTop('${p[1]}',${p[0]})">Ver</button>
      </div>`;
    }).join('')+'</div>';
}
function blendRenderProdList(){
  if(!blendSelSize){document.getElementById('blendProdList').innerHTML='<div style="padding:16px;font-size:13px;color:var(--muted-fg);text-align:center">Elegí primero el tamaño del blend</div>';_blendQuickNav();return;}
  const prods=blendGranelProds().filter(p=>p[1]===blendActiveCat);
  const usedG=Object.values(blendIngreds).reduce((a,v)=>a+(v.g||0),0);
  document.getElementById('blendProdList').innerHTML=prods.map(p=>{
    const pxkg=_precioKg(p,0);
    const cur=(blendIngreds[p[0]]&&blendIngreds[p[0]].g)||0;
    const isOver=usedG>blendSelSize.g;
    const canAdd=usedG<blendSelSize.g;
    return`<div class="mix-prod-row${cur>0?' has-trash is-sel':''}">
      <div class="mix-prod-name">${_capName(p[2])}</div>
      <div class="mix-prod-price">$${fmt(pxkg)}/kg</div>
      <div class="prod-stepper${isOver?' over':''}">
        <button class="prod-step-btn" ${cur<=0?'disabled':''} onclick="blendDecProd(${p[0]},${pxkg})" aria-label="Restar 10 g">−</button>
        <span class="prod-step-val">${cur ? cur+' g' : '0 g'}</span>
        <button class="prod-step-btn" ${!canAdd?'disabled':''} onclick="blendIncProd(${p[0]},${pxkg})" aria-label="Sumar 10 g">+</button>
      </div>
      ${cur>0?`<button class="prod-trash-btn" onclick="blendRemoveProd(${p[0]})" aria-label="Quitar" title="Quitar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>`:''}
    </div>`;
  }).join('');
  if(!prods.length)document.getElementById('blendProdList').innerHTML='<div style="padding:16px;font-size:13px;color:var(--muted-fg);text-align:center">No hay productos a granel en esta categoría</div>';
  _blendQuickNav();
}
function blendRemoveProd(pid){delete blendIngreds[pid];blendRenderProdList();blendRenderSummary();}
window.blendRemoveProd=blendRemoveProd;
function blendIncProd(pid,pxkg){
  if(!blendSelSize)return;
  const cur=(blendIngreds[pid]&&blendIngreds[pid].g)||0;
  const usedG=Object.values(blendIngreds).reduce((a,v)=>a+(v.g||0),0);
  const remG=blendSelSize.g-usedG;
  if(remG<=0)return;
  const step=10;
  const newG=cur+Math.min(step,remG);
  blendIngreds[pid]={g:newG,pxkg};
  blendRenderProdList();blendRenderSummary();
}
function blendDecProd(pid,pxkg){
  const cur=(blendIngreds[pid]&&blendIngreds[pid].g)||0;
  const step=10;
  if(cur<=step){delete blendIngreds[pid];}
  else{blendIngreds[pid]={g:cur-step,pxkg};}
  blendRenderProdList();blendRenderSummary();
}
window.blendIncProd=blendIncProd;window.blendDecProd=blendDecProd;

function blendRenderSummary(){
  if(!blendSelSize)return;
  const ings=Object.entries(blendIngreds).filter(([,v])=>v&&v.g>0);
  const usedG=ings.reduce((a,[,v])=>a+v.g,0);
  const pct=Math.min(100,(usedG/blendSelSize.g)*100);
  const full=usedG===blendSelSize.g;
  const over=usedG>blendSelSize.g;
  _builderFinalStep('blendStep3',full&&ings.length>0);
  const fillColor=over?'#e8633a':full?'#16a34a':'#a8752e';
  document.getElementById('blendFillFill').style.cssText=`width:${pct}%;background:${fillColor}`;
  document.getElementById('blendFillLbl').textContent=mixGLabel(usedG)+' / '+mixGLabel(blendSelSize.g);
  document.getElementById('blendSumHead').textContent='Tu blend de '+mixGLabel(blendSelSize.g);
  var bmp=document.getElementById('blendMiniProgress');
  var bmf=document.getElementById('blendMiniFill');
  var bml=document.getElementById('blendMiniLbl');
  var bmt=document.getElementById('blendMiniTotal');
  if(bmf){bmf.style.cssText='width:'+pct+'%;background:'+fillColor;}
  if(bml){bml.textContent=mixGLabel(usedG)+' / '+mixGLabel(blendSelSize.g);}
  const hint=document.getElementById('blendFillHint');
  const rem=blendSelSize.g-usedG;
  if(over){hint.textContent='⚠ Excedés por '+mixGLabel(usedG-blendSelSize.g);hint.style.color='#e8633a';}
  else if(full){hint.textContent='✓ Blend completo';hint.style.color='#16a34a';}
  else{hint.textContent='Faltan '+mixGLabel(rem);hint.style.color='var(--muted-fg)';}

  const ingEl=document.getElementById('blendIngList');
  if(!ings.length){ingEl.innerHTML='<div style="padding:10px 0;font-size:13px;color:var(--muted-fg);text-align:center">Aún vacío</div>';
  }else{
    ingEl.innerHTML=ings.map(([pid,v])=>{
      const p=PRODS.find(x=>x[0]===+pid);
      const sub=Math.round(v.pxkg*(v.g/1000));
      return`<div class="mix-ing-row"><span class="mix-ing-name">${p?_capName(p[2]):'?'}</span><span class="mix-ing-detail">${mixGLabel(v.g)} · $${fmt(sub)}</span></div>`;
    }).join('');
  }
  const total=ings.reduce((a,[,v])=>a+Math.round(v.pxkg*(v.g/1000)),0);
  document.getElementById('blendIngCount').textContent=ings.length;
  document.getElementById('blendTotal').textContent='$'+fmt(total);
  if(bmt) bmt.textContent='$'+fmt(total);
  const btn=document.getElementById('blendAddBtn');
  if(full&&ings.length>0){
    btn.disabled=false;btn.textContent='🛒 Agregar blend al carrito';
    if(bmp){bmp.style.display='none';}
    setTimeout(function(){_scrollBuilderToBottom('blendModal');},100);
  }
  else if(over){
    btn.disabled=true;btn.textContent='Excedés el peso del blend';
    if(bmp){bmp.style.display='flex';}
  }
  else{
    btn.disabled=true;btn.textContent=ings.length?'Faltan '+mixGLabel(rem):'Agregar a tu carrito';
    if(bmp){bmp.style.display='flex';}
  }
}

function blendAgregarAlCarrito(){
  if(!blendSelSize)return;
  const ings=Object.entries(blendIngreds).filter(([,v])=>v&&v.g>0);
  const usedG=ings.reduce((a,[,v])=>a+v.g,0);
  if(usedG!==blendSelSize.g)return;
  let blendId,blendLabel;
  if(blendEditKey){blendId=blendEditKey;blendLabel=blendEditLabel;blendEditKey=null;blendEditLabel=null;}
  else{blendCounter++;blendId='blend'+blendCounter;blendLabel='Blend #'+blendCounter+' ('+_gLabel(blendSelSize.g)+')';}
  const ingDetails=ings.map(([pid,v])=>{
    const p=PRODS.find(x=>x[0]===+pid);
    return p?p[2]+' '+_gLabel(v.g):'?';
  }).join(', ');
  const totalL1=ings.reduce((a,[pid,v])=>{
    const p=PRODS.find(x=>x[0]===+pid);if(!p)return a;
    return a+Math.round(_precioKg(p,0)*(v.g/1000));
  },0);
  const totalL2=ings.reduce((a,[pid,v])=>{
    const p=PRODS.find(x=>x[0]===+pid);if(!p)return a;
    return a+Math.round(_precioKg(p,1)*(v.g/1000));
  },0);
  cart.push({
    key:blendId,
    pid:-3,
    n:blendLabel,
    o:blendId,
    totalG:blendSelSize.g,
    unidad:'mix',
    sabor:'',
    l1:totalL1,
    l2:totalL2,
    mixDetalle:ingDetails,
    mixIngreds:ings.map(([pid,v])=>({pid:+pid,g:v.g}))
  });
  updateCartCount();
  blendIngreds={};blendSelSize=null;
  closeBlend();
  const fab=document.getElementById('cart-fab');
  if(fab){fab.style.transform='scale(1.25)';setTimeout(()=>{fab.style.transform='';},400);}
  if(window.innerWidth>=768)openCart();
}
window.blendAgregarAlCarrito=blendAgregarAlCarrito;


/* ── MAYORISTA CONFETTI ── */
const _CONF_COLORS=['#f28e78','#f7b2a2','#75a8d6','#a9c9e8','#6fb6aa','#a6d2c2','#f4c7ae','#b4c3d8'];
let _confCanvas=null;

function _buildConeHTML(id,flipX){
  var sc=flipX?'style="overflow:visible;transform:scaleX(-1)"':'style="overflow:visible"';
  var cls=flipX?'may-cone may-cone-right':'may-cone may-cone-left';
  var clip=id+'Clip';
  return '<div class="'+cls+'" id="'+id+'">'+
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" '+sc+'>'+
      '<defs><clipPath id="'+clip+'"><polygon points="32,58 4,18 60,18"/></clipPath></defs>'+
      '<polygon points="32,58 4,18 60,18" fill="#e8a020" stroke="#c47810" stroke-width="1.2"/>'+
      '<g clip-path="url(#'+clip+')">'+
        '<rect x="0" y="22" width="70" height="6" fill="#e07860" opacity="0.75" transform="rotate(-8,32,25)"/>'+
        '<rect x="0" y="31" width="70" height="6" fill="#4d7d8a" opacity="0.7" transform="rotate(-8,32,34)"/>'+
        '<rect x="0" y="40" width="70" height="6" fill="#7bbf8e" opacity="0.75" transform="rotate(-8,32,43)"/>'+
        '<rect x="0" y="49" width="70" height="6" fill="#f5c842" opacity="0.65" transform="rotate(-8,32,52)"/>'+
      '</g>'+
      '<polygon points="32,58 4,18 18,18" fill="rgba(0,0,0,0.12)"/>'+
      '<ellipse cx="32" cy="18" rx="28" ry="9" fill="#f5c842" stroke="#e8a020" stroke-width="1"/>'+
      '<ellipse cx="18" cy="14" rx="4" ry="2.8" fill="#e07860" transform="rotate(-20,18,14)"/>'+
      '<ellipse cx="30" cy="10" rx="3.5" ry="2.2" fill="#4d7d8a" transform="rotate(10,30,10)"/>'+
      '<ellipse cx="42" cy="13" rx="4" ry="2.5" fill="#7bbf8e" transform="rotate(-5,42,13)"/>'+
      '<circle cx="24" cy="8" r="2.5" fill="#f5c842"/>'+
      '<circle cx="36" cy="7" r="2.2" fill="#e8c488"/>'+
      '<rect x="44" y="9" width="6" height="4" rx="1.5" fill="#e07860" transform="rotate(25,47,11)"/>'+
    '</svg>'+
  '</div>';
}

function _triggerMayoristaConfetti(){
  var toast=document.getElementById('mayToast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='mayToast';
    toast.className='may-toast may-toast-img';
    toast.innerHTML='<img src="mensajedescuentonuevo.webp" width="1040" height="780" alt="\u00a1Desbloqueaste tu descuento! Tu compra ahora tiene 20% OFF" class="may-toast-imgsrc">';
    document.body.appendChild(toast);
  }
  toast.classList.remove('hide');
  toast.classList.add('show');
  setTimeout(function(){toast.classList.add('hide');setTimeout(function(){toast.classList.remove('show','hide');},400);},3400);

  if(!_confCanvas){
    _confCanvas=document.createElement('canvas');
    _confCanvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998';
    document.body.appendChild(_confCanvas);
  }
  _confCanvas.width=window.innerWidth;
  _confCanvas.height=window.innerHeight;
  var ctx=_confCanvas.getContext('2d');
  ctx.clearRect(0,0,_confCanvas.width,_confCanvas.height);

  setTimeout(function(){
    function getConePos(id){
      var el=document.getElementById(id);
      if(!el)return{x:window.innerWidth/2,y:window.innerHeight/3};
      var r=el.getBoundingClientRect();
      return{x:r.left+r.width/2,y:r.top+r.height*0.25};
    }
    var oL=getConePos('mayConL');
    var oR=getConePos('mayConR');
    var pieces=[];

    function spawnFrom(ox,oy,dirSign){
      for(var i=0;i<70;i++){
        var spread=140;
        var baseAngle=dirSign>0?-105:-75;
        var angle=(baseAngle+(Math.random()*spread-spread/2))*(Math.PI/180);
        var speed=3.5+Math.random()*5;
        pieces.push({
          x:ox,y:oy,
          vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
          w:5+Math.random()*8,h:4+Math.random()*7,
          rot:Math.random()*360,drot:(Math.random()-0.5)*15,
          color:_CONF_COLORS[Math.floor(Math.random()*_CONF_COLORS.length)],
          alpha:1,round:Math.random()>0.45,delay:Math.floor(Math.random()*6)
        });
      }
    }
    spawnFrom(oL.x,oL.y,-1);
    spawnFrom(oR.x,oR.y,1);
    // rain from top across full width
    for(var r=0;r<50;r++){
      pieces.push({
        x:Math.random()*_confCanvas.width,
        y:-10,
        vx:(Math.random()-0.5)*2.5,
        vy:1.5+Math.random()*2.5,
        w:5+Math.random()*7,h:4+Math.random()*7,
        rot:Math.random()*360,drot:(Math.random()-0.5)*10,
        color:_CONF_COLORS[Math.floor(Math.random()*_CONF_COLORS.length)],
        alpha:1,round:Math.random()>0.45,delay:Math.floor(Math.random()*30)+5
      });
    }

    var frame=0;
    function tick(){
      ctx.clearRect(0,0,_confCanvas.width,_confCanvas.height);
      var alive=false;
      for(var i=0;i<pieces.length;i++){
        var p=pieces[i];
        if(frame<p.delay)continue;
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.13;p.vx*=0.99;p.rot+=p.drot;
        if(frame>60)p.alpha=Math.max(0,p.alpha-0.015);
        if(p.alpha<=0)continue;
        alive=true;
        ctx.save();ctx.globalAlpha=p.alpha;
        ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle=p.color;
        if(p.round){ctx.beginPath();ctx.ellipse(0,0,p.w/2,p.h/2,0,0,Math.PI*2);ctx.fill();}
        else{ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);}
        ctx.restore();
      }
      frame++;
      if(alive||frame<25)requestAnimationFrame(tick);
      else ctx.clearRect(0,0,_confCanvas.width,_confCanvas.height);
    }
    requestAnimationFrame(tick);
  },80);
}


// ── LISTA MAYORISTA ──
// ▼▼▼ CONFIGURACIÓN: reemplazá estos GIDs con los de tu Google Sheet ▼▼▼
// Para obtenerlos: abrí el Sheet → hacé clic en la pestaña de cada hoja → fijate el gid=XXXXXXX en la URL
const MAY_PRECIOS_GID = '545595949'; // Hoja 3 — Precios Mayorista (precio por unidad)
const MAY_INFO_GID    = '896338689'; // Hoja 4 — Info Mayorista (col C = bultos)
const SHEET_BASE_URL  = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT2RlZaSdlV-aaVGUw7YI9MVE1MHjopNhbjTOfWBZwPNo_clhJUao2KNcNowEzsdBGpd2Bh5-2rt1aH/pub';
// ▲▲▲ FIN CONFIGURACIÓN ▲▲▲
// Número WhatsApp mayorista
const WA_MAYORISTA = '5492615983065';
const WA_MINORISTA = '5492616512823';
// Mapas del header: el botón de ubicación cambia según la pestaña activa
const MAPA_MINORISTA = 'https://maps.app.goo.gl/5TtZMgtvq5XfycqG8';
const MAPA_MAYORISTA = 'https://maps.app.goo.gl/MXySPy9mbBFm8oVaA';
const MIN_COMPRA_MAYORISTA = 250000;

let PRODS_MAY = [];
let CATS_MAY = [];
function _saveCartMay(){try{localStorage.setItem('paladear_cart_may_v2',JSON.stringify(cartMay));}catch(e){}}
function _loadCartMay(){try{const s=localStorage.getItem('paladear_cart_may_v2');return s?JSON.parse(s):[];}catch(e){return [];}}
let cartMay = _loadCartMay();
if(cartMay.length)updateCartMayCount();
let activeCatIdMay = null;
let searchTermMay = '';
let _searchTimerMay = null;
// Mapa de bultos por artículo: {articuloId: {bulto, nombre, sabores, imagen}}
let MAY_BULTO_MAP = {};

// Pill deslizante
let _pillX = null;
let _pillW = null;
var _pillAnimEnd = null;
function _setPill(btn) {
  var pill = document.getElementById('tabsPill');
  if (!pill) return;
  var newLeft = btn.offsetLeft;
  var newWidth = btn.offsetWidth;
  var sameTarget = _pillX !== null && _pillW !== null &&
    Math.abs(_pillX - newLeft) < 0.5 && Math.abs(_pillW - newWidth) < 0.5;
  // Algunos cambios de pestaña recalculan la misma posición dos veces.
  // No reiniciar la animación: el segundo cálculo cancelaba el rebote visible.
  if (sameTarget) return;
  if (_pillX === null) {
    pill.style.setProperty('--pill-x', newLeft + 'px');
    pill.style.setProperty('--pill-w', newWidth + 'px');
    _pillX = newLeft;
    _pillW = newWidth;
    return;
  }
  var dx = _pillX - newLeft;
  pill.style.setProperty('--pill-dx', dx + 'px');
  pill.style.setProperty('--pill-x', newLeft + 'px');
  pill.style.setProperty('--pill-w', newWidth + 'px');
  _pillX = newLeft;
  _pillW = newWidth;
  if (_pillAnimEnd) { pill.removeEventListener('animationend', _pillAnimEnd); }
  pill.classList.remove('sliding');
  void pill.offsetWidth;
  pill.classList.add('sliding');
  _pillAnimEnd = function() { pill.classList.remove('sliding'); _pillAnimEnd = null; };
  pill.addEventListener('animationend', _pillAnimEnd, {once: true});
}
// Init pill en tab activo inicial + RE-posicionar cuando el layout se estabiliza.
// (Arregla el bug de la pastilla "cortada/congelada" al abrir en celular: se calculaba
//  antes de que cargara la fuente y quedaba mal hasta tocar o refrescar.)
(function(){
  var scheduled=false;
  function repositionPill(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(function(){
      scheduled=false;
      var pill = document.getElementById('tabsPill');
      var ab = document.querySelector('#mainTabs .may-tab.active');
      if (!pill || !ab) return;
      // Leer geometría una sola vez y antes de modificar estilos para evitar layout thrashing.
      var left=ab.offsetLeft,width=ab.offsetWidth;
      if(_pillX!==null&&Math.abs(_pillX-left)<.5&&_pillW!==null&&Math.abs(_pillW-width)<.5)return;
      pill.classList.remove('sliding');         // sin animación: solo reubicar
      pill.style.setProperty('--pill-x', left + 'px');
      pill.style.setProperty('--pill-w', width + 'px');
      _pillX = left;
      _pillW = width;
    });
  }
  _palAfterFirstPaint(repositionPill);            // CSS ya deja Home bien ubicado en la primera pintura
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(repositionPill); // al cargar la fuente
  window.addEventListener('load', repositionPill);   // al terminar de cargar todo
  setTimeout(repositionPill, 900);               // respaldo para WebViews que demoran el layout
  window.addEventListener('resize', repositionPill); // al rotar el celular
})();

// Tab switcher
let currentTab = document.body.classList.contains('hv-home') ? 'home' : 'minorista';
function switchTab(tab) {
  currentTab = tab;
  const minSection = document.getElementById('mainContainer');
  const maySection = document.getElementById('mayoristaSection');
  const recSection = document.getElementById('recetasSection');
  const tabMin = document.getElementById('tabMinorista');
  const tabMay = document.getElementById('tabMayorista');
  const tabRec = document.getElementById('tabRecetas');
  const fabMin = document.getElementById('cart-fab');
  const fabMay = document.getElementById('cart-fab-may');
  // Reset
  if (tabMin) tabMin.classList.remove('active');
  if (tabMay) tabMay.classList.remove('active');
  if (tabRec) tabRec.classList.remove('active');
  const bannerMin = document.getElementById('bannerRotativo');
  const bannerMay = document.getElementById('bannerMayorista');
  if (tab === 'mayorista') {
    if (minSection) minSection.style.display = 'none';
    if (maySection) maySection.classList.add('active');
    if (recSection) recSection.style.display = 'none';
    if (tabMay) tabMay.classList.add('active');
    if (fabMin) fabMin.style.display = 'none';
    if (fabMay) fabMay.style.display = 'flex';
    if (bannerMin) bannerMin.style.display = 'none';
    if (bannerMay) bannerMay.style.display = '';
    const waHeader = document.querySelector('.social-btn[title^="WhatsApp"]');
    if (waHeader) { waHeader.href = 'https://wa.me/' + WA_MAYORISTA; waHeader.title = 'WhatsApp Mayorista'; }
    const mapHeader = document.getElementById('headerMapBtn');
    if (mapHeader) { mapHeader.href = MAPA_MAYORISTA; mapHeader.title = 'Cómo llegar (depósito mayorista)'; }
    if (!PRODS_MAY.length && typeof cargarMayorista === 'function') {
      cargarMayorista();
    } else {
      renderMayUI();
    }
  } else if (tab === 'recetas') {
    if (minSection) minSection.style.display = 'none';
    if (maySection) maySection.classList.remove('active');
    if (recSection) recSection.style.display = '';
    if (tabRec) tabRec.classList.add('active');
    if (fabMin) fabMin.style.display = 'flex';
    if (fabMay) fabMay.style.display = 'none';
    if (bannerMin) bannerMin.style.display = '';
    if (bannerMay) bannerMay.style.display = 'none';
    const waHeader = document.querySelector('.social-btn[title^="WhatsApp"]');
    if (waHeader) { waHeader.href = 'https://wa.me/' + WA_MINORISTA; waHeader.title = 'WhatsApp Minorista'; }
    const mapHeader = document.getElementById('headerMapBtn');
    if (mapHeader) { mapHeader.href = MAPA_MINORISTA; mapHeader.title = 'Cómo llegar (local minorista)'; }
    if (typeof _mostrarRecetas === 'function') _mostrarRecetas();
  } else {
    if (minSection) minSection.style.display = '';
    if (maySection) maySection.classList.remove('active');
    if (recSection) recSection.style.display = 'none';
    if (tabMin) tabMin.classList.add('active');
    if (fabMin) fabMin.style.display = 'flex';
    if (fabMay) fabMay.style.display = 'none';
    if (bannerMin) bannerMin.style.display = '';
    if (bannerMay) bannerMay.style.display = 'none';
    // Restaurar botón WA del header al número minorista
    const waHeader = document.querySelector('.social-btn[title^="WhatsApp"]');
    if (waHeader) { waHeader.href = 'https://wa.me/' + WA_MINORISTA; waHeader.title = 'WhatsApp Minorista'; }
    const mapHeader = document.getElementById('headerMapBtn');
    if (mapHeader) { mapHeader.href = MAPA_MINORISTA; mapHeader.title = 'Cómo llegar (local minorista)'; }
  }
  var _at = document.querySelector('#mainTabs .may-tab.active');
  if (_at) _setPill(_at);
  // Quitar foco del botón para evitar el focus ring de Chrome Android (línea fina debajo de la pill).
  // OJO: no tocar inputs/textarea. Cuando se busca desde el Home, switchTab('minorista') se dispara
  // con el input de búsqueda enfocado; hacerle blur cerraba el teclado en móvil y cortaba lo escrito
  // (quedaba solo la 1ª letra). Solo blureamos botones/tabs, no campos de texto.
  try {
    var _ae = document.activeElement;
    if (_ae && _ae.blur && _ae.tagName !== 'INPUT' && _ae.tagName !== 'TEXTAREA') _ae.blur();
  } catch(e){}
}
window.switchTab = switchTab;
// Hook: guardar estado cuando cambia el tab + resetear scroll a top
(function(){
  const _origSwitchTab = switchTab;
  let _initialTabSet = false;
  window.switchTab = function(tab){
    const wasTab = (typeof currentTab !== 'undefined') ? currentTab : null;
    _origSwitchTab(tab);
    if(typeof _saveAppState==='function') _saveAppState();
    // Si el usuario CAMBIÓ de pestaña (no la primera carga ni un re-click), scrollear al top
    // para evitar que aparezca con scroll a mitad de la sección nueva
    if(_initialTabSet && wasTab && wasTab !== tab){
      window.scrollTo({top:0,behavior:'instant'});
    }
    _initialTabSet = true;
  };
})();

/* ═══ TESTER2: pestaña HOME ═══ */
function _hvCatsHTML(){
  var h='';
  Object.keys(RUBRO_MAP).map(function(k){return RUBRO_MAP[k];}).sort(function(a,b){return a.n.localeCompare(b.n,'es',{sensitivity:'base'});}).forEach(function(c){
    h+='<button class="hv-cat" data-cat="'+c.id+'" onclick="hvGoCat(\''+c.id+'\')"><span class="bub"><img src="cat-'+c.id+'.png" alt="" loading="lazy" onerror="this.parentNode.textContent=\''+c.ic+'\'"></span><span>'+c.n+'</span></button>';
  });
  return h;
}
function hvRenderCats(){
  var w1=document.getElementById('hvCatsScroller'), w2=document.getElementById('hvCatsGrid');
  if(!w1||!w2)return;
  var target=window.innerWidth<768?w1:w2;
  if(!target.childElementCount)target.innerHTML=_hvCatsHTML();
}
function hvGoCat(id){
  var prevApplying=_palHistoryApplying;
  _palHistoryApplying=true;
  try{window.switchTab('minorista');}finally{_palHistoryApplying=prevApplying;}
  try{ if(typeof selectCat==='function') selectCat(id,null,{preservePrevious:true}); }catch(e){}
  window.scrollTo({top:0,behavior:'instant'});
}
window.hvGoCat=hvGoCat;
function hvToggleCats(){
  var sec=document.getElementById('hvCats'), b=document.getElementById('hvCatsToggle');
  var grid=document.getElementById('hvCatsGrid');
  if(sec&&!sec.classList.contains('expanded')&&grid&&!grid.childElementCount)grid.innerHTML=_hvCatsHTML();
  sec.classList.toggle('expanded');
  if(b) b.firstChild.textContent = sec.classList.contains('expanded') ? 'Ver menos ' : 'Ver las 24 ';
}
window.hvToggleCats=hvToggleCats;
(function(){
  var desktop=window.innerWidth>=768,timer=null;
  window.addEventListener('resize',function(){
    var next=window.innerWidth>=768;if(next===desktop)return;desktop=next;
    clearTimeout(timer);timer=setTimeout(hvRenderCats,120);
  },{passive:true});
})();
function hvRenderOfertas(){
  var box=document.getElementById('hvOfertas'); if(!box) return;
  try{
    var of=(PRODS||[]).filter(function(p){ return p[12] && p[12].oferta>0; });
    if(!of.length){ box.style.display='none'; return; }
    box.style.display='';
    // Al menos 1 producto de cada rubro con oferta, hasta 6 en total. Por rubro se
    // elige el de mayor descuento; si hay más de 6 rubros con oferta, se priorizan
    // los rubros con el descuento más fuerte.
    var porRubro={};
    of.forEach(function(p){
      var rid=p[1];
      if(!porRubro[rid]||p[12].oferta>porRubro[rid][12].oferta) porRubro[rid]=p;
    });
    var seleccion=Object.keys(porRubro).map(function(k){return porRubro[k];})
      .sort(function(a,b){return b[12].oferta-a[12].oferta;}).slice(0,6);
    var minis=seleccion.map(function(p){
      var opts=_sortOpts(Object.keys(p[7]));
      var precio=opts.length?p[7][opts[0]][0]:0;
      var pct=p[12].oferta;
      var img=(p[6]&&p[6].indexOf('http')===0)?'<img src="'+p[6]+'" alt="" loading="lazy">':'<span class="hvof-emoji">🌿</span>';
      return '<span class="hvof-card"><span class="hvof-badge">−'+pct+'%</span>'+img
        +'<span class="hvof-name">'+_tc(p[2])+'</span>'
        +'<span class="hvof-precio"><s>$'+fmt(precio)+'</s> <b>$'+fmt(Math.round(precio*(1-pct/100)))+'</b></span></span>';
    }).join('');
    box.innerHTML='<span class="hvof-head"><img class="hvof-tk" src="nav-ofertas.png" alt="">'
      +'<span><b>Ofertas del mes</b><span class="hvof-sub">'+of.length+' producto'+(of.length!==1?'s':'')+' con descuento. Tocá para verlos todos.</span></span>'
      +'<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>'
      +'<span class="hvof-row">'+minis+'</span>';
  }catch(e){}
}
function renderOfertasView(){
  var area=document.getElementById('ofertasViewContent');
  var stat=document.getElementById('ofertasViewStat');
  if(!area||!stat)return;
  var of=(PRODS||[]).filter(function(p){return p[12]&&p[12].oferta>0;})
    .sort(function(a,b){return a[2].localeCompare(b[2],'es',{sensitivity:'base'});});
  if(!of.length){
    stat.textContent='';
    area.innerHTML='<div class="ofview-empty">Hoy no hay productos con descuento. Volvé a revisar pronto.</div>';
    return;
  }
  var maxPct=Math.max.apply(null,of.map(function(p){return p[12].oferta;}));
  stat.textContent=of.length+' oferta'+(of.length!==1?'s':'')+'. Hasta -'+maxPct+'%';
  area.innerHTML='<div class="prod-grid ofview-grid">'+of.map(function(p,i){return renderCard(p,'of',i<4);}).join('')+'</div>';
}
window.renderOfertasView=renderOfertasView;
function hvIrOfertas(){
  selectOfertasMes();
}
window.hvIrOfertas=hvIrOfertas;
function renderWishlistView(){
  var area=document.getElementById('wishlistViewContent');
  var stat=document.getElementById('wishlistViewStat');
  if(!area||!stat)return;
  var favs=(PRODS||[]).filter(_isFavoriteProduct)
    .sort(function(a,b){return a[2].localeCompare(b[2],'es',{sensitivity:'base'});});
  stat.textContent=favs.length?favs.length+' guardado'+(favs.length!==1?'s':''):'';
  if(!PRODS.length&&_favoritos.size){
    area.innerHTML='<div class="wishlist-empty"><h2>Cargando tus favoritos</h2><p>Estamos preparando los productos que guardaste.</p></div>';
    return;
  }
  if(!favs.length){
    area.innerHTML='<div class="wishlist-empty"><img src="nav-favoritos.png" alt=""><h2>Tu lista está vacía</h2><p>Tocá el corazón de cualquier producto para guardarlo acá.</p><button onclick="switchTab(\'minorista\')">Ver productos</button></div>';
    return;
  }
  area.innerHTML='<div class="prod-grid wishlist-grid">'+favs.map(function(p,i){return renderCard(p,'fav',i<4);}).join('')+'</div>';
}
window.renderWishlistView=renderWishlistView;
var _wishlistReturnTab='home';
function openWishlist(){
  var base=_bnavBaseTab();
  if(base&&base!=='favoritos')_wishlistReturnTab=base;
  window.switchTab('favoritos');
}
window.openWishlist=openWishlist;
var _bnavPillX=null;
var _bnavPillAnimEnd=null;
var _bnavMoveFrame=null;
function _restartNavIcon(img){
  if(!img)return;
  img.classList.remove('nav-icon-bounce');
  void img.offsetWidth;
  img.classList.add('nav-icon-bounce');
  setTimeout(function(){img.classList.remove('nav-icon-bounce');},340);
}
function _bnavMovePill(btn,animate){
  var pill=document.getElementById('bnavPill');
  if(!pill||!btn)return;
  var inset=6;
  var newLeft=btn.offsetLeft+inset;
  var newWidth=Math.max(0,btn.offsetWidth-inset*2);
  if(_bnavPillX===null||!animate){
    pill.classList.remove('bouncing');
    pill.classList.add('instant');
    pill.style.setProperty('--bnav-pill-x',newLeft+'px');
    pill.style.setProperty('--bnav-pill-w',newWidth+'px');
    _bnavPillX=newLeft;
    requestAnimationFrame(function(){pill.classList.remove('instant');});
    return;
  }
  var dx=_bnavPillX-newLeft;
  pill.style.setProperty('--bnav-pill-dx',dx+'px');
  pill.style.setProperty('--bnav-pill-x',newLeft+'px');
  pill.style.setProperty('--bnav-pill-w',newWidth+'px');
  _bnavPillX=newLeft;
  if(_bnavPillAnimEnd)pill.removeEventListener('animationend',_bnavPillAnimEnd);
  pill.classList.remove('bouncing');
  void pill.offsetWidth;
  pill.classList.add('bouncing');
  _bnavPillAnimEnd=function(){pill.classList.remove('bouncing');_bnavPillAnimEnd=null;};
  pill.addEventListener('animationend',_bnavPillAnimEnd,{once:true});
}
function _bnavSet(tab){
  var previous=_bnavActiveTab();
  var active=null;
  document.querySelectorAll('.bnav a[data-b],.bnav button[data-b]').forEach(function(a){
    var on=a.getAttribute('data-b')===tab;
    a.classList.toggle('active',on);
    if(on)active=a;
  });
  if(active){
    if(_bnavMoveFrame)cancelAnimationFrame(_bnavMoveFrame);
    _bnavMoveFrame=requestAnimationFrame(function(){
      _bnavMoveFrame=null;
      if(active.isConnected&&active.classList.contains('active'))_bnavMovePill(active,true);
    });
    if(previous!==tab)_restartNavIcon(active.querySelector('img'));
  }
  else{
    var pill=document.getElementById('bnavPill');
    if(pill)pill.style.setProperty('--bnav-pill-w','0px');
  }
}
window._bnavSet=_bnavSet;
function _bnavBaseTab(){
  if(document.body.classList.contains('hv-home'))return 'home';
  if(document.body.classList.contains('hv-ofertas'))return 'ofertas';
  if(document.body.classList.contains('hv-favoritos'))return 'favoritos';
  return currentTab==='minorista'?'minorista':null;
}
function _bnavActiveTab(){
  var a=document.querySelector('.bnav a.active[data-b],.bnav button.active[data-b]');
  return a?a.getAttribute('data-b'):null;
}
(function(){
  var scheduled=false;
  function repositionBnavPill(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(function(){
      scheduled=false;
      if(window.innerWidth>=768)return;
    var nav=document.querySelector('.bnav');
    var active=document.querySelector('.bnav a.active[data-b],.bnav button.active[data-b]');
      if(!nav||!active)return;
    _bnavMovePill(active,false);
    });
  }
  _palAfterFirstPaint(repositionBnavPill);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(repositionBnavPill);
  window.addEventListener('load',repositionBnavPill);
  setTimeout(repositionBnavPill,900);
  window.addEventListener('resize',repositionBnavPill);
})();
(function(){
  var _prev = window.switchTab;
  window.switchTab = function(tab){
    if(tab==='home'){
      _prev('minorista'); // resetea header/FABs/estado al modo minorista
      document.body.classList.remove('hv-ofertas','hv-favoritos');
      document.body.classList.add('hv-home');
      _activeOfertasMes=false;
      document.querySelectorAll('#mainTabs .may-tab').forEach(function(b){ b.classList.remove('active'); });
      var th=document.getElementById('tabHome');
      if(th){ th.classList.add('active'); try{ _setPill(th); }catch(e){} }
      currentTab='home';
      var hc1=document.getElementById('hvCatsScroller'),hc2=document.getElementById('hvCatsGrid');
      if((!hc1||!hc1.childElementCount)&&(!hc2||!hc2.childElementCount))_palAfterFirstPaint(hvRenderCats);
      else hvRenderCats();
      hvRenderOfertas();
      _bnavSet('home');
      if(typeof _saveAppState==='function')_saveAppState();
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    if(tab==='ofertas'){
      if(!PRODS.length){showLoader();_ensureCatalogSync();}
      _prev('minorista');
      document.body.classList.remove('hv-home','hv-favoritos');
      document.body.classList.add('hv-ofertas');
      _activeOfertasMes=true;
      activeCatId=null;
      currentTab='ofertas';
      document.querySelectorAll('#mainTabs .may-tab').forEach(function(b){b.classList.remove('active');});
      var tOf=document.getElementById('tabOfertas');
      if(tOf&&tOf.offsetParent!==null){ tOf.classList.add('active'); try{_setPill(tOf);}catch(e){} } // desktop: la pill va a Ofertas
      else{ var hpill=document.getElementById('tabsPill'); if(hpill)hpill.style.setProperty('--pill-w','0px'); _pillX=null;_pillW=null; } // mobile: sin tab activa, pill oculta
      renderOfertasView();
      _bnavSet('ofertas');
      if(typeof _saveAppState==='function')_saveAppState();
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    if(tab==='favoritos'){
      if(!PRODS.length)_ensureCatalogSync();
      _prev('minorista');
      document.body.classList.remove('hv-home','hv-ofertas');
      document.body.classList.add('hv-favoritos');
      _activeOfertasMes=false;
      activeCatId=null;
      currentTab='favoritos';
      document.querySelectorAll('#mainTabs .may-tab').forEach(function(b){b.classList.remove('active');});
      var tFav=document.getElementById('tabFavoritos');
      if(tFav&&tFav.offsetParent!==null){ tFav.classList.add('active'); try{_setPill(tFav);}catch(e){} } // desktop: la pill va a Favoritos
      else{ var fpill=document.getElementById('tabsPill'); if(fpill)fpill.style.setProperty('--pill-w','0px'); _pillX=null;_pillW=null; } // mobile: sin tab activa, pill oculta
      renderWishlistView();
      _bnavSet('favoritos');
      if(typeof _saveAppState==='function')_saveAppState();
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    var resetCatalog=tab==='minorista'&&(activeCatId||_activeOfertasMes);
    if(tab==='minorista'&&!PRODS.length){showLoader();_ensureCatalogSync();}
    document.body.classList.remove('hv-home','hv-ofertas','hv-favoritos');
    _activeOfertasMes=false;
    var thx=document.getElementById('tabHome'); if(thx) thx.classList.remove('active');
    var tOfx=document.getElementById('tabOfertas'); if(tOfx) tOfx.classList.remove('active');
    var tFavx=document.getElementById('tabFavoritos'); if(tFavx) tFavx.classList.remove('active');
    _prev(tab);
    if(tab==='minorista')renderCatsUI({sidebar:true});
    if(resetCatalog)volverInicio();
    else if(tab==='minorista'&&!activeCatId&&!searchTerm)renderCarruseles();
    try{ var act=document.querySelector('#mainTabs .may-tab.active'); if(act) _setPill(act); }catch(e){}
    _bnavSet(tab==='recetas' ? 'recetas' : 'minorista');
  };
})();
// La navegación visible también forma parte del historial del navegador.
(function(){
  var _prev=window.switchTab;
  window.switchTab=function(tab){
    var before=_palBuildPageState();
    var beforeKey=[before.view,before.tab,before.catId||''].join(':');
    if(!_palHistoryApplying)_palReplacePageState();
    _prev(tab);
    var after=_palBuildPageState();
    var afterKey=[after.view,after.tab,after.catId||''].join(':');
    if(beforeKey!==afterKey){
      _restartNavIcon(document.querySelector('#mainTabs .may-tab.active .may-tab-icon'));
      if(!_palHistoryApplying)_palPushPageState();
    }
  };
})();
function selectOfertasMes(productId){
  window.switchTab('ofertas');
  if(productId!=null&&!_palHistoryApplying)history.replaceState(_palBuildPageState({productId:productId}),'');
  if(productId!=null){
    setTimeout(function(){
      var card=document.getElementById('of_'+productId);
      if(!card)return;
      card.scrollIntoView({behavior:'smooth',block:'center'});
      card.classList.add('highlight-card');
      setTimeout(function(){card.classList.remove('highlight-card');},2200);
    },80);
  }
}
window.selectOfertasMes=selectOfertasMes;
// Buscar desde el header compacto estando en Home u Ofertas → saltar a Productos
(function(){
  if(typeof window.compactOnSearch==='function'){
    var _o=window.compactOnSearch;
    window.compactOnSearch=function(v){
      // Inspiración ("recetas") no tiene clase propia en <body> como sí tienen Home/Ofertas/Favoritos,
      // por eso se detecta con currentTab en vez de una clase.
      var _tab=(typeof currentTab!=='undefined')?currentTab:'';
      if((document.body.classList.contains('hv-home')||document.body.classList.contains('hv-ofertas')||document.body.classList.contains('hv-favoritos')||_tab==='recetas') && v && String(v).trim()){
        // La búsqueda va a reemplazar el catálogo enseguida: no construir antes las 542 cards.
        _catalogSkipNextAllRender=true;
        try{window.switchTab('minorista');}finally{_catalogSkipNextAllRender=false;}
      }
      _o(v);
    };
  }
})();
_palAfterFirstPaint(hvRenderCats);
setTimeout(hvRenderOfertas, 1600);
setTimeout(hvRenderOfertas, 4500);
// Janitor del boot: mientras estemos en Home, la pill y el active deben quedar en Home
setTimeout(function(){
  if(!document.body.classList.contains('hv-home')) return;
  document.querySelectorAll('#mainTabs .may-tab').forEach(function(b){ b.classList.toggle('active', b.id==='tabHome'); });
  var th=document.getElementById('tabHome'); if(th){ try{ _setPill(th); }catch(e){} }
}, 700);

/* ═══ TESTER2: catálogo = TODOS los productos por rubro (alfabético) ═══ */
// Declaración de función (no asignación): así el hoisting hace que ESTA versión
// gane siempre, incluso cuando se llama desde el render instantáneo por caché
// (sincronizarDesdeSheets) que ocurre más arriba en el archivo, antes de que el
// código llegue a esta línea. Con "renderCarruseles = function(){...}" esa
// llamada temprana usaba la versión vieja (carruseles por rubro) por un instante.
function renderCarruseles(){
  if(_carRotationInterval){clearInterval(_carRotationInterval);_carRotationInterval=null;}
  for(const k in _carState)delete _carState[k];
  try{ hvRenderOfertas(); }catch(e){}
  if(document.body.classList.contains('hv-ofertas'))try{renderOfertasView();}catch(e){}
  if(document.body.classList.contains('hv-favoritos'))try{renderWishlistView();}catch(e){}
  var desktopArea=document.getElementById('desktopProdsArea');
  var mobileArea=document.getElementById('mobileProdsArea');
  if(!PRODS.length){
    _catalogStopBatches();
    desktopArea.innerHTML='';
    mobileArea.innerHTML='';
    _catalogRenderMode=null;_catalogRenderedProds=null;_catalogRenderedCats=null;
    return;
  }
  // Home, Ofertas, Favoritos, Inspiración y las URLs directas no necesitan el catálogo completo.
  // Se construye recién cuando Productos queda realmente visible.
  if(!_catalogAllViewIsVisible())return;
  var isMobile=window.innerWidth<768;
  var mode=isMobile?'mobile':'desktop';
  var activeArea=isMobile?mobileArea:desktopArea;
  var inactiveArea=isMobile?desktopArea:mobileArea;
  if(_catalogRenderMode===mode&&_catalogRenderedProds===PRODS&&_catalogRenderedCats===CATS&&activeArea.dataset.catalogView==='all'&&activeArea.childElementCount){
    mobileArea.classList.remove('hidden');
    return;
  }
  _catalogStopBatches();
  var grouped=Object.create(null);
  PRODS.forEach(function(p){(grouped[p[1]]||(grouped[p[1]]=[])).push(p);});
  function buildProgressive(prefix){
    activeArea.innerHTML=`<div class="catalog-intro">
      <div>
        <h1>Todos los productos</h1>
        <p>Explorá el catálogo completo o elegí una categoría para filtrar.</p>
      </div>
      <button class="catalog-filter-btn" onclick="toggleCatsDropdown()"><span aria-hidden="true">☰</span> Categorías</button>
    </div>
    <div class="catalog-progressive-sections"></div>
    <div class="catalog-load-sentinel" aria-hidden="true" style="height:1px"></div>`;
    activeArea.setAttribute('aria-busy','true');
    var sections=activeArea.querySelector('.catalog-progressive-sections');
    var sentinel=activeArea.querySelector('.catalog-load-sentinel');
    var queue=[...CATS].sort((a,b)=>a.n.localeCompare(b.n,'es')).map(function(cat){
      return {cat:cat,prods:(grouped[cat.id]||[]).slice().sort((a,b)=>a[2].localeCompare(b[2],'es'))};
    }).filter(function(item){return item.prods.length;});
    var catIndex=0,prodIndex=0,renderedCount=0,currentGrid=null,pending=false;
    var token=_catalogBatchToken;

    function openCategory(item){
      var holder=document.createElement('div');
      holder.innerHTML=`<section class="allcat-sec" id="catalogo-${prefix}-${item.cat.id}">
        <div class="allcat-head">
          <img class="allcat-img" src="cat-${item.cat.id}.png" alt="" loading="lazy" onerror="this.style.display='none'">
          <span class="allcat-name">${item.cat.n}</span>
          <span class="allcat-count">${item.prods.length}</span>
        </div>
        <div class="prod-grid"></div>
      </section>`;
      var section=holder.firstElementChild;
      sections.appendChild(section);
      currentGrid=section.querySelector('.prod-grid');
    }

    function finish(){
      activeArea.removeAttribute('aria-busy');
      if(sentinel&&sentinel.parentNode)sentinel.remove();
      if(_catalogBatchObserver){_catalogBatchObserver.disconnect();_catalogBatchObserver=null;}
    }

    function appendBatch(forceAll){
      if(pending||token!==_catalogBatchToken||catIndex>=queue.length)return;
      if(!forceAll&&!_catalogAllViewIsVisible())return;
      pending=true;
      var budget=forceAll?PRODS.length:(isMobile?12:16);
      while(budget>0&&catIndex<queue.length){
        var item=queue[catIndex];
        if(!currentGrid)openCategory(item);
        var take=Math.min(budget,item.prods.length-prodIndex);
        var batch=item.prods.slice(prodIndex,prodIndex+take);
        currentGrid.insertAdjacentHTML('beforeend',batch.map(function(p,i){return renderCard(p,prefix,renderedCount+i<4);}).join(''));
        renderedCount+=take;
        prodIndex+=take;
        budget-=take;
        if(prodIndex>=item.prods.length){catIndex++;prodIndex=0;currentGrid=null;}
      }
      pending=false;
      if(catIndex>=queue.length){finish();return;}
      // Si el lote todavía no llenó la zona próxima al viewport, sumar otro sin esperar scroll.
      requestAnimationFrame(function(){
        if(token===_catalogBatchToken&&sentinel&&sentinel.getBoundingClientRect().top<window.innerHeight+1000)appendBatch(false);
      });
    }

    appendBatch(false);
    if('IntersectionObserver' in window){
      _catalogBatchObserver=new IntersectionObserver(function(entries){
        if(entries.some(function(entry){return entry.isIntersecting;}))appendBatch(false);
      },{rootMargin:'1000px 0px'});
      _catalogBatchObserver.observe(sentinel);
    }else{
      appendBatch(true);
    }
  }
  buildProgressive(isMobile?'mb':'dt');
  activeArea.dataset.catalogView='all';
  inactiveArea.innerHTML='';
  inactiveArea.removeAttribute('data-catalog-view');
  _catalogRenderMode=mode;
  _catalogRenderedProds=PRODS;
  _catalogRenderedCats=CATS;
  mobileArea.classList.remove('hidden');
};

// Al cruzar el breakpoint se construye solo la versión que pasa a ser visible.
(function(){
  var wasMobile=window.innerWidth<768;
  var resizeTimer=null;
  window.addEventListener('resize',function(){
    var isMobile=window.innerWidth<768;
    if(isMobile===wasMobile)return;
    wasMobile=isMobile;
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(function(){
      if(currentTab!=='minorista'||document.body.classList.contains('hv-home')||document.body.classList.contains('hv-ofertas')||document.body.classList.contains('hv-favoritos')||searchTerm)return;
      if(!activeCatId){renderCarruseles();return;}
      var cat=CATS.find(function(c){return c.id===activeCatId;});
      if(!cat)return;
      var activeArea=isMobile?document.getElementById('mobileProdsArea'):document.getElementById('desktopProdsArea');
      var inactiveArea=isMobile?document.getElementById('desktopProdsArea'):document.getElementById('mobileProdsArea');
      activeArea.innerHTML=renderProdsHTML(cat,PRODS.filter(function(p){return p[1]===activeCatId;}),isMobile?'mb':'dt');
      activeArea.dataset.catalogView='category';
      inactiveArea.innerHTML='';
      inactiveArea.removeAttribute('data-catalog-view');
      document.getElementById('mobileProdsArea').classList.remove('hidden');
    },100);
  },{passive:true});
})();

// Cargar datos mayorista desde Apps Script (referencia la hoja por nombre, no GID)
function cargarMayorista() {
  // ── PASO 1: mostrar caché local INMEDIATAMENTE si existe ──
  let _mayYaRenderizado = false;
  try {
    const raw = localStorage.getItem('paladear_may_v1');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.cats && data.prods && data.prods.length) {
        CATS_MAY = data.cats; PRODS_MAY = data.prods;
        if (data.bultoMap) MAY_BULTO_MAP = data.bultoMap;
        _mayYaRenderizado = true;
        renderMayUI();
        console.log('📦 Mayorista desde caché local — actualizando en background...');
      }
    }
  } catch(e) {}

  _cargarInfoMay().then(infoMay => {
    function _procesarCSVMayorista(csv) {
      const filas = _parseCSV(csv);
      const prodsTemp = [];
      let pid = 1000; // IDs mayoristas empiezan en 1000
      filas.forEach((cols, idx) => {
        if (idx === 0 || cols.length < 5) return;
        const rubro  = (cols[2] || '').replace(/^"|"$/g, '').trim().toUpperCase();
        const artId  = (cols[3] || '').replace(/^"|"$/g, '').trim();
        const nombre = (cols[4] || '').replace(/^"|"$/g, '').trim();
        const precio = _precio(cols[5] || '');
        if (!nombre || !precio || !rubro) return;
        const cat = RUBRO_MAP[rubro];
        if (!cat) return;

        const inf          = infoMay[artId] || infoMay[_norm(nombre)] || {};
        const bulto        = inf.bulto  || 1;
        const sabores      = inf.sabores || null;
        const imgUrl       = inf.imagen ? _prodImg(artId,320) : '';
        const nombreFinal  = inf.nombre  || nombre;
        const precioTotal  = precio * bulto;

        const opts = {};
        opts[_bultoLabel(bulto, inf.bultoUnidad || 'unidad')] = [precioTotal, precioTotal];

        prodsTemp.push([
          pid++, cat.id, nombreFinal, rubro, 'und', false, imgUrl,
          opts, '', sabores, false, false,
          { bulto, bultoUnidad: inf.bultoUnidad || 'unidad', artId }
        ]);

        MAY_BULTO_MAP[artId] = { bulto, nombre: nombreFinal, sabores, imagen: imgUrl, precio };
        if (_norm(nombreFinal) !== artId) MAY_BULTO_MAP[_norm(nombreFinal)] = MAY_BULTO_MAP[artId];
      });

      PRODS_MAY = prodsTemp;
      const catIds = [...new Set(PRODS_MAY.map(p => p[1]))];
      CATS_MAY = Object.values(RUBRO_MAP).filter(c => catIds.includes(c.id));
      console.log('✅ Lista Mayorista: ' + PRODS_MAY.length + ' productos, ' + CATS_MAY.length + ' categorías');
      // Guardar en localStorage para uso offline
      try{localStorage.setItem('paladear_may_v1',JSON.stringify({cats:CATS_MAY,prods:PRODS_MAY,bultoMap:MAY_BULTO_MAP,ts:Date.now()}));}catch(e){}
      renderMayUI();
    }

    function _mostrarErrorMayorista() {
      if (_mayYaRenderizado) {
        // Ya había caché visible: solo mostrar aviso offline
        const t = document.createElement('div');
        t.textContent = '📦 Sin conexión — mostrando últimos precios guardados';
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#547692;color:#fff;padding:9px 18px;border-radius:20px;font-size:13px;z-index:9999;text-align:center;max-width:88vw;box-shadow:0 2px 8px rgba(0,0,0,.25)';
        document.body.appendChild(t); setTimeout(() => t.remove(), 5000);
        return;
      }
      const area = document.getElementById('mayDesktopProdsArea');
      const mob  = document.getElementById('mayMobileProdsArea');
      if (area) area.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted-fg)">No se pudo cargar la Lista Mayorista.<br>Por favor contactanos por WhatsApp.</div>';
      if (mob)  mob.innerHTML  = '';
    }

    // Cargar por nombre de hoja (sin GID — "Mayorista" nunca cambia aunque cambies el Excel)
    const mayUrl = 'https://docs.google.com/spreadsheets/d/1aANKgaQFoiAixKQvPlRpZ0_PBQhES-iBWqOG1bsuLyg/gviz/tq?tqx=out:csv&sheet=Mayorista&t=' + Date.now();
    fetch(mayUrl, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(csv => _procesarCSVMayorista(csv))
      .catch(err => {
        console.warn('⚠️ Error cargando mayorista, reintentando en 3s...', err);
        setTimeout(() => {
          fetch(mayUrl, { cache: 'no-store' })
            .then(r => r.text())
            .then(csv => _procesarCSVMayorista(csv))
            .catch(() => _mostrarErrorMayorista());
        }, 3000);
      });
  });
}

function _cargarInfoMay() {
  return new Promise(resolve => {
    function _procesar(csv) {
      const filas = _parseCSV(csv);
      const mapa = {};
      filas.forEach((cols, idx) => {
        if (idx === 0 || cols.length < 3) return;
        const artId = (cols[0] || '').replace(/^"|"$/g, '').trim();
        const nombre = (cols[1] || '').replace(/^"|"$/g, '').trim();
        const bultoRaw = (cols[2] || '').replace(/^"|"$/g, '').trim();
        // Parsear como float, soportando coma decimal argentina (2,5 → 2.5)
        const bulto = parseFloat(bultoRaw.replace(',', '.')) || 1;
        const bultoUnidad = /kg|kgr|kilo/i.test(bultoRaw) ? 'kg' : 'unidad';
        const saboresStr = (cols[3] || '').replace(/^"|"$/g, '').trim();
        const imgRaw = (cols[4] || '').replace(/^"|"$/g, '').trim();
        if (!artId) return;
        const entry = {
          nombre, bulto, bultoUnidad,
          sabores: saboresStr ? saboresStr.split('/').map(s => s.trim()).filter(Boolean) : null,
          imagen: _driveToImg(imgRaw)
        };
        mapa[artId] = entry;
        if (_norm(nombre) !== artId) mapa[_norm(nombre)] = entry;
      });
      resolve(mapa);
    }
    // Cargar directamente desde Sheet (GID estable, el usuario nunca reemplaza esta hoja)
    if (MAY_INFO_GID.includes('REEMPLAZAR')) { console.warn('ℹ️ MAY_INFO_GID no configurado.'); resolve({}); return; }
    const infoUrl = SHEET_BASE_URL + '?gid=' + MAY_INFO_GID + '&single=true&output=csv';
    fetch(infoUrl + '&t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.text()).then(csv => _procesar(csv))
      .catch(() => resolve({}));
  });
}

// Render UI mayorista
function renderMayUI() {
  renderMayCatsUI();
  renderMayCarrusel();
}

function renderMayCatsUI() {
  const isMobile = window.innerWidth < 768;
  const sidebarList = document.getElementById('mayCatsSidebarList');
  const dropdownGrid = document.getElementById('mayCatsDropdownGrid');
  
  if (!CATS_MAY.length) return;

  const sortedCats = [...CATS_MAY].sort((a, b) => a.n.localeCompare(b.n, 'es'));
  
  if (sidebarList) {
    sidebarList.innerHTML = sortedCats.map((cat, i) =>
      `<button class="cat-list-btn${cat.id === activeCatIdMay ? ' active' : ''}" style="background:var(--cat${i%4})" onclick="selectMayCat('${cat.id}')"><div class="nm">${cat.n}</div></button>`
    ).join('');
  }
  
  if (dropdownGrid) {
    dropdownGrid.innerHTML = sortedCats.map((cat, i) =>
      `<button class="cat-list-btn${cat.id === activeCatIdMay ? ' active' : ''}" style="background:var(--cat${i%4})" onclick="selectMayCat('${cat.id}');closeMayCatsDropdown()"><div class="nm">${cat.n}</div></button>`
    ).join('');
  }
}

function renderMayCarrusel() {
  const isMobile = window.innerWidth < 768;
  const desktop = document.getElementById('mayDesktopProdsArea');
  const mobile = document.getElementById('mayMobileProdsArea');
  
  if (!PRODS_MAY.length) {
    const msg = '<div style="padding:48px;text-align:center;color:var(--muted-fg);font-size:15px">🔄 Cargando productos mayoristas...</div>';
    if (desktop) desktop.innerHTML = msg;
    if (mobile) { mobile.innerHTML = msg; mobile.classList.remove('hidden'); }
    return;
  }
  
  if (!activeCatIdMay) {
    // Mostrar carrusel inicial con todos los rubros en orden alfabético
    let h = '', hMobile = '';
    const catIdsAll = [...new Set(PRODS_MAY.map(p => p[1]))];
    const catsSorted = catIdsAll
      .map(id => CATS_MAY.find(c => c.id === id))
      .filter(Boolean)
      .sort((a, b) => a.n.localeCompare(b.n, 'es'));
    // Limpiar estado de rotación anterior
    if (_carStateMay) {
      for (const k in _carStateMay) delete _carStateMay[k];
    } else {
      _carStateMay = {};
    }
    catsSorted.forEach((cat, i) => {
      const prods = PRODS_MAY.filter(p => p[1] === cat.id);
      if (!prods.length) return;
      const cid = 'carMay' + i;
      const cidM = 'carMayM' + i;
      // DESKTOP: 4 productos visibles con auto-rotación
      const shuffled = [...prods].sort(() => Math.random() - .5);
      _carStateMay[cid] = { prods: shuffled, cursor: 0 };
      const visibles = shuffled.slice(0, 4);
      h += `<div class="carousel-section">
        <button class="carousel-title carousel-title-btn" onclick="selectMayCat('${cat.id}')">${cat.n} <span style="font-size:16px;opacity:.7">›</span></button>
        <div class="carousel-wrap"><div class="carousel-track" id="${cid}">${visibles.map(_cardHTMLMay).join('')}</div></div>
      </div>`;
      // MOBILE: TODOS los productos en el track scrolleable
      const prodsSorted = [...prods].sort((a, b) => a[2].localeCompare(b[2], 'es', { sensitivity: 'base' }));
      hMobile += `<div class="carousel-section">
        <button class="carousel-title carousel-title-btn" onclick="selectMayCat('${cat.id}')">${cat.n} <span style="font-size:16px;opacity:.7">›</span></button>
        <div class="carousel-wrap"><div class="carousel-track" id="${cidM}">${prodsSorted.map(_cardHTMLMay).join('')}</div></div>
      </div>`;
    });
    if (desktop) desktop.innerHTML = h;
    if (mobile) { mobile.innerHTML = hMobile; mobile.classList.remove('hidden'); }
    // Auto-rotación desktop cada 12s
    if (_carRotationIntervalMay) clearInterval(_carRotationIntervalMay);
    if (!isMobile) _carRotationIntervalMay = setInterval(rotarCarruselesMay, 12000);
  } else {
    selectMayCat(activeCatIdMay);
  }
}

var _carStateMay = {};
var _carRotationIntervalMay = null;
function rotarCarruselesMay() {
  for (const cid in _carStateMay) {
    const track = document.getElementById(cid);
    if (!track) continue;
    const st = _carStateMay[cid];
    if (st.prods.length <= 4) continue;
    st.cursor = (st.cursor + 4) % st.prods.length;
    const nuevos = [];
    for (let k = 0; k < 4; k++) nuevos.push(st.prods[(st.cursor + k) % st.prods.length]);
    track.style.transition = 'opacity .4s ease';
    track.style.opacity = '0';
    setTimeout(() => {
      track.innerHTML = nuevos.map(_cardHTMLMay).join('');
      track.style.opacity = '1';
    }, 400);
  }
}

function _cardHTMLMay(p) {
  const opts = Object.keys(p[7]);
  const precio = opts.length ? p[7][opts[0]][0] : 0;
  const hasSrc = p[6] && p[6].startsWith('http');
  const cat = CATS_MAY.find(c => c.id === p[1]);
  const bulto = p[12] ? p[12].bulto : 1;
  return `<div class="carousel-card" onclick="selectMayCat('${p[1]}', ${p[0]})">
    <div class="carousel-card-img">${hasSrc ? `<img src="${p[6]}" alt="${p[2]}" onerror="this.parentNode.innerHTML='🌿'" loading="lazy" decoding="async">` : (cat ? cat.ic : '🌿')}</div>
    <div class="carousel-card-body">
      <div class="carousel-card-name">${_tc(p[2])}</div>
      <div class="carousel-card-cat">${cat ? cat.n : ''}</div>
      <span class="bulto-badge">📦 ${opts[0] || 'Bulto'}</span>
      <div class="carousel-card-price">$${fmt(precio)}</div>
    </div>
  </div>`;
}

function selectMayCat(catId, productId, navOpts) {
  navOpts=navOpts||{};
  var trackHistory=navOpts.history!==false&&!_palHistoryApplying;
  if(trackHistory&&!navOpts.preservePrevious)_palReplacePageState();
  // Guardar scroll del home mayorista para restaurarlo al volver
  if(!activeCatIdMay){try{sessionStorage.setItem('paladear_homemay_scrollY',String(window.scrollY));}catch(e){}}
  activeCatIdMay = catId;
  renderMayCatsUI();
  // Push state para que el botón "atrás" del navegador vuelva al inicio del mayorista
  if(trackHistory)_palPushPageState({view:'catMay',tab:'mayorista',catId:catId,productId:productId||null});
  _saveAppState();

  const prods = PRODS_MAY.filter(p => p[1] === catId).sort((a, b) => a[2].localeCompare(b[2], 'es', { sensitivity: 'base' }));
  const cat   = CATS_MAY.find(c => c.id === catId);
  const isMobile = window.innerWidth < 768;
  const prefix   = isMobile ? 'm' : '';

  const backBtn = `<button class="back-btn" onclick="volverMayInicio()">← Volver al inicio</button>`;

  function _buildGrid(sfx) {
    let h = backBtn + `<h2 style="font-size:22px;color:var(--azul-dark);margin:12px 0 16px;font-weight:700">${cat ? cat.n : catId}</h2>`;
    if (!prods.length) {
      h += '<div style="text-align:center;padding:48px;color:var(--muted-fg)">No hay productos en esta categoría</div>';
    } else {
      h += '<div class="prod-grid">';
      prods.forEach(p => { h += renderCardMay(p, sfx); });
      h += '</div>';
    }
    return h;
  }

  const desktop = document.getElementById('mayDesktopProdsArea');
  const mobile  = document.getElementById('mayMobileProdsArea');

  if (desktop) desktop.innerHTML = _buildGrid('');
  if (mobile)  { mobile.innerHTML = _buildGrid('m'); mobile.classList.remove('hidden'); }

  // Scroll: si viene productId, scrollear a esa card; si no, al área
  const area = isMobile ? mobile : desktop;
  if (area) {
    if (productId != null) {
      setTimeout(() => {
        const sfx   = isMobile ? '_m' : '';
        const card  = document.getElementById('may_' + productId + sfx);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-card');
          setTimeout(() => card.classList.remove('highlight-card'), 2200);
        } else {
          area.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
    } else {
      area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
window.selectMayCat = selectMayCat;

function volverMayInicio() {
  activeCatIdMay = null;
  renderMayCatsUI();
  renderMayCarrusel();
  const sec = document.getElementById('mayoristaSection');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.volverMayInicio = volverMayInicio;

function renderCardMay(p, suffix) {
  const opts      = Object.keys(p[7]);
  const precio    = opts.length ? p[7][opts[0]][0] : 0;
  const hasSrc    = p[6] && p[6].startsWith('http');
  const sabores   = p[9];
  const bulto     = p[12] ? p[12].bulto : 1;
  const bultoLabel = opts[0] || ('Bulto x' + bulto);
  const id        = 'may_' + p[0] + (suffix ? '_' + suffix : '');
  const cartItem  = cartMay.find(i => i.pid === p[0]);
  const acumQty   = cartItem ? cartItem.c : 0;
  const acumInfo  = acumQty > 0 ? `<span class="acum-badge">🛒 ${acumQty} ${acumQty === 1 ? 'bulto' : 'bultos'}</span>` : '';
  const cat       = CATS_MAY.find(c => c.id === p[1]);

  let h = `<div class="pcard" id="${id}">`;

  // Imagen
  h += `<div class="pcard-img" onclick="zoomImg(this)" data-src="${hasSrc ? p[6] : ''}">${hasSrc
    ? `<img src="${p[6]}" alt="${p[2]}" onerror="this.parentNode.innerHTML='${cat ? cat.ic : '🌿'}'" loading="lazy">`
    : (cat ? cat.ic : '🌿')}</div>`;

  h += `<div class="pcard-body">`;

  // Nombre
  h += `<div class="pcard-head"><div class="pcard-name">${_tc(p[2])}</div></div>`;

  // Rubro
  const _mayBrand = cat ? cat.n : p[3];
  if(_mayBrand && _mayBrand !== 'Varios' && _mayBrand !== 'Granel') h += `<div class="pcard-brand">${_mayBrand}</div>`;

  // Badge bulto
  h += `<div style="margin:6px 0 2px"><span class="bulto-badge">📦 ${bultoLabel}</span></div>`;

  // Selector de sabor si aplica
  if (sabores && sabores.length) {
    h += `<div class="sabor-row" style="margin-top:6px"><label class="sabor-label" for="${id}_sab">Sabor:</label>
      <select class="sabor-select" id="${id}_sab"><option value="">Seleccionar...</option>`;
    sabores.forEach(s => { h += `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`; });
    h += `</select></div>`;
  }

  // Precio
  h += `<div class="prices"><div>
    <span class="price-label">Precio Mayorista</span>
    <div class="price-min" style="color:var(--azul-dark)">$${fmt(precio)}</div>
  </div></div>`;

  // Cantidad + agregar
  h += `<div class="qty-row">
    <button class="qty-btn" onclick="chgQtyMay('${id}',-1)">−</button>
    <span class="qty-val" id="${id}_q">1</span>
    <button class="qty-btn" onclick="chgQtyMay('${id}',1)">+</button>
    ${acumInfo}
  </div>`;
  h += `<button class="add-btn" id="${id}_ab" onclick="addToCartMay(${p[0]},'${id}')">🛒 Agregar al pedido</button>`;

  // Acciones si ya está en el carrito
  if (cartItem) {
    h += `<div class="card-cart-actions">
      <button class="card-del-btn" onclick="delFromCartMay(${p[0]})" title="Quitar del carrito">${TRASH_SVG}</button>
      <button class="card-edit-btn" onclick="openCartMay()">📋 Ver pedido</button>
    </div>`;
  }

  h += `</div></div>`;
  return h;
}
window.renderCardMay = renderCardMay;

function chgQtyMay(id, d) {
  const el = document.getElementById(id + '_q');
  let v = parseInt(el.textContent) + d;
  if (v < 1) v = 1;
  el.textContent = v;
}
window.chgQtyMay = chgQtyMay;

function addToCartMay(pid, elId) {
  const p = PRODS_MAY.find(x => x[0] === pid);
  if (!p) return;
  const qty = parseInt(document.getElementById(elId + '_q').textContent) || 1;
  const sabSelect = document.getElementById(elId + '_sab');
  const sabor = sabSelect ? sabSelect.value : '';
  const bulto = p[12] ? p[12].bulto : 1;
  const opts = Object.keys(p[7]);
  const precio = opts.length ? p[7][opts[0]][0] : 0;
  const key = 'may_' + pid + (sabor ? '-' + sabor : '');
  const nombreConSabor = sabor ? p[2] + ' (' + sabor + ')' : p[2];

  // Guardar total previo para detectar hito $250k
  const prevTotal = cartMay.reduce((a, i) => a + i.l1 * i.c, 0);

  const ex = cartMay.find(i => i.key === key);
  if (ex) {
    ex.c += qty;
  } else {
    cartMay.push({ key, pid, n: nombreConSabor, c: qty, l1: precio, bulto, sabor, bultoLabel: opts[0] || 'Bulto x' + bulto });
  }
  _reRenderCardMay(pid);
  updateCartMayCount();
  // Flash del botón
  const btn = document.getElementById(elId + '_ab');
  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = '✓ Agregado!';
    setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = '🛒 Agregar al pedido'; }, 1400);
  }

  // ── FLY-TO-CART ANIMATION (mayorista) ──
  (function(){
    const cardEl = document.getElementById(elId);
    const fab = document.getElementById('cart-fab-may');
    if (!cardEl || !fab) return;
    const imgEl = cardEl.querySelector('.pcard-img img, .pcard-img');
    if (!imgEl) return;
    const srcRect = imgEl.getBoundingClientRect();
    const destRect = fab.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'fly-img';
    if (imgEl.tagName === 'IMG' && imgEl.src) {
      const inner = document.createElement('img');
      inner.src = imgEl.src;
      inner.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:50%';
      fly.appendChild(inner);
    } else {
      fly.textContent = '📦';
      fly.style.fontSize = '28px';
      fly.style.display = 'flex';
      fly.style.alignItems = 'center';
      fly.style.justifyContent = 'center';
    }
    const startX = srcRect.left + srcRect.width / 2 - 30;
    const startY = srcRect.top + srcRect.height / 2 - 30;
    const endX = destRect.left + destRect.width / 2 - 30;
    const endY = destRect.top + destRect.height / 2 - 30;
    fly.style.cssText += `;left:${startX}px;top:${startY}px;`;
    document.body.appendChild(fly);
    const dur = 650; const t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / dur, 1);
      const ease = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const mx = (startX + endX) / 2;
      const my = Math.min(startY, endY) - 80;
      const x = (1-ease)*(1-ease)*startX + 2*(1-ease)*ease*mx + ease*ease*endX;
      const y = (1-ease)*(1-ease)*startY + 2*(1-ease)*ease*my + ease*ease*endY;
      fly.style.left = x + 'px';
      fly.style.top = y + 'px';
      fly.style.transform = `scale(${1 - ease * 0.75})`;
      fly.style.opacity = t > 0.75 ? (1 - (t - 0.75) / 0.25) : 1;
      if (t < 1) { requestAnimationFrame(step); }
      else {
        fly.remove();
        fab.style.transform = 'scale(1.3)';
        setTimeout(() => { fab.style.transform = ''; }, 200);
      }
    }
    requestAnimationFrame(step);
  })();

  // ── HITO $250.000 ──
  const newTotal = cartMay.reduce((a, i) => a + i.l1 * i.c, 0);
  if (prevTotal < MIN_COMPRA_MAYORISTA && newTotal >= MIN_COMPRA_MAYORISTA) {
    _triggerMayMinimoToast();
  }
}
window.addToCartMay = addToCartMay;

function _triggerMayMinimoToast() {
  var toast = document.getElementById('mayMinimoToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mayMinimoToast';
    toast.className = 'may-toast';
    toast.innerHTML =
      '<div style="font-size:40px;margin-bottom:6px">🎉</div>' +
      '<div class="may-toast-title" style="font-size:18px;letter-spacing:1px">¡MÍNIMO<br>ALCANZADO!</div>' +
      '<div style="margin-top:10px;font-size:13px;color:var(--muted-fg);line-height:1.5">Superaste los <strong>$250.000</strong><br>Ya podés enviar tu pedido mayorista 📦</div>';
    document.body.appendChild(toast);
  }
  toast.classList.remove('hide');
  toast.classList.add('show');
  setTimeout(function() {
    toast.classList.add('hide');
    setTimeout(function() { toast.classList.remove('show','hide'); }, 400);
  }, 4000);

  // Confetti desde el centro
  if (!_confCanvas) {
    _confCanvas = document.createElement('canvas');
    _confCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998';
    document.body.appendChild(_confCanvas);
  }
  _confCanvas.width = window.innerWidth;
  _confCanvas.height = window.innerHeight;
  var ctx = _confCanvas.getContext('2d');
  ctx.clearRect(0, 0, _confCanvas.width, _confCanvas.height);
  setTimeout(function() {
    var pieces = [];
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight * 0.38;
    for (var i = 0; i < 180; i++) {
      var angle = (Math.random() * 300 - 240) * (Math.PI / 180);
      var speed = 4 + Math.random() * 8;
      pieces.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 9, h: 5 + Math.random() * 7,
        rot: Math.random() * 360, drot: (Math.random() - 0.5) * 14,
        color: _CONF_COLORS[Math.floor(Math.random() * _CONF_COLORS.length)],
        alpha: 1, round: Math.random() > 0.4, delay: Math.floor(Math.random() * 10)
      });
    }
    var frame = 0;
    function tick() {
      ctx.clearRect(0, 0, _confCanvas.width, _confCanvas.height);
      var alive = false;
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        if (frame < p.delay) continue;
        p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.vx *= 0.99; p.rot += p.drot;
        if (frame > 55) p.alpha = Math.max(0, p.alpha - 0.016);
        if (p.alpha <= 0) continue;
        alive = true;
        ctx.save(); ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        if (p.round) { ctx.beginPath(); ctx.ellipse(0,0,p.w/2,p.h/2,0,0,Math.PI*2); ctx.fill(); }
        else { ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); }
        ctx.restore();
      }
      frame++;
      if (alive || frame < 25) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, _confCanvas.width, _confCanvas.height);
    }
    requestAnimationFrame(tick);
  }, 100);
}

function delFromCartMay(pid) {
  cartMay = cartMay.filter(i => i.pid !== pid);
  _reRenderCardMay(pid);
  updateCartMayCount();
}
window.delFromCartMay = delFromCartMay;

function _reRenderCardMay(pid) {
  const p = PRODS_MAY.find(x => x[0] === pid);
  if (!p) return;
  // Desktop card (no suffix)
  const cardEl = document.getElementById('may_' + pid);
  if (cardEl) {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderCardMay(p);
    cardEl.parentNode.replaceChild(tmp.firstChild, cardEl);
  }
  // Mobile card (suffix 'm')
  const cardElM = document.getElementById('may_' + pid + '_m');
  if (cardElM) {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderCardMay(p, 'm');
    cardElM.parentNode.replaceChild(tmp.firstChild, cardElM);
  }
}

function updateCartMayCount() {
  const count = cartMay.reduce((a, i) => a + i.c, 0);
  const el = document.getElementById('cartCountMay');
  if (el) el.textContent = count;
  const fab = document.getElementById('cart-fab-may');
  if (fab) { fab.style.transform = 'scale(1.15)'; setTimeout(() => { fab.style.transform = ''; }, 250); }
  _saveCartMay();
}

function openCartMay() {
  document.getElementById('cartOverlayMay').classList.add('open');
  document.getElementById('cartPanelMay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartMay();
  _palPushOverlay('cartMay');
}
window.openCartMay = openCartMay;

function closeCartMay() {
  document.getElementById('cartOverlayMay').classList.remove('open');
  document.getElementById('cartPanelMay').classList.remove('open');
  document.body.style.overflow = '';
}
window.closeCartMay = closeCartMay;

// Mapa de productos minoristas por productId, construido bajo demanda.
// (_MIN_BY_ID se declara al tope del IIFE para evitar TDZ en el init.)
function _buildMinByIdMap() {
  const m = {};
  if (PRODS && PRODS.length) {
    PRODS.forEach(p => {
      const id = p[12] && p[12].productId;
      if (id) m[id] = p;
    });
  }
  return m;
}
function _getMinForArtId(artId) {
  if (!artId) return null;
  if (!_MIN_BY_ID || !Object.keys(_MIN_BY_ID).length) {
    _MIN_BY_ID = _buildMinByIdMap();
  }
  return _MIN_BY_ID[artId] || null;
}

// Calcula el costo equivalente que tendría el item si se comprara a precio minorista.
// Devuelve 0 si el producto mayorista no tiene equivalente minorista (por ID).
function _itemMayMinoristaEquiv(it) {
  const mayProd = PRODS_MAY.find(x => x[0] === it.pid);
  if (!mayProd) return 0;
  const artId = mayProd[12] && mayProd[12].artId;
  if (!artId) return 0;
  const minProd = _getMinForArtId(artId);
  if (!minProd) return 0;

  const opts = minProd[7];
  const optKeys = Object.keys(opts);
  if (!optKeys.length) return 0;

  // Detectar la unidad natural del bulto desde el nombre mayorista (x kg, x 500g, etc.)
  const nm = (mayProd[2] || '').toLowerCase();
  let matchOpt = null;
  const mWith = nm.match(/x\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|und)\b/i);
  const mNoQty = !mWith && nm.match(/x\s*(kg|g|ml|l|und)\b/i);
  if (mWith) {
    const qty = mWith[1].replace(',', '.');
    const unit = mWith[2].toLowerCase();
    const tries = [
      qty + unit,
      qty + ' ' + unit,
      (unit === 'kg' && qty === '1') ? '1 kg' : null,
      (unit === 'und' && qty === '1') ? '1 und' : null
    ].filter(Boolean);
    for (const t of tries) {
      const found = optKeys.find(k => k.replace(/\s+/g,'').toLowerCase() === t.replace(/\s+/g,'').toLowerCase());
      if (found) { matchOpt = found; break; }
    }
  } else if (mNoQty) {
    const unit = mNoQty[1].toLowerCase();
    matchOpt = optKeys.find(k => k.replace(/\s+/g,'').toLowerCase() === ('1' + unit)) ||
               optKeys.find(k => k.replace(/\s+/g,'').toLowerCase() === ('1 ' + unit).replace(/\s+/g,''));
  }
  if (!matchOpt) matchOpt = optKeys.find(k => /^1\s*und$/i.test(k));
  if (!matchOpt) matchOpt = optKeys.find(k => /^1\s*kg$/i.test(k));
  if (!matchOpt) matchOpt = optKeys[0];

  const minPricePerNatUnit = opts[matchOpt][0];
  return Math.round(minPricePerNatUnit * (it.bulto || 1) * it.c);
}

function renderCartMay() {
  const body   = document.getElementById('cartBodyMay');
  const footer = document.getElementById('cartFooterMay');
  if (!cartMay.length) {
    body.innerHTML = '<div class="cart-empty"><span class="big">📦</span><div style="font-size:16px;font-weight:600;margin-bottom:6px">Tu pedido mayorista está vacío</div><div style="font-size:14px;color:var(--muted-fg)">Agregá productos para armar tu pedido</div></div>';
    footer.classList.add('hidden');
    return;
  }
  const total  = cartMay.reduce((a, i) => a + i.l1 * i.c, 0);
  // Sin equivalente minorista: precio ficticio = mayorista / 0.65 → ahorro = 35% sobre minorista
  const totalMinoristaEquiv = cartMay.reduce((a, i) => { const r=_itemMayMinoristaEquiv(i); return a+(r>0?r:Math.round(i.l1*i.c/0.65)); }, 0);
  const ahorro = Math.max(0, totalMinoristaEquiv - total);
  const ahorroPct = totalMinoristaEquiv > 0 ? Math.round((ahorro / totalMinoristaEquiv) * 100) : 0;
  const cumple = total >= MIN_COMPRA_MAYORISTA;
  const pct    = Math.min(100, Math.round(total / MIN_COMPRA_MAYORISTA * 100));
  const progColor = cumple ? '#16a34a' : 'var(--azul)';
  const progMsg   = cumple
    ? '✅ Mínimo alcanzado — podés hacer tu pedido'
    : `Faltan $${fmt(MIN_COMPRA_MAYORISTA - total)} para el mínimo`;

  let h = '';
  cartMay.forEach(it => {
    const sub = it.l1 * it.c;
    h += `<div class="cart-item">
      <div style="flex:1">
        <div class="cart-item-name">${it.n}</div>
        <span class="cart-item-opt">${it.bultoLabel || 'Bulto'} × ${it.c} — $${fmt(it.l1)}/bulto</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="display:flex;align-items:center;gap:4px">
          <button class="qty-btn" style="width:26px;height:26px;font-size:15px" onclick="cartQtyMay('${it.key}',-1)">−</button>
          <span style="font-size:12px;font-weight:700;min-width:22px;text-align:center">${it.c}</span>
          <button class="qty-btn" style="width:26px;height:26px;font-size:15px" onclick="cartQtyMay('${it.key}',1)">+</button>
        </div>
        <div class="cart-item-price">$${fmt(sub)}</div>
        <button class="cart-item-del" onclick="cartDelMay('${it.key}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>`;
  });
  body.innerHTML = h;

  // Bloque de ahorro vs lista minorista
  const ahorroBlock = ahorro > 0
    ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:12px 14px;margin-bottom:12px;text-align:center">
         <div style="font-size:12px;font-weight:600;color:#16a34a;margin-bottom:2px">Ahorrás comprando mayorista</div>
         <div style="font-size:24px;font-weight:800;color:#15803d;line-height:1.1">$${fmt(ahorro)}</div>
         <div style="font-size:12px;color:#16a34a;margin-top:3px;opacity:.85">vs. precio minorista (${ahorroPct}% menos)</div>
       </div>`
    : '';

  footer.classList.remove('hidden');
  footer.innerHTML = `
    ${ahorroBlock}
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:5px">
        <span style="color:${progColor}">${progMsg}</span><span>${pct}%</span>
      </div>
      <div style="height:6px;background:var(--muted);border-radius:6px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${progColor};border-radius:6px;transition:width .4s"></div>
      </div>
    </div>
    <div class="total-rows">
      ${ahorro > 0 ? `<div class="total-row"><span style="color:var(--muted-fg)">Precio minorista equivalente</span><span style="color:var(--muted-fg);text-decoration:line-through">$${fmt(totalMinoristaEquiv)}</span></div>
      <div class="total-row disc"><span>Ahorro mayorista</span><span style="color:#16a34a">−$${fmt(ahorro)}</span></div>` : ''}
      <div class="total-row main"><span>Total Mayorista</span><span>$${fmt(total)}</span></div>
    </div>
    <button class="wa-btn" onclick="closeCartMay();pedirWAMayorista()" ${cumple ? '' : 'disabled style="opacity:.5;cursor:not-allowed"'}>💬 Pedir por WhatsApp</button>`;
}
window.renderCartMay = renderCartMay;

function cartQtyMay(key, d) {
  const it = cartMay.find(i => i.key === key);
  if (!it) return;
  it.c = Math.max(1, it.c + d);
  _reRenderCardMay(it.pid);
  updateCartMayCount();
  renderCartMay();
}
window.cartQtyMay = cartQtyMay;

function cartDelMay(key) {
  const it = cartMay.find(i => i.key === key);
  if (it) _reRenderCardMay(it.pid);
  cartMay = cartMay.filter(i => i.key !== key);
  updateCartMayCount();
  renderCartMay();
}
window.cartDelMay = cartDelMay;

function pedirWAMayorista() {
  if (!cartMay.length) {
    alert('Tu carrito mayorista está vacío. Agregá productos antes de pedir.');
    return;
  }
  const total = cartMay.reduce((a, i) => a + i.l1 * i.c, 0);
  if (total < MIN_COMPRA_MAYORISTA) {
    alert(`⚠️ Debes alcanzar el mínimo de compra de $${fmt(MIN_COMPRA_MAYORISTA)} para continuar.\n\nTotal actual: $${fmt(total)}\nFaltan: $${fmt(MIN_COMPRA_MAYORISTA - total)}`);
    return;
  }
  closeCartMay();
  abrirCheckout('mayorista');
}
window.pedirWAMayorista = pedirWAMayorista;

// Búsqueda en mayorista
function onSearchMay(val) {
  clearTimeout(_searchTimerMay);
  _searchTimerMay = setTimeout(() => _doSearchMay(val), 300);
}
window.onSearchMay = onSearchMay;

function _doSearchMay(val) {
  searchTermMay = val.trim();
  const sr = document.getElementById('maySearchResults');
  if (!searchTermMay) {
    if (sr) { sr.classList.remove('active'); sr.classList.add('hidden'); sr.innerHTML = ''; }
    renderMayCarrusel();
    return;
  }
  const scored = PRODS_MAY.map(p => ({ p, score: _matchScore(searchTermMay, p[2]) * 2 + _matchScore(searchTermMay, p[3]) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const results = scored.map(x => x.p);
  
  let h = `<h1 style="font-size:18px;color:var(--azul-dark);margin-bottom:12px;font-weight:700">Resultados para "${searchTermMay}"</h1>`;
  if (!results.length) {
    h += '<div style="text-align:center;padding:44px 0;color:var(--muted-fg);font-size:17px">No se encontraron productos 🔍</div>';
  } else {
    h += '<div class="search-results">';
    results.forEach(p => {
      const opts = Object.keys(p[7]);
      const precio = opts.length ? p[7][opts[0]][0] : 0;
      const hasSrc = p[6] && p[6].startsWith('http');
      const cat = CATS_MAY.find(c => c.id === p[1]);
      const bulto = p[12] ? p[12].bulto : 1;
    h += `<div class="search-item" onclick="selectMayCat('${p[1]}', ${p[0]})">
        <div class="search-item-img">${hasSrc ? `<img src="${p[6]}" alt="${p[2]}" onerror="this.parentNode.innerHTML='🌿'" loading="lazy" decoding="async">` : (cat ? cat.ic : '🌿')}</div>
        <div class="search-item-body">
          <div class="search-item-name">${_tc(p[2])}</div>
          <div class="search-item-cat">${cat ? cat.n : ''}</div>
          <span class="bulto-badge" style="font-size:11px">📦 ${opts[0] || 'Bulto x' + bulto}</span>
          <div class="search-item-price">$${fmt(precio)}</div>
        </div>
        <div class="search-item-arrow">›</div>
      </div>`;
    });
    h += '</div>';
  }
  
  const isMobile = window.innerWidth < 768;
  const desktop = document.getElementById('mayDesktopProdsArea');
  const mobile  = document.getElementById('mayMobileProdsArea');
  if (desktop) desktop.innerHTML = h;
  if (mobile)  { mobile.innerHTML = h; mobile.classList.remove('hidden'); }
  if (sr) sr.innerHTML = '';
}

// Inicializar mayorista al estar en esa tab
// (se carga lazy cuando se clickea la tab)

// ── Exponer funciones al scope global (llamadas desde HTML) ──
window.selectCat=selectCat;
window.addToCart=addToCart;
window.cardDelProduct=cardDelProduct;
window.showInfo=showInfo;
window.openCart=openCart;
window.closeCart=closeCart;
window.toggleChat=toggleChat;
window.sendChat=sendChat;
window.openMix=openMix;
window.closeMix=closeMix;
window.openGranola=openGranola;
window.closeGranola=closeGranola;
window.selOpt=selOpt;
window.selSabor=selSabor;
window.chgQty=chgQty;
window.miniQty=miniQty;
window.miniDel=miniDel;
window.goSlide=goSlide;
window.mixSetCat=mixSetCat;
window.mixAgregarAlCarrito=mixAgregarAlCarrito;
window.granolaSetCat=granolaSetCat;
window.granolaAgregarAlCarrito=granolaAgregarAlCarrito;
window.onSearch=onSearch;
window.cartDel=cartDel;
window.cartQty=cartQty;
window.closeModal=closeModal;
window.editBuilder=editBuilder;
window.granolaPickSize=granolaPickSize;
window.granolaRemoveProd=granolaRemoveProd;
window.irAProducto=irAProducto;

/* ══════ URLs de producto y de categoría (las que están en el sitemap) ══════
   Cada producto tiene su propia dirección, por ejemplo:
     .../paladeartienda/?producto=almendras-nonpareil-1234
   Sirve para dos cosas: que Google pueda indexar cada producto por separado,
   y que se pueda pasar por WhatsApp el link de un producto puntual.
   El slug termina SIEMPRE en el id del producto, así que se lee de ahí:
   si mañana cambia el nombre en la planilla, el link viejo sigue funcionando. */
function _slugTexto(t){
  return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function _articuloDe(p){ return (p&&p[12]&&p[12].productId)?String(p[12].productId):''; }
function _slugProducto(p){ var a=_articuloDe(p); return _slugTexto(p[2])+(a?'-'+a:''); }
/* El número del slug es el ARTÍCULO de la planilla, no la posición en la lista:
   así el link sigue andando aunque se agreguen o reordenen filas en el Sheet. */
function _articuloDesdeSlug(sl){ var m=String(sl||'').match(/-(\d+)$/); return m?m[1]:null; }
function _prodPorArticulo(art){
  if(!art||typeof PRODS==='undefined')return null;
  return PRODS.find(function(x){ return _articuloDe(x)===String(art); })||null;
}
function _catDesdeSlug(sl){
  sl=_slugTexto(sl);
  var c=(typeof CATS!=='undefined'?CATS:[]).find(function(x){ return _slugTexto(x.n)===sl||x.id===sl; });
  return c?c.id:null;
}

/* Título y datos que lee Google. Se guardan los originales para poder volver a ellos. */
var _seoOriginal=null;
function _seoGuardarOriginal(){
  if(_seoOriginal)return;
  var can=document.querySelector('link[rel="canonical"]');
  var des=document.querySelector('meta[name="description"]');
  _seoOriginal={title:document.title, canonical:can?can.getAttribute('href'):'', description:des?des.getAttribute('content'):''};
}
function _seoAplicar(title, url, desc){
  _seoGuardarOriginal();
  document.title=title;
  var can=document.querySelector('link[rel="canonical"]'); if(can)can.setAttribute('href',url);
  var des=document.querySelector('meta[name="description"]'); if(des&&desc)des.setAttribute('content',desc);
  var ogu=document.querySelector('meta[property="og:url"]'); if(ogu)ogu.setAttribute('content',url);
  var ogt=document.querySelector('meta[property="og:title"]'); if(ogt)ogt.setAttribute('content',title);
  var ogd=document.querySelector('meta[property="og:description"]'); if(ogd&&desc)ogd.setAttribute('content',desc);
}
function _seoRestaurar(){
  if(!_seoOriginal)return;
  _seoVigilando=null;
  _seoAplicar(_seoOriginal.title,_seoOriginal.canonical,_seoOriginal.description);
}
/* Durante la carga el sitio arma vistas y restaura estado en varios momentos, y en el medio
   pisa el título. En vez de perseguir cada uno de esos puntos, durante unos segundos se
   verifica que el título siga siendo el del producto y se vuelve a poner si hizo falta.
   Se corta solo: al terminar el plazo, o si la dirección deja de apuntar a un producto. */
var _seoVigilando=null;
function _seoVigilar(title,url,desc){
  _seoVigilando={t:title,u:url,d:desc};
  var hasta=Date.now()+7000;
  (function chequear(){
    if(!_seoVigilando||_seoVigilando.t!==title)return;
    if(location.search.indexOf('producto=')<0&&location.search.indexOf('categoria=')<0)return;
    if(document.title!==title)_seoAplicar(title,url,desc);
    if(Date.now()<hasta)setTimeout(chequear,250);
  })();
}
var _BASE_URL='https://paladear.github.io/paladeartienda/';
/* Durante la apertura desde una URL del sitemap el sitio llama varias veces a selectCat
   (restaura estado, arma vistas). Sin esta bandera, esas llamadas borran el título del
   producto que se acaba de poner. */
var _abriendoDesdeURL=false;

/* Marca la dirección del producto abierto, sin tocar el historial del sitio
   (se usa replaceState y se conserva el estado que el sitio ya venía manejando). */
function _urlProducto(p){
  if(!p)return;
  var slug=_slugProducto(p);
  var url=_BASE_URL+'?producto='+slug;              // absoluta: es la que se le declara a Google
  // La barra del navegador se cambia con una ruta RELATIVA: una absoluta de otro dominio
  // la bloquea el navegador (y rompería si el sitio se moviera de dirección).
  try{ history.replaceState(history.state, '', '?producto='+slug); }catch(e){}
  var nom=(typeof _tc==='function'?_tc(p[2]):p[2]);
  var desc=nom+' en Paladear Mercado de Sabores, Mendoza. '+
           (p[8]?String(p[8]).slice(0,110):'Frutos secos, semillas, especias y productos naturales.')+
           ' Pedí por WhatsApp con envíos a todo el país.';
  _seoAplicar(nom+' | Paladear Mercado de Sabores', url, desc);
}
function _urlHome(){
  if(_abriendoDesdeURL)return;
  try{ history.replaceState(history.state, '', location.pathname); }catch(e){}
  _seoRestaurar();
}

/* Al entrar por una de estas URLs se cae en el inicio; hay que pasar a la vista de productos */
function _salirDelInicio(){
  try{
    if(document.body.classList.contains('hv-home')&&typeof window.switchTab==='function')
      window.switchTab('minorista');
  }catch(e){}
}

/* Al entrar desde Google (o desde un link compartido) se abre lo que pide la URL */
function _abrirDesdeURL(){
  var q;
  try{ q=new URLSearchParams(location.search); }catch(e){ return; }
  var sp=q.get('producto'), sc=q.get('categoria');
  if(sp){
    var p=_prodPorArticulo(_articuloDesdeSlug(sp));
    if(p){
      _abriendoDesdeURL=true;
      // Se entra siempre por el inicio: hay que pasar a la vista de productos ANTES de abrirlo
      // (si se hace después, switchTab detecta que ya hay categoría activa y la resetea).
      _salirDelInicio();
      irAProducto(p[0]);                       // irAProducto marca la dirección al terminar
      setTimeout(function(){ _abriendoDesdeURL=false; _urlProducto(p); },1200);
      return true;
    }
  }
  if(sc){
    var cid=_catDesdeSlug(sc);
    if(cid){
      _abriendoDesdeURL=true;
      _salirDelInicio();
      selectCat(cid);
      setTimeout(function(){ _abriendoDesdeURL=false; },1200);
      var c=CATS.find(function(x){return x.id===cid;});
      if(c){
        var tc=c.n+' | Paladear Mercado de Sabores';
        var uc=_BASE_URL+'?categoria='+_slugTexto(c.n);
        var dc=c.n+' en Paladear Mercado de Sabores, Mendoza. Precios por kilo, envíos a todo el país.';
        _seoAplicar(tc,uc,dc); _seoVigilar(tc,uc,dc);
      }
      return true;
    }
  }
  return false;
}
/* Solo corre si la URL trae parámetros: si no, no hace absolutamente nada.
   No alcanza con esperar los productos: el sitio restaura su estado al terminar de cargar y
   vuelve al inicio. Por eso se verifica el resultado y se reintenta hasta que la vista quede
   efectivamente en el producto (con tope de tiempo, para no quedar dando vueltas). */
(function(){
  var tiene=false;
  try{ var q=new URLSearchParams(location.search); tiene=!!(q.get('producto')||q.get('categoria')); }catch(e){}
  if(!tiene)return;
  var t0=Date.now(), intentos=0;
  (function esperar(){
    try{
      var listos=(typeof PRODS!=='undefined'&&PRODS&&PRODS.length&&typeof CATS!=='undefined'&&CATS.length);
      if(listos){
        if(!document.body.classList.contains('hv-home')&&intentos>0) return;  // ya quedó abierto
        intentos++;
        _abrirDesdeURL();
        if(!document.body.classList.contains('hv-home')&&intentos>1) return;
      }
    }catch(e){ return; }
    if(Date.now()-t0<12000) setTimeout(esperar,250);
  })();
})();
window._urlProducto=_urlProducto;
window._urlHome=_urlHome;
window.mixPickSize=mixPickSize;
window.mixRemoveProd=mixRemoveProd;
window.pedirWA=pedirWA;
window.sendQuickFaq=sendQuickFaq;
window.volverInicio=volverInicio;
window.zoomImg=zoomImg;

// ── CATS DROPDOWN (mobile) ──
let _catsDropOpen=false;
function toggleCatsDropdown(){
  if(!_catsDropOpen)renderCatsUI({dropdown:true});
  _catsDropOpen=!_catsDropOpen;
  const overlay=document.getElementById('catsDropdownOverlay');
  const panel=document.getElementById('catsDropdownPanel');
  if(_catsDropOpen){
    overlay.classList.add('open');
    panel.style.display='block';
    panel.style.animation='slideUp .22s ease';
    _palPushOverlay('cats');
  } else {
    overlay.classList.remove('open');
    panel.style.display='none';
  }
}
function closeCatsDropdown(){
  _catsDropOpen=false;
  const overlay=document.getElementById('catsDropdownOverlay');
  const panel=document.getElementById('catsDropdownPanel');
  if(overlay)overlay.classList.remove('open');
  if(panel)panel.style.display='none';
}
window.toggleCatsDropdown=toggleCatsDropdown;
window.closeCatsDropdown=closeCatsDropdown;

// ── CATS DROPDOWN MAYORISTA (mobile) ──
let _mayCatsDropOpen=false;
function toggleMayCatsDropdown(){
  _mayCatsDropOpen=!_mayCatsDropOpen;
  const overlay=document.getElementById('mayCatsDropdownOverlay');
  const panel=document.getElementById('mayCatsDropdownPanel');
  if(_mayCatsDropOpen){
    overlay.classList.add('open');
    panel.style.display='block';
    panel.style.animation='slideUp .22s ease';
    _palPushOverlay('catsMay');
  } else {
    overlay.classList.remove('open');
    panel.style.display='none';
  }
}
function closeMayCatsDropdown(){
  _mayCatsDropOpen=false;
  const overlay=document.getElementById('mayCatsDropdownOverlay');
  const panel=document.getElementById('mayCatsDropdownPanel');
  if(overlay)overlay.classList.remove('open');
  if(panel)panel.style.display='none';
}
window.toggleMayCatsDropdown=toggleMayCatsDropdown;
window.closeMayCatsDropdown=closeMayCatsDropdown;

// ── HEADER DROPDOWNS ──
function toggleHdrop(id){
  const el=document.getElementById('hdrop'+id);
  const isOpen=el.classList.contains('open');
  closeAllHdrops();
  if(!isOpen)el.classList.add('open');
}
function closeAllHdrops(){
  document.querySelectorAll('.hdrop').forEach(d=>d.classList.remove('open'));
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.hdrop'))closeAllHdrops();
});
window.toggleHdrop=toggleHdrop;
window.closeAllHdrops=closeAllHdrops;

// ═══ CHECKOUT — ENTREGA Y DATOS ═══
// Direcciones de retiro según el tipo de venta. Minorista retira en Pueyrredón
// (Quinta Sección); mayorista retira en el depósito de Guaymallén.
var _RETIRO = {
  minorista: {
    dirCorta: 'Pueyrredón 588, Mendoza',
    dirLarga: 'Pueyrredón 588, esq. Paso de los Andes — Quinta Sección, Mendoza',
    horarioCorto: 'Lun–Sáb 10 a 20hs',
    horarioLargo: 'Lunes a Sábados 10:00 a 20:00hs'
  },
  mayorista: {
    dirCorta: 'Ruta Prov. 50 Nº 13080, KM 8 — Guaymallén',
    dirLarga: 'Ruta Provincial 50 Nº 13080, KM 8 — Guaymallén, Mendoza',
    horarioCorto: 'Lun–Vie 8 a 16 · Sáb 8 a 13hs',
    horarioLargo: 'Lunes a Viernes 08:00 a 16:00hs · Sábados 08:00 a 13:00hs',
    mapa: 'https://maps.app.goo.gl/MXySPy9mbBFm8oVaA'
  }
};
var _coVenta = 'minorista';
var _coEntrega = null;
var _coMap = null, _coMarker = null, _leafletReady = false;

// ═══ PERFIL LOCAL (localStorage) — recuerda datos del cliente entre pedidos ═══
var _PALADEAR_PERFIL_KEY = 'paladear_perfil_v1';
function _coCargarPerfil() {
  try { return JSON.parse(localStorage.getItem(_PALADEAR_PERFIL_KEY) || '{}') || {}; }
  catch(e) { return {}; }
}
function _coGuardarPerfil(p) {
  try { localStorage.setItem(_PALADEAR_PERFIL_KEY, JSON.stringify(p)); } catch(e) {}
}
function _coSet(id, val) {
  var el = document.getElementById(id);
  if (el && !el.value && val) el.value = val;
}
function _coAutocompletar() {
  var p = _coCargarPerfil();
  if (!p || !Object.keys(p).length) return;
  _coSet('coNombre', p.nombre);
  _coSet('coNombreDom', p.nombre);
  _coSet('coHorarioRetiro', p.horarioRetiro);
  // Los detalles de la dirección (piso, tipo, entre calles, indicaciones) viven en cada
  // dirección guardada; los campos quedan vacíos para cargar una dirección nueva.
}
window.coBorrarPerfil = function() {
  if (!confirm('¿Borrar tus datos guardados (nombre, dirección, etc.)?')) return;
  try { localStorage.removeItem(_PALADEAR_PERFIL_KEY); } catch(e) {}
  ['coNombre','coNombreDom','coHorarioRetiro','coCalle','coNumero','coLocalidad','coPisoDepto','coEntreCalles','coIndicaciones'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('input[name="coTipo"],input[name="coPago"]').forEach(function(r){ r.checked = false; });
  var _pv = document.getElementById('coProvincia'); if (_pv) _pv.value = 'Mendoza';
  _coBuildDirOpts();
  _coNombreCompacto();
};

// Direcciones guardadas en el checkout: radios para elegir rápido + "otra dirección".
// Los detalles (piso, tipo, entre calles, indicaciones, mapa) solo se piden al cargar una
// dirección NUEVA y quedan guardados con ella.
var _coDirsCache=[];
function _coBuildDirOpts(){
  var wrap=document.getElementById('coDirOpts');
  var inp=document.getElementById('coDirNueva');
  var det=document.getElementById('coDirDetalles');
  if(!wrap||!inp)return;
  _coDirsCache=_cuentaDirecciones(_coCargarPerfil());
  var dirs=_coDirsCache;
  if(!dirs.length){wrap.style.display='none';wrap.innerHTML='';inp.style.display='';if(det)det.style.display='';return;}
  var h='';
  dirs.forEach(function(d,i){
    var extras=[];
    if(d.tipo)extras.push(d.tipo==='depto'?'Depto':'Casa');
    if(d.piso)extras.push(d.piso);
    if(d.entre)extras.push('entre '+d.entre);
    var sub=extras.length?'<span class="co-dir-opt-sub">'+_ctaEsc(extras.join(' · '))+'</span>':'';
    h+='<label class="co-dir-opt'+(i===0?' on':'')+'"><input type="radio" name="coDirSel" value="'+i+'"'+(i===0?' checked':'')+'><span class="co-dir-opt-txt"><span>'+_ctaEsc(d.dir)+'</span>'+sub+'</span></label>';
  });
  h+='<label class="co-dir-opt otra"><input type="radio" name="coDirSel" value="__otra"><span>➕ Usar otra dirección…</span></label>';
  wrap.innerHTML=h;
  wrap.style.display='';
  inp.style.display='none';
  if(det)det.style.display='none';
  wrap.onchange=function(){
    var sel=wrap.querySelector('input[name="coDirSel"]:checked');
    wrap.querySelectorAll('.co-dir-opt').forEach(function(l){l.classList.toggle('on',sel&&l.contains(sel));});
    if(sel&&sel.value==='__otra'){inp.style.display='';if(det)det.style.display='';var c=document.getElementById('coCalle');if(c)c.focus();}
    else{inp.style.display='none';if(det)det.style.display='none';}
  };
}
// Dirección efectiva como OBJETO: la elegida en los radios, o una nueva armada con los campos.
// Para direcciones nuevas: calle, número, localidad y provincia son OBLIGATORIOS.
function _coDirObjActual(){
  var sel=document.querySelector('#coDirOpts input[name="coDirSel"]:checked');
  if(sel&&sel.value!=='__otra'){var d=_coDirsCache[parseInt(sel.value,10)];if(d)return d;}
  var calle=(document.getElementById('coCalle').value||'').trim();
  var num=(document.getElementById('coNumero').value||'').trim();
  var loc=(document.getElementById('coLocalidad').value||'').trim();
  var prov=(document.getElementById('coProvincia').value||'').trim();
  if(!calle){_coMarkRequired('coCalle');return null;}
  if(!num){_coMarkRequired('coNumero');return null;}
  if(!loc){_coMarkRequired('coLocalidad');return null;}
  if(!prov){_coMarkRequired('coProvincia');return null;}
  var tipoEl=document.querySelector('input[name="coTipo"]:checked');
  var o={dir:calle+' '+num+', '+loc+', '+prov,
    calle:calle,num:num,loc:loc,prov:prov,
    piso:(document.getElementById('coPisoDepto').value||'').trim(),
    tipo:tipoEl?tipoEl.value:'',
    entre:(document.getElementById('coEntreCalles').value||'').trim(),
    indic:(document.getElementById('coIndicaciones').value||'').trim()};
  return o;
}
function _coDireccionActual(){var d=_coDirObjActual();return d?d.dir:'';}
window._coDireccionActual=_coDireccionActual;
// Nombre compacto: si ya lo tenemos guardado, mostrar "A nombre de X · Cambiar" en vez del campo
function _coNombreCompacto(){
  var nom=(_coCargarPerfil().nombre||'').trim();
  [['coNombreField','coNombreMiniR','coNombreTxtR'],['coNombreDomField','coNombreMiniDom','coNombreTxtDom']].forEach(function(ids){
    var f=document.getElementById(ids[0]),m=document.getElementById(ids[1]),t=document.getElementById(ids[2]);
    if(!f||!m||!t)return;
    if(nom){f.classList.add('hidden');t.textContent=nom;m.classList.remove('hidden');}
    else{f.classList.remove('hidden');m.classList.add('hidden');}
  });
}
window.coCambiarNombre=function(which){
  var f=document.getElementById(which==='R'?'coNombreField':'coNombreDomField');
  var m=document.getElementById(which==='R'?'coNombreMiniR':'coNombreMiniDom');
  if(f)f.classList.remove('hidden');
  if(m)m.classList.add('hidden');
  var inp=document.getElementById(which==='R'?'coNombre':'coNombreDom');
  if(inp)inp.focus();
};

function abrirCheckout(venta) {
  _coVenta = venta || 'minorista';
  _coEntrega = null;
  // Textos de retiro según minorista (Pueyrredón) o mayorista (depósito Guaymallén)
  var _ret = _RETIRO[_coVenta] || _RETIRO.minorista;
  var _subEl = document.getElementById('coRetiroSub');
  if (_subEl) _subEl.textContent = _ret.dirCorta + ' · ' + _ret.horarioCorto;
  var _hintEl = document.getElementById('coRetiroHint');
  if (_hintEl) _hintEl.textContent = 'Horarios del local: ' + _ret.horarioLargo;
  document.getElementById('coStep1').classList.remove('hidden');
  document.getElementById('coStep2Retiro').classList.add('hidden');
  document.getElementById('coStep2Dom').classList.add('hidden');
  document.getElementById('coTitle').textContent = 'Finalizar pedido';
  document.getElementById('coBtnBack').style.display = 'none';
  _coRenderSummary();
  document.getElementById('checkoutOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  _coAutocompletar();
  _coBuildDirOpts();
  _coNombreCompacto();
  if (!history.state || history.state.view !== 'checkout') {
    _palPushOverlay('checkout');
  }
}
window.abrirCheckout = abrirCheckout;

function cerrarCheckout() {
  document.getElementById('checkoutOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  if (_coMap) { _coMap.remove(); _coMap = null; _coMarker = null; }
  _coCoords = null;
  var panel = document.getElementById('coUbicacionPanel');
  if (panel) panel.classList.add('hidden');
  var btn = document.getElementById('coUbicBtn');
  if (btn) btn.style.display = '';
  var conf = document.getElementById('coUbicConfirm');
  if (conf) conf.classList.add('hidden');
}
window.cerrarCheckout = cerrarCheckout;

function _coBack() {
  _coEntrega = null;
  document.getElementById('coStep1').classList.remove('hidden');
  document.getElementById('coStep2Retiro').classList.add('hidden');
  document.getElementById('coStep2Dom').classList.add('hidden');
  document.getElementById('coTitle').textContent = 'Finalizar pedido';
  document.getElementById('coBtnBack').style.display = 'none';
}
window._coBack = _coBack;

function _coRenderSummary() {
  var isMin = _coVenta === 'minorista';
  var total = 0;
  var count = 0;
  if (isMin) {
    var totalMin = cart.reduce(function(a,i){return a+_itemMin(i);}, 0);
    var esMay = totalMin >= 80000;
    cart.forEach(function(i){ total += esMay ? _itemMay(i) : _itemMinConOferta(i); });
    count = cart.length;
  } else {
    cartMay.forEach(function(i){ total += i.l1 * i.c; });
    count = cartMay.length;
  }
  document.getElementById('coSummary').innerHTML =
    '<span>' + count + ' producto' + (count !== 1 ? 's' : '') + '</span>' +
    '<span>Total: <b>$' + fmt(total) + '</b></span>';
}

function coElegirEntrega(tipo) {
  _coEntrega = tipo;
  document.getElementById('coStep1').classList.add('hidden');
  document.getElementById('coStep2Retiro').classList.toggle('hidden', tipo !== 'retiro');
  document.getElementById('coStep2Dom').classList.toggle('hidden', tipo !== 'domicilio');
  document.getElementById('coTitle').textContent = tipo === 'retiro' ? 'Retiro en el local' : 'Envío a domicilio';
  document.getElementById('coBtnBack').style.display = '';
}
window.coElegirEntrega = coElegirEntrega;

function _coLoadLeaflet() {
  if (window.L) return;
  if (!document.getElementById('leafletCSS')) {
    var lk = document.createElement('link');
    lk.id = 'leafletCSS';
    lk.rel = 'stylesheet';
    lk.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(lk);
  }
  if (!document.getElementById('leafletJS')) {
    var sc = document.createElement('script');
    sc.id = 'leafletJS';
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    sc.onload = function(){ _leafletReady = true; };
    document.head.appendChild(sc);
  }
}

function _coInitMap() {
  if (_coMap) { setTimeout(function(){ _coMap.invalidateSize(); }, 100); return; }
  var mapDiv = document.getElementById('coMap');
  if (!mapDiv || !window.L) { setTimeout(_coInitMap, 500); return; }
  _coMap = L.map('coMap').setView([-32.89, -68.83], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(_coMap);
  _coMarker = L.marker([-32.89, -68.83], {draggable: true}).addTo(_coMap);
  _coMarker.on('dragend', function(){
    var p = _coMarker.getLatLng();
    _coCoords = { lat: p.lat, lng: p.lng };
    _coShowConfirm();
  });
  setTimeout(function(){ _coMap.invalidateSize(); }, 150);
}

// Coords guardadas (sin tocar el campo de dirección)
var _coCoords = null;

function coAbrirUbicacion() {
  _coLoadLeaflet();
  document.getElementById('coUbicacionPanel').classList.remove('hidden');
  document.getElementById('coUbicBtn').style.display = 'none';
  // Esperar a Leaflet y inicializar
  var tries = 0;
  var waiter = setInterval(function() {
    tries++;
    if (window.L) { clearInterval(waiter); _coInitMap(); }
    else if (tries > 30) { clearInterval(waiter); alert('No se pudo cargar el mapa. Revisá tu conexión.'); }
  }, 200);
}
window.coAbrirUbicacion = coAbrirUbicacion;

function coCerrarUbicacion() {
  document.getElementById('coUbicacionPanel').classList.add('hidden');
  document.getElementById('coUbicBtn').style.display = '';
  document.getElementById('coUbicConfirm').classList.add('hidden');
  _coCoords = null;
}
window.coCerrarUbicacion = coCerrarUbicacion;

function coBuscarMapa() {
  var addr = _coDireccionActual();
  if (!addr) {
    alert('Primero completá calle, número y localidad arriba.');
    var _c = document.getElementById('coCalle');
    if (_c) _c.focus();
    return;
  }
  if (!window.L || !_coMap) { _coLoadLeaflet(); setTimeout(coBuscarMapa, 800); return; }
  var q = addr + ', Mendoza, Argentina';
  fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&limit=1&countrycodes=ar')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (data && data.length) {
        var lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
        _coMap.setView([lat, lon], 16);
        _coMarker.setLatLng([lat, lon]);
        _coCoords = { lat: lat, lng: lon };
        _coShowConfirm();
        setTimeout(function(){ _coMap.invalidateSize(); }, 100);
      } else {
        alert('No se encontró la dirección. Probá escribirla más completa o usá "Mi ubicación actual".');
      }
    })
    .catch(function(){ alert('No se pudo buscar la dirección. Revisá tu conexión.'); });
}
window.coBuscarMapa = coBuscarMapa;

function coUsarUbicacion() {
  if (!navigator.geolocation) { alert('Tu dispositivo no permite compartir la ubicación.'); return; }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      if (!window.L || !_coMap) { _coLoadLeaflet(); setTimeout(coUsarUbicacion, 800); return; }
      _coMap.setView([lat, lon], 17);
      _coMarker.setLatLng([lat, lon]);
      _coCoords = { lat: lat, lng: lon };
      _coShowConfirm();
      setTimeout(function(){ _coMap.invalidateSize(); }, 100);
    },
    function(){ alert('No se pudo obtener tu ubicación. Activá los permisos de ubicación o arrastrá el pin en el mapa.'); },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}
window.coUsarUbicacion = coUsarUbicacion;

function _coShowConfirm() {
  document.getElementById('coUbicConfirm').classList.remove('hidden');
}

// Ingredientes de un mix/granola/blend como líneas sueltas (una por ingrediente), para que
// en el mensaje de WhatsApp no queden todos apelotonados en un renglón separados por comas.
// Se arma desde mixIngreds (estructurado); mixDetalle es el respaldo para pedidos viejos.
// esMay: si el pedido alcanzó el descuento por volumen, cada ingrediente se cotiza con la
// lista 2 — la misma que usa el total del item, así los subtotales suman exacto.
function _mixIngredLineas(it,esMay){
  var li=esMay?1:0;
  if(it.mixIngreds&&it.mixIngreds.length){
    return it.mixIngreds.map(function(ing){
      var p=PRODS.find(function(x){return x[0]===ing.pid;});
      var nom=p?_tc(p[2]):'Producto';
      var g=_gLabel(ing.g).replace(/ g$/,' gr');
      if(!p)return nom+' '+g;
      return nom+' '+g+' — $'+fmt(Math.round(_precioKg(p,li)*(ing.g/1000)));
    });
  }
  return (it.mixDetalle||'').split(',').map(function(s){return _tc(s.trim());}).filter(Boolean);
}

function coEnviar() {
  var tipo = _coEntrega;
  var nombre, horario, direccion, pago, deliveryMsg;

  if (tipo === 'retiro') {
    nombre = (document.getElementById('coNombre').value || '').trim();
    if (!nombre) { _coMarkRequired('coNombre'); return; }
    horario = (document.getElementById('coHorarioRetiro').value || '').trim();
    var _retM = _RETIRO[_coVenta] || _RETIRO.minorista;
    deliveryMsg = '\n\n🏬 *RETIRO EN EL LOCAL*\n👤 ' + nombre;
    deliveryMsg += '\n🕐 Horario preferido: ' + (horario || 'Sin preferencia');
    deliveryMsg += '\n📍 ' + _retM.dirLarga;
    if (_retM.mapa) deliveryMsg += '\n🗺️ ' + _retM.mapa;
    deliveryMsg += '\n💳 Pago: a definir en el local';
  } else {
    nombre = (document.getElementById('coNombreDom').value || '').trim();
    if (!nombre) { _coMarkRequired('coNombreDom'); return; }
    var dirObj = _coDirObjActual();
    if (!dirObj) return; // _coDirObjActual ya marcó el campo obligatorio que falta
    direccion = dirObj.dir;
    // Si marcó el pin del mapa en esta sesión, queda guardado con la dirección elegida
    if (_coCoords && !(dirObj.lat && dirObj.lng)) { dirObj.lat = _coCoords.lat; dirObj.lng = _coCoords.lng; }
    deliveryMsg = '\n\n🚚 *ENVÍO A DOMICILIO*\n👤 ' + nombre;
    deliveryMsg += '\n📍 ' + direccion;
    if (dirObj.piso) deliveryMsg += '\n🏠 Piso/Depto: ' + dirObj.piso;
    if (dirObj.tipo) deliveryMsg += '\n🏢 Tipo: ' + (dirObj.tipo === 'casa' ? 'Casa' : 'Departamento');
    if (dirObj.entre) deliveryMsg += '\n↔️ Entre calles: ' + dirObj.entre;
    if (dirObj.indic) deliveryMsg += '\n📝 Indicaciones: ' + dirObj.indic;
    // Link de Google Maps SIEMPRE: pin exacto si lo tiene, sino búsqueda por la dirección escrita
    if (dirObj.lat && dirObj.lng) {
      deliveryMsg += '\n📌 Ubicación exacta: https://maps.google.com/?q=' + dirObj.lat + ',' + dirObj.lng;
    } else {
      var _q = /mendoza/i.test(direccion) ? direccion : direccion + ', Mendoza, Argentina';
      deliveryMsg += '\n🗺️ Ver en Google Maps: https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(_q);
    }
    deliveryMsg += '\n💳 Pago: Transferencia bancaria';
  }

  var isMin = _coVenta === 'minorista';
  var msg, url;

  if (isMin) {
    var totalMin = cart.reduce(function(a,i){ return a+_itemMin(i); }, 0);
    var esMay = totalMin >= 80000;
    var tot = 0;
    var lines = '🛒 *Pedido - Paladear Mercado de Sabores*\n\n';
    var items = cart.slice().sort(function(a,b){ return _tc(a.n).localeCompare(_tc(b.n),'es'); });
    items.forEach(function(it){
      var s = esMay ? _itemMay(it) : _itemMinConOferta(it); tot += s;
      var qty = it.unidad==='und' ? String(it.c) : _gLabel(it.totalG).replace(/ g$/,' gr');
      if (it.unidad==='mix') {
        var nombreMix = _tc(it.n).replace(/\s*\([^)]*\)\s*$/,'');
        // El total del armado va en el título: si fuera abajo, después del desglose,
        // se confundiría con un ingrediente más.
        lines += '*' + qty + '* - ' + nombreMix + ' — $' + fmt(s) + '\n';
        var ings = _mixIngredLineas(it, esMay);
        if (ings.length) lines += ings.map(function(t){ return '   • ' + t; }).join('\n') + '\n';
      } else {
        lines += '*' + qty + '* - ' + _tc(it.n) + '\n   $' + fmt(s) + '\n';
      }
    });
    var huboOferta = !esMay && cart.some(function(it){ return _getOfertaPct(it.pid)>0; });
    lines += '\n*TOTAL: $' + fmt(tot) + '*' + (esMay?'\n_(Descuento por volumen aplicado)_':'') + (huboOferta?'\n_(Ofertas del mes aplicadas)_':'');
    msg = lines + deliveryMsg + '\n\n_Pedido realizado desde el catálogo online_';
    url = 'https://wa.me/' + WA_MINORISTA + '?text=' + encodeURIComponent(msg);
  } else {
    var tot2 = 0;
    var lines2 = '📦 *Pedido Mayorista - Paladear Mercado de Sabores*\n\n';
    cartMay.forEach(function(it){ var sub=it.l1*it.c; tot2+=sub; lines2+='• '+it.n+' ('+(it.bultoLabel||'Bulto')+' x'+it.c+') — $'+fmt(sub)+'\n'; });
    lines2 += '\n*TOTAL: $' + fmt(tot2) + '*\n_(Lista Mayorista)_';
    msg = lines2 + deliveryMsg + '\n\n_Pedido realizado desde el catálogo online_';
    url = 'https://wa.me/' + WA_MAYORISTA + '?text=' + encodeURIComponent(msg);
  }

  // Guardar perfil para próximos pedidos
  var _perfil = _coCargarPerfil();
  _perfil.nombre = nombre;
  if (tipo === 'retiro') {
    if (horario) _perfil.horarioRetiro = horario;
  } else {
    _perfil.direccion = direccion;
    // La dirección usada (objeto con sus detalles) va al frente, sin duplicados, máx 6
    var _dl = direccion.trim().toLowerCase();
    var _dirsArr = _cuentaDirecciones(_perfil).filter(function(d){ return d.dir.trim().toLowerCase() !== _dl; });
    _dirsArr.unshift(dirObj);
    _perfil.direcciones = _dirsArr.slice(0, 6);
    // Los detalles sueltos viejos ya viven dentro de cada dirección
    delete _perfil.pisoDepto; delete _perfil.tipoViv; delete _perfil.entreCalles; delete _perfil.indicaciones;
  }
  _coGuardarPerfil(_perfil);

  // Guardar el último pedido (minorista) para poder repetirlo después
  if (isMin) _guardarUltimoPedido();
  // Guardar el pedido en el historial de "Mi cuenta"
  if (isMin) { try { _cuentaGuardarPedido(cart, (typeof esMay!=='undefined'&&esMay), (typeof tot!=='undefined'?tot:0), (typeof direccion!=='undefined'?direccion:'')); } catch(e){} }

  // Limpiar el carrito (el pedido quedó guardado en "último pedido")
  if (isMin) { cart=[]; updateCartCount(); try{localStorage.removeItem('paladear_cart_v2');}catch(e){} }
  if (!isMin) { cartMay=[]; updateCartMayCount(); try{localStorage.removeItem('paladear_cart_may_v2');}catch(e){} }

  cerrarCheckout();
  if (!navigator.onLine) { _guardarPedidoPendiente(url, isMin ? 'minorista' : 'mayorista'); return; }
  window.open(url, '_blank');
}
window.coEnviar = coEnviar;

function _coMarkRequired(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#e53935';
  el.scrollIntoView({behavior:'smooth', block:'center'});
  el.focus();
  el.addEventListener('input', function(){ el.style.borderColor = ''; }, {once:true});
}

// ═══════════════════════════════════════════
// DESCARGA LISTA MAYORISTA
function descargarListaMayorista() {
  if (!PRODS_MAY.length) { alert('La lista mayorista aún se está cargando. Esperá un momento.'); return; }
  function _generar() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fecha = new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
    // Header
    doc.setFillColor(84, 118, 146);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Paladear Mercado de Sabores', 14, 11);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Lista Mayorista — ' + fecha, 14, 18);
    doc.text('Compra mínima $250.000 · Solo por bulto cerrado', 14, 24);
    // Tabla
    const byCat = {};
    PRODS_MAY.forEach(p => {
      const cat = CATS_MAY.find(c => c.id === p[1]);
      const cn = cat ? cat.n : 'Otros';
      if (!byCat[cn]) byCat[cn] = [];
      byCat[cn].push(p);
    });
    const body = [];
    Object.keys(byCat).sort().forEach(cat => {
      body.push([{ content: cat, colSpan: 3, styles: { fillColor: [232, 240, 246], textColor: [44, 74, 90], fontStyle: 'bold', fontSize: 10 } }]);
      byCat[cat].forEach(p => {
        const opts = Object.keys(p[7]);
        const precio = opts.length ? p[7][opts[0]][0] : 0;
        body.push([p[2], opts.join(' / '), '$' + fmt(precio)]);
      });
    });
    doc.autoTable({
      startY: 32,
      head: [['Producto', 'Presentación', 'Precio']],
      body: body,
      headStyles: { fillColor: [84, 118, 146], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30, halign: 'right' } },
      alternateRowStyles: { fillColor: [248, 251, 253] },
      margin: { left: 14, right: 14 },
      didDrawPage: function(data) {
        // Footer en cada página
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text('@palade.ar · Pueyrredón 588, Mendoza', 14, 290);
        doc.text('Página ' + doc.getCurrentPageInfo().pageNumber, 196, 290, { align: 'right' });
      }
    });
    doc.save('Paladear-Lista-Mayorista-' + fecha.replace(/\//g, '-') + '.pdf');
  }
  // Cargar jsPDF + autoTable si no están cargados
  if (window.jspdf && window.jspdf.jsPDF) {
    _generar();
    return;
  }
  const s1 = document.createElement('script');
  s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s1.onload = function() {
    const s2 = document.createElement('script');
    s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    s2.onload = _generar;
    document.head.appendChild(s2);
  };
  document.head.appendChild(s1);
}
window.descargarListaMayorista = descargarListaMayorista;

// SISTEMA DE RECETAS
// ═══════════════════════════════════════════

var RECETAS = [];
var _recetasCargadas = false;
var _recetasPromise = null;
var _recetasFiltroActivo = '';
var _ultimaCatRecetas = '';

// URL de la hoja "inspiracion" — usa gviz/tq para resolver por nombre
const RECETAS_URL = 'https://docs.google.com/spreadsheets/d/1aANKgaQFoiAixKQvPlRpZ0_PBQhES-iBWqOG1bsuLyg/gviz/tq?tqx=out:csv&sheet=inspiracion';

function _parseCSVRows(text) {
  // Parser CSV completo que respeta comillas (incluso saltos de línea dentro de campos)
  const rows = [];
  let cur = '', row = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      row.push(cur); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      // Fin de fila (solo si NO estamos dentro de comillas)
      if (ch === '\r' && text[i+1] === '\n') i++; // saltar \n del \r\n
      row.push(cur); cur = '';
      if (row.some(c => c.trim().length)) rows.push(row);
      row = [];
    } else {
      cur += ch;
    }
  }
  if (cur || row.length) {
    row.push(cur);
    if (row.some(c => c.trim().length)) rows.push(row);
  }
  return rows.map(r => r.map(c => c.trim()));
}

function _parseRecetasCSV(text) {
  const rows = _parseCSVRows(text);
  if (rows.length <= 1) return [];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const titulo = (cols[0] || '').trim();
    if (!titulo) continue;
    const categoria = (cols[1] || '').trim();
    const subtitulo = (cols[2] || '').trim();
    const miniatura = (cols[3] || '').trim();
    const tiempo = (cols[4] || '').trim();
    const contenido = (cols[5] || '').trim();
    const urlIG = (cols[6] || '').trim();
    const productos = (cols[7] || '').trim();
    const slidesRaw = (cols[8] || '').trim();
    const destacado = /^si$/i.test((cols[9] || '').trim());
    let slides = null;
    if (slidesRaw) {
      slides = slidesRaw.split(';;').map(s => {
        const parts = s.split('||');
        return { titulo:(parts[0]||'').trim(), texto:(parts[1]||'').trim(), imagen:(parts[2]||'').trim() };
      }).filter(s => s.titulo);
    }
    out.push({ titulo, categoria, subtitulo, miniatura, tiempo, contenido, urlIG, productos, slides, destacado });
  }
  out.sort((a, b) => (b.destacado?1:0)-(a.destacado?1:0));
  return out;
}


function cargarRecetas() {
  if (_recetasCargadas) return Promise.resolve(RECETAS);
  if (_recetasPromise) return _recetasPromise;
  _recetasPromise=fetch(RECETAS_URL + '&t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.text())
    .then(text => {
      RECETAS = _parseRecetasCSV(text);
      _recetasCargadas = true;
      _recetasPromise = null;
      console.log('🍴 Paladear: ' + RECETAS.length + ' recetas cargadas');
      return RECETAS;
    })
    .catch(err => {
      console.warn('No se pudieron cargar las recetas:', err);
      RECETAS = [];
      _recetasCargadas = true;
      _recetasPromise = null;
      return RECETAS;
    });
  return _recetasPromise;
}

function _getInstagramPostId(url) {
  if (!url) return null;
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function _normalizeInstagramUrl(url) {
  // Convertir cualquier URL de IG en una versión limpia (sin params)
  const id = _getInstagramPostId(url);
  if (!id) return url;
  // Detectar si es reel o post
  if (url.includes('/reel/')) return 'https://www.instagram.com/reel/' + id + '/';
  if (url.includes('/tv/')) return 'https://www.instagram.com/tv/' + id + '/';
  return 'https://www.instagram.com/p/' + id + '/';
}

// Resolver IDs/rubros del campo "productos" en productos reales del catálogo
// ── LIGHTBOX ──
var _lbImages = [];   // lista de todas las imgs del modal actual
var _lbIndex = 0;     // índice actual

function abrirLightbox(src, alt, allImgs, startIdx) {
  const lb = document.getElementById('inspLightbox');
  const img = document.getElementById('inspLightboxImg');
  if (!lb || !img) return;
  _lbImages = allImgs || [src];
  _lbIndex = startIdx || 0;
  _lbSetImg(_lbIndex);
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  _palPushOverlay('lightbox');
}
window.abrirLightbox = abrirLightbox;

function _lbSetImg(i) {
  _lbIndex = Math.max(0, Math.min(i, _lbImages.length - 1));
  const img = document.getElementById('inspLightboxImg');
  if (img) img.src = _lbImages[_lbIndex];
  // prev/next buttons
  const prev = document.getElementById('lbPrev');
  const next = document.getElementById('lbNext');
  if (prev) prev.style.display = _lbImages.length > 1 ? '' : 'none';
  if (next) next.style.display = _lbImages.length > 1 ? '' : 'none';
  const counter = document.getElementById('lbCounter');
  if (counter) counter.textContent = _lbImages.length > 1 ? (_lbIndex+1) + ' / ' + _lbImages.length : '';
}

function lbPrev(e) { e && e.stopPropagation(); _lbSetImg(_lbIndex - 1); }
function lbNext(e) { e && e.stopPropagation(); _lbSetImg(_lbIndex + 1); }
window.lbPrev = lbPrev; window.lbNext = lbNext;

function cerrarLightbox() {
  const lb = document.getElementById('inspLightbox');
  if (lb) lb.classList.add('hidden');
  document.body.style.overflow = '';
}
window.cerrarLightbox = cerrarLightbox;

// Swipe en el lightbox
(function() {
  var tx0 = 0;
  document.addEventListener('touchstart', function(e) {
    const lb = document.getElementById('inspLightbox');
    if (!lb || lb.classList.contains('hidden')) return;
    tx0 = e.touches[0].clientX;
  }, {passive:true});
  document.addEventListener('touchend', function(e) {
    const lb = document.getElementById('inspLightbox');
    if (!lb || lb.classList.contains('hidden')) return;
    const dx = e.changedTouches[0].clientX - tx0;
    if (Math.abs(dx) > 50) { if (dx < 0) lbNext(); else lbPrev(); }
  }, {passive:true});
})();


function _resolveRecetaProductos(refs) {
  if (!refs || !PRODS || !CATS) return [];
  const tokens = refs.split(',').map(s => s.trim()).filter(Boolean);
  const found = [];
  const seen = new Set();
  tokens.forEach(token => {
    const num = parseInt(token, 10);
    if (!isNaN(num) && String(num) === token) {
      // Es un ID numérico → buscar por productId
      const match = PRODS.find(p => {
        const pid = p[12] && p[12].productId;
        return String(pid) === token;
      });
      if (match && !seen.has(match[0])) { found.push(match); seen.add(match[0]); }
    } else {
      // Es un nombre de rubro → buscar todos los productos del rubro
      const cat = CATS.find(c => c.n.toLowerCase() === token.toLowerCase());
      if (cat) {
        PRODS.filter(p => p[1] === cat.id).forEach(p => {
          if (!seen.has(p[0])) { found.push(p); seen.add(p[0]); }
        });
      }
    }
  });
  return found;
}

// Configuración de categorías
function _escHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const INSP_CATS = {
  'Receta':      { emoji:'🍽', bg:'#b07030', light:'#fdf3e8' },
  'Hierbas':     { emoji:'🌿', bg:'#4a8a62', light:'#eaf4ee' },
  'Suplementos': { emoji:'💊', bg:'#547692', light:'#e8f0f6' },
  'Tips':        { emoji:'💡', bg:'#c4853a', light:'#fdf0e3' },
  'Tops':        { emoji:'⭐', bg:'#8a5a9a', light:'#f3edf7' },
  'Guías':       { emoji:'📖', bg:'#4a7a9b', light:'#e8f2f8' },
  'Infusiones':  { emoji:'🫖', bg:'#6a8a3a', light:'#eef4e5' },
  'Wellness':    { emoji:'🌱', bg:'#5a8a72', light:'#eaf5ef' },
};
function _catCfg(cat) {
  return INSP_CATS[cat] || { emoji:'✨', bg:'var(--azul)', light:'rgba(84,118,146,.08)' };
}

function _renderFiltrosRecetas() {
  const cats = [...new Set(RECETAS.map(r => r.categoria).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  const cont = document.getElementById('recetasFilters');
  if (!cont) return;
  let h = '<button class="recetas-filter-chip ' + (_recetasFiltroActivo === '' ? 'active' : '') + '" data-cat="" onclick="filtrarRecetas(\'\')">Todas</button>';
  cats.forEach(c => {
    h += '<button class="recetas-filter-chip ' + (_recetasFiltroActivo === c ? 'active' : '') + '" data-cat="' + c + '" onclick="filtrarRecetas(\'' + c.replace(/'/g, "\\'") + '\')">' + c + '</button>';
  });
  cont.innerHTML = h;
}

function filtrarRecetas(cat) {
  _recetasFiltroActivo = cat;
  _renderFiltrosRecetas();
  _renderRecetasGrid();
}
window.filtrarRecetas = filtrarRecetas;

function _renderRecetasGrid() {
  const grid = document.getElementById('recetasGrid');
  const empty = document.getElementById('recetasEmpty');
  if (!grid) return;
  let recetas = RECETAS;
  if (_recetasFiltroActivo) recetas = recetas.filter(r => r.categoria === _recetasFiltroActivo);
  if (!recetas.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  let h = '';
  recetas.forEach((r, i) => {
    const idx = RECETAS.indexOf(r);
    const cfg = _catCfg(r.categoria);
    const thumbSrc = r.miniatura ? _driveToImg(r.miniatura) : '';
    const thumbHTML = thumbSrc
      ? '<img src="' + thumbSrc + '" alt="' + _escHtml(r.titulo) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
        '<div class="insp-card-fallback" style="display:none;background:' + cfg.light + ';color:' + cfg.bg + '">' + cfg.emoji + '</div>'
      : '<div class="insp-card-fallback" style="background:' + cfg.light + ';color:' + cfg.bg + '">' + cfg.emoji + '</div>';
    const hasSlides = r.slides && r.slides.length > 0;
    const typeIcon = hasSlides ? '🗂' : r.urlIG ? '▶' : '📄';
    let prodChip = '';
    if (r.productos) {
      const prods = _resolveRecetaProductos(r.productos);
      if (prods.length) {
        prodChip = '<div class="insp-card-prod">🛒 ' + _escHtml(prods.slice(0,2).map(p=>p[2].split(' ')[0]).join(', ')) + (prods.length>2?'...':'') + '</div>';
      }
    }
    h += '<div class="insp-card" onclick="abrirReceta(' + idx + ')">' +
      '<div class="insp-card-thumb">' + thumbHTML + '</div>' +
      '<div class="insp-card-body">' +
        '<div class="insp-card-badge" style="background:' + cfg.bg + '">' + cfg.emoji + ' ' + _escHtml(r.categoria||'') + '</div>' +
        '<div class="insp-card-title">' + _escHtml(r.titulo) + '</div>' +
        (r.subtitulo ? '<div class="insp-card-sub">' + _escHtml(r.subtitulo) + '</div>' : '') +
        (r.tiempo ? '<div class="insp-card-meta"><span>⏱ ' + _escHtml(r.tiempo) + '</span></div>' : '') +
      '</div>' +
    '</div>';
  });
  grid.innerHTML = h;
}


function _getInstagramEmbedUrl(url) {
  const id = _getInstagramPostId(url);
  if (!id) return null;
  if (url.includes('/reel/')) return 'https://www.instagram.com/reel/' + id + '/embed/captioned/';
  if (url.includes('/tv/')) return 'https://www.instagram.com/tv/' + id + '/embed/captioned/';
  return 'https://www.instagram.com/p/' + id + '/embed/captioned/';
}

var _inspSlideActual = 0;
var _inspSlideTotalActual = 0;

function abrirReceta(idx, skipHistory) {
  const r = RECETAS[idx];
  if (!r) return;
  _recetaActualIdx = idx;
  const cfg = _catCfg(r.categoria);
  const body = document.getElementById('recetaModalBody');
  let html = '';

  // Hero image
  if (r.miniatura) {
    const imgSrc = _driveToImg(r.miniatura);
    html += '<div class="receta-modal-hero" style="background:' + cfg.light + '">' +
      '<img src="' + imgSrc + '" alt="' + _escHtml(r.titulo) + '" loading="lazy" onerror="this.parentNode.style.display=\'none\'">' +
    '</div>';
  } else {
    html += '<div class="receta-modal-hero receta-modal-hero-empty" style="background:' + cfg.light + ';color:' + cfg.bg + '">' + cfg.emoji + '</div>';
  }

  // Badge + tiempo
  html += '<div class="receta-modal-meta">' +
    '<span class="insp-card-badge" style="background:' + cfg.bg + '">' + cfg.emoji + ' ' + _escHtml(r.categoria||'') + '</span>' +
    (r.tiempo ? '<span class="receta-modal-time">⏱ ' + _escHtml(r.tiempo) + '</span>' : '') +
    '</div>';

  // Subtítulo descriptivo
  if (r.subtitulo) {
    html += '<p class="insp-modal-sub">' + _escHtml(r.subtitulo) + '</p>';
  }

  // SLIDES (carrusel)
  if (r.slides && r.slides.length > 0) {
    _inspSlideActual = 0;
    _inspSlideTotalActual = r.slides.length;
    html += '<div class="insp-slides-wrap">';
    html += '<div class="insp-slides-track" id="inspSlidesTrack">';
    r.slides.forEach((sl, si) => {
      const slImg = sl.imagen ? _driveToImg(sl.imagen) : '';
      const cfg2 = _catCfg(r.categoria);
      html += '<div class="insp-slide">' +
        (slImg
          ? '<div class="insp-slide-img"><img src="' + slImg + '" alt="' + _escHtml(sl.titulo) + '" loading="lazy"></div>'
          : '<div class="insp-slide-img insp-slide-img-empty" style="background:' + cfg2.light + ';color:' + cfg2.bg + '">' + cfg2.emoji + '</div>'
        ) +
        '<div class="insp-slide-body">' +
          '<div class="insp-slide-num">' + (si+1) + ' / ' + r.slides.length + '</div>' +
          '<div class="insp-slide-title">' + _escHtml(sl.titulo) + '</div>' +
          '<div class="insp-slide-text">' + _escHtml(sl.texto) + '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>'; // track
    if (r.slides.length > 1) {
      html += '<div class="insp-slides-nav">' +
        '<button class="insp-slide-btn" onclick="inspSlideGo(-1)">‹</button>' +
        '<div class="insp-slides-dots" id="inspSlidesDots">' +
          r.slides.map((_, si) => '<span class="insp-slide-dot' + (si===0?' active':'') + '" onclick="inspSlideGoTo(' + si + ')"></span>').join('') +
        '</div>' +
        '<button class="insp-slide-btn" onclick="inspSlideGo(1)">›</button>' +
      '</div>';
    }
    html += '</div>'; // wrap
  }

  // Contenido de texto (si no hay slides)
  if (r.contenido && (!r.slides || !r.slides.length)) {
    html += '<div class="insp-modal-content">' + _escHtml(r.contenido).replace(/\n/g, '<br>') + '</div>';
  }

  // Productos vinculados — pills compactos sin límite
  const prods = _resolveRecetaProductos(r.productos);
  if (prods.length) {
    html += '<div class="insp-modal-prods-title">Productos de esta publicación</div>';
    html += '<div class="insp-prods-compact">';
    prods.forEach(p => {
      html += '<div class="insp-prod-pill insp-prod-link" data-pid="' + p[0] + '" data-cat="' + p[1] + '">' +
        '<span class="pp-ic">🛒</span>' +
        '<span class="pp-name">' + _escHtml(p[2]) + '</span>' +
        '<span class="pp-arr">›</span>' +
      '</div>';
    });
    html += '</div>';
  }

  // Instagram — link al perfil de Paladear (los reels no se pueden reproducir inline, así que redirigimos al perfil)
  if (r.urlIG) {
    html += '<a class="receta-ig-link" href="https://www.instagram.com/palade.ar" target="_blank" rel="noopener noreferrer">'
      + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
      + 'Seguinos en Instagram @palade.ar'
      + '</a>';
  }

  document.getElementById('recetaModalTitle').textContent = r.titulo;
  body.innerHTML = html;
  // Event delegation para productos (pills)
  body.querySelectorAll('.insp-prod-link[data-pid]').forEach(function(el) {
    el.addEventListener('click', function() {
      _irAProductoDesdeReceta(parseInt(el.dataset.pid), el.dataset.cat);
    });
  });
  // Lightbox: recopilar TODAS las imágenes del modal (hero + slides)
  var allLbImgs = [];
  var heroImg = body.querySelector('.receta-modal-hero img');
  if (heroImg) allLbImgs.push(heroImg.src);
  body.querySelectorAll('.insp-slide-img img').forEach(function(img) { allLbImgs.push(img.src); });
  // Hero clickeable
  if (heroImg) {
    heroImg.style.cursor = 'zoom-in';
    heroImg.addEventListener('click', function(e) {
      e.stopPropagation();
      abrirLightbox(heroImg.src, heroImg.alt, allLbImgs, 0);
    });
  }
  // Slides clickeables
  body.querySelectorAll('.insp-slide-img img').forEach(function(img, si) {
    img.addEventListener('click', function(e) {
      e.stopPropagation();
      var heroOffset = heroImg ? 1 : 0;
      abrirLightbox(img.src, img.alt, allLbImgs, heroOffset + si);
    });
  });
  document.getElementById('recetaModalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (!skipHistory) {
    _palPushOverlay('recetaModal',{recetaIdx:idx});
  }
  // Touch swipe para slides
  _initSlideSwipe();
}
window.abrirReceta = abrirReceta;

function inspSlideGo(dir) {
  inspSlideGoTo(_inspSlideActual + dir);
}
window.inspSlideGo = inspSlideGo;

function inspSlideGoTo(i) {
  const total = _inspSlideTotalActual;
  _inspSlideActual = Math.max(0, Math.min(i, total - 1));
  const track = document.getElementById('inspSlidesTrack');
  if (track) track.style.transform = 'translateX(-' + (_inspSlideActual * 100) + '%)';
  document.querySelectorAll('.insp-slide-dot').forEach((d, j) => d.classList.toggle('active', j === _inspSlideActual));
}
window.inspSlideGoTo = inspSlideGoTo;

function _initSlideSwipe() {
  const track = document.getElementById('inspSlidesTrack');
  if (!track || _inspSlideTotalActual <= 1) return;
  let tx0 = 0;
  track.addEventListener('touchstart', function(e) { tx0 = e.touches[0].clientX; }, {passive:true, once:false});
  track.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].clientX - tx0;
    if (Math.abs(dx) > 40) inspSlideGo(dx < 0 ? 1 : -1);
  }, {passive:true});
}


function cerrarRecetaModal() {
  document.getElementById('recetaModalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  document.getElementById('recetaModalBody').innerHTML = '';
}
window.cerrarRecetaModal = cerrarRecetaModal;

function _irAProductoDesdeReceta(pid, catId) {
  const p = PRODS.find(x => x[0] === pid);
  if (!p) return;
  // Crear overlay si no existe
  let ov = document.getElementById('recetaProdOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'recetaProdOverlay';
    ov.className = 'receta-prod-overlay hidden';
    ov.innerHTML = '<div class="receta-prod-sheet" id="recetaProdSheet"><button class="receta-prod-sheet-close" id="recetaProdClose">✕</button><div id="recetaProdBody"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) { if (e.target === ov) cerrarProductoReceta(); });
    document.getElementById('recetaProdClose').addEventListener('click', cerrarProductoReceta);
  }
  const prefix = 'rp';
  document.getElementById('recetaProdBody').innerHTML = renderCard(p, prefix, true);
  const opts = _sortOpts(Object.keys(p[7]));
  if (opts.length) selOpt(prefix + '_' + p[0], opts[0], p[7][opts[0]][0], p[7][opts[0]][1]);
  ov.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (!history.state || history.state.view !== 'productReceta') {
    _palPushOverlay('productReceta');
  }
}
window._irAProductoDesdeReceta = _irAProductoDesdeReceta;

function cerrarProductoReceta() {
  const ov = document.getElementById('recetaProdOverlay');
  if (ov) ov.classList.add('hidden');
  document.body.style.overflow = '';
}
window.cerrarProductoReceta = cerrarProductoReceta;

// Mostrar/ocultar sección recetas + cargar si es la primera vez
function _mostrarRecetas() {
  cargarRecetas().then(function() {
    _renderFiltrosRecetas();
    _renderRecetasGrid();
  });
}

// Verificar si un producto tiene receta vinculada
function _productoTieneReceta(pid, catId) {
  if (!RECETAS || !RECETAS.length) return null;
  // Buscar el productId numérico del producto (no el pid interno)
  const prod = PRODS.find(p => p[0] === pid);
  if (!prod) return null;
  const productIdNum = prod[12] && prod[12].productId;
  for (let i = 0; i < RECETAS.length; i++) {
    const r = RECETAS[i];
    if (!r.productos) continue;
    const tokens = r.productos.split(',').map(s => s.trim());
    for (const token of tokens) {
      const num = parseInt(token, 10);
      if (!isNaN(num) && String(num) === token && String(num) === String(productIdNum)) {
        return { idx: i, receta: r };
      }
      // Rubro
      const cat = CATS.find(c => c.n.toLowerCase() === token.toLowerCase());
      if (cat && cat.id === catId) {
        return { idx: i, receta: r };
      }
    }
  }
  return null;
}
window._productoTieneReceta = _productoTieneReceta;

})(); // fin IIFE


// Si el usuario toca "Pedir por WhatsApp" sin internet, guardamos el pedido
// y lo enviamos cuando vuelva la conexión.

function _guardarPedidoPendiente(url, tipo) {
  try {
    localStorage.setItem('paladear_pedido_pendiente', JSON.stringify({url, tipo, ts: Date.now()}));
  } catch(e) {}
  // Mostrar aviso
  _quitarBannerPedido();
  const banner = document.createElement('div');
  banner.id = 'bannerPedidoOffline';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:20px">📦</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14px">Sin conexión — pedido guardado</div>
        <div style="font-size:12px;opacity:.85">Cuando tengas internet, tocá el botón para enviarlo</div>
      </div>
      <button onclick="_enviarPedidoPendiente()" style="background:#25d366;color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap">💬 Enviar</button>
      <button onclick="_cancelarPedidoPendiente()" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:10px;padding:9px 10px;font-size:13px;cursor:pointer">✕</button>
    </div>`;
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#547692;color:#fff;padding:14px 16px;z-index:10000;box-shadow:0 -2px 12px rgba(0,0,0,.2)';
  document.body.appendChild(banner);
}

function _quitarBannerPedido() {
  const b = document.getElementById('bannerPedidoOffline');
  if (b) b.remove();
}

function _enviarPedidoPendiente() {
  try {
    const raw = localStorage.getItem('paladear_pedido_pendiente');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!navigator.onLine) {
      // Todavía sin internet: avisar
      const btn = document.querySelector('#bannerPedidoOffline button');
      if (btn) { btn.textContent = '⚠️ Aún sin conexión'; setTimeout(()=>{ btn.textContent='💬 Enviar'; }, 2000); }
      return;
    }
    window.open(data.url, '_blank');
    localStorage.removeItem('paladear_pedido_pendiente');
    _quitarBannerPedido();
  } catch(e) {}
}
window._enviarPedidoPendiente = _enviarPedidoPendiente;

function _cancelarPedidoPendiente() {
  localStorage.removeItem('paladear_pedido_pendiente');
  _quitarBannerPedido();
}
window._cancelarPedidoPendiente = _cancelarPedidoPendiente;

// Al recuperar internet: mostrar el banner si hay pedido pendiente
window.addEventListener('online', function() {
  try {
    const raw = localStorage.getItem('paladear_pedido_pendiente');
    if (!raw) return;
    _quitarBannerPedido();
    const data = JSON.parse(raw);
    const banner = document.createElement('div');
    banner.id = 'bannerPedidoOffline';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:20px">🌐</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px">¡Volvió la conexión!</div>
          <div style="font-size:12px;opacity:.85">Tenés un pedido guardado listo para enviar</div>
        </div>
        <button onclick="_enviarPedidoPendiente()" style="background:#25d366;color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap">💬 Enviar por WhatsApp</button>
        <button onclick="_cancelarPedidoPendiente()" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:10px;padding:9px 10px;font-size:13px;cursor:pointer">✕</button>
      </div>`;
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#2d7a4f;color:#fff;padding:14px 16px;z-index:10000;box-shadow:0 -2px 12px rgba(0,0,0,.2)';
    document.body.appendChild(banner);
  } catch(e) {}
});

// Al abrir la app: si hay pedido pendiente y hay internet, mostrar el banner
(function() {
  try {
    const raw = localStorage.getItem('paladear_pedido_pendiente');
    if (!raw) return;
    const data = JSON.parse(raw);
    // Solo mostrar si el pedido tiene menos de 24 horas
    if (Date.now() - data.ts > 86400000) { localStorage.removeItem('paladear_pedido_pendiente'); return; }
    if (navigator.onLine) {
      // Hay internet y pedido pendiente: mostrar banner verde de reenvío
      window.addEventListener('load', function() {
        setTimeout(function() {
          _quitarBannerPedido();
          const banner = document.createElement('div');
          banner.id = 'bannerPedidoOffline';
          banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="font-size:20px">📦</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:14px">Tenés un pedido guardado</div>
                <div style="font-size:12px;opacity:.85">Quedó guardado cuando no había conexión</div>
              </div>
              <button onclick="_enviarPedidoPendiente()" style="background:#25d366;color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap">💬 Enviar por WhatsApp</button>
              <button onclick="_cancelarPedidoPendiente()" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:10px;padding:9px 10px;font-size:13px;cursor:pointer">✕</button>
            </div>`;
          banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#2d7a4f;color:#fff;padding:14px 16px;z-index:10000;box-shadow:0 -2px 12px rgba(0,0,0,.2)';
          document.body.appendChild(banner);
        }, 1500);
      });
    } else {
      // Sin internet y hay pedido: mostrar el banner azul
      window.addEventListener('load', function() {
        setTimeout(function() { _guardarPedidoPendiente(data.url, data.tipo); }, 1000);
      });
    }
  } catch(e) {}
})();
