// Genera una página real por producto y por rubro, para que Google (y WhatsApp)
// vean el contenido en el HTML y no sólo después de ejecutar JavaScript.
// NO toca precios-min.csv ni catalogo-panel.json: sólo los lee.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://paladear.com.ar/';
const TIENDA = 'Paladear Mercado de Sabores';
const SALIDA = process.env.SALIDA || '.';

const VALID_RUBROS = new Map([
  ['FRUTOS SECOS','Frutos Secos'],['DESHIDRATADOS','Deshidratados'],['SEMILLAS','Semillas'],
  ['ESPECIAS','Especias'],['INFUSIONES Y HIERBAS','Infusiones y Hierbas'],['CEREALES','Cereales'],
  ['GRANOS Y LEGUMBRES','Granos y Legumbres'],['HARINAS','Harinas'],['PRODUCTOS SIN TACC','Sin TACC'],
  ['DULCES, MIEL Y CHOCOLATES','Dulces, Miel y Chocolates'],['AZUCAR, CACAO Y REPOSTERIA','Azúcar, Cacao y Repostería'],
  ['MANTECAS Y PASTAS','Mantecas y Pastas'],['ACEITES Y VINAGRES','Aceites y Vinagres'],['ACEITUNAS','Aceitunas'],
  ['ENCURTIDOS','Encurtidos'],['TOMATE TRITURADO','Tomate'],['SNACK','Snacks'],['SUPLEMENTOS','Suplementos'],
  ['LINEA GOURMET','Línea Gourmet'],['BEBIDAS','Bebidas'],['VINOS','Vinos y Licores'],
  ['PRODUCTOS DE FRIO','Productos de Frío'],['PRODUCTOS CONGELADOS','Congelados'],['PALADEAR HOME','Paladear Home']
]);

function parseCsv(csv){
  const rows=[]; const lines=csv.trim().split(/\r?\n/); let i=0;
  while(i<lines.length){
    let raw=lines[i++]; let q=(raw.match(/"/g)||[]).length;
    while(q%2!==0 && i<lines.length){ raw+='\n'+lines[i++]; q=(raw.match(/"/g)||[]).length; }
    const cols=[]; let cur=''; let quoted=false;
    for(let j=0;j<raw.length;j++){
      const ch=raw[j];
      if(ch==='"'){ if(quoted&&raw[j+1]==='"'){cur+='"';j++;} else quoted=!quoted; }
      else if(ch===','&&!quoted){ cols.push(cur.trim()); cur=''; }
      else cur+=ch;
    }
    cols.push(cur.trim()); rows.push(cols);
  }
  return rows;
}
const norm = v => String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim();
const slug = v => String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-');
const cleanId = v => String(v||'').trim().replace(/\./g,'').replace(/,.*$/,'');
function price(v){
  const c=String(v||'').replace(/[^0-9,.]/g,'').replace(/\./g,'').replace(',','.');
  const n=Number.parseFloat(c); return Number.isFinite(n)?Math.round(n):0;
}
const esc = v => String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmt = n => new Intl.NumberFormat('es-AR').format(Math.round(n||0));
// "100G" y "1KG" como los escribe la tienda: "100 g", "1 kg".
const medida = v => String(v||'').trim().replace(/^(\d+)\s*(kg|gr|g)$/i,
  (m,n,u)=>n+' '+(u.toLowerCase()==='kg'?'kg':'g'));
// Corta sin partir palabras, para la descripción que ve Google.
function recorte(t,max){
  t=String(t||'').replace(/\s+/g,' ').trim();
  if(t.length<=max) return t;
  const corte=t.slice(0,max-1);
  return corte.slice(0,corte.lastIndexOf(' ')).replace(/[,;:.\s]+$/,'')+'…';
}

function optsDe(cantidades){
  const t=String(cantidades||'').trim();
  if(!t) return null;
  const partes=t.split('/').map(x=>x.trim()).filter(Boolean);
  if(!partes.length) return null;
  const gram = partes.every(p=>/^\d+\s*(g|gr|kg)$/i.test(p));
  if(!gram) return {granel:false, labels:partes};
  const g = p => { const m=p.match(/^(\d+)\s*(g|gr|kg)$/i); if(!m) return 0;
    return /kg/i.test(m[2]) ? Number(m[1])*1000 : Number(m[1]); };
  return {granel:true, labels:partes, gramos:partes.map(g)};
}

function buildProducts(pricesCsv, fichas){
  const rows=parseCsv(pricesCsv);
  const porId=new Map();
  for(const cols of rows.slice(1)){
    const nombreCsv=String(cols[2]||'').trim();
    const p1=price(cols[3]), p2=price(cols[4]);
    const rubroKey=norm(cols[5]);
    const id=cleanId(cols[6]);
    if(!nombreCsv||!p1||!p2||!VALID_RUBROS.has(rubroKey)||!id) continue;
    const fi=fichas[id]||{};
    if(fi.oculto===true) continue;
    const nombre=String(fi.nombre||nombreCsv).trim();
    const sl=slug(nombre)+'-'+slug(id);
    if(!slug(nombre)||!slug(id)) continue;
    const o=optsDe(fi.cantidades);
    const ofertaPct=Number(fi.oferta||0)||0;
    const conOferta = p => ofertaPct>0 ? Math.round(p*(1-ofertaPct/100)) : p;
    let desde, hasta;
    if(o && o.granel){
      const gs=o.gramos.filter(x=>x>0).sort((a,b)=>a-b);
      desde = conOferta(Math.round(p1*(gs[0]/1000)));
      hasta = conOferta(Math.round(p1*(gs[gs.length-1]/1000)));
    } else { desde = hasta = conOferta(p1); }
    porId.set(id,{
      id, nombre, slug:sl, rubroKey,
      rubro: VALID_RUBROS.get(rubroKey), rubroSlug: slug(VALID_RUBROS.get(rubroKey)),
      desc: String(fi.desc||'').trim(),
      marca: String(fi.marca||'').trim(),
      envase: String(fi.envase||'').trim(),
      granel: !!(o&&o.granel), labels:(o&&o.labels)||[],
      precioKg: p1, precioLista: p1,
      gramoMin: (o&&o.granel) ? o.gramos.filter(x=>x>0).sort((a,b)=>a-b)[0] : 0,
      desde, hasta, ofertaPct,
      url: BASE+'p/'+sl+'/'
    });
  }
  return [...porId.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
}

const CSS = `*{box-sizing:border-box}body{margin:0;font-family:'Montserrat',system-ui,-apple-system,'Segoe UI',sans-serif;color:#17384f;background:#eef5fa;line-height:1.55}
a{color:#1f5f8b}.wrap{max-width:1000px;margin:0 auto;padding:18px 18px 56px}
header.top{background:#4c7592;padding:12px 18px}header.top a{color:#fff;text-decoration:none;font-weight:800;font-size:17px;letter-spacing:.01em}
nav.mig{font-size:12.5px;color:#5a7f99;margin:16px 0 10px}nav.mig a{color:#5a7f99}
.ficha{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:30px;align-items:start;background:#fff;border:1px solid #d8e5ee;border-radius:18px;padding:22px}
@media(max-width:760px){.ficha{grid-template-columns:1fr;gap:18px;padding:16px}}
.foto{aspect-ratio:1;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e6eef4}
.foto img{max-width:100%;max-height:100%;object-fit:contain}
h1{font-size:clamp(23px,3.4vw,33px);line-height:1.12;margin:0 0 8px;letter-spacing:-.02em}
.marca{font-size:12.5px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#4e7898;margin:0 0 12px}
.precio{font-size:27px;font-weight:800;color:#123f67;margin:14px 0 2px}
.precio s{color:#8aa4b8;font-weight:700;font-size:19px;margin-right:6px}
.precio small{display:block;font-size:12.5px;font-weight:700;color:#5a7f99;letter-spacing:.02em}
.medidas{margin:12px 0;display:flex;flex-wrap:wrap;gap:6px}
.medidas span{border:1px solid #d7e5ed;background:#edf4f8;border-radius:8px;padding:5px 11px;font-size:13px;font-weight:700}
.desc{font-size:14.5px;color:#46637a;margin:14px 0 0}
.cta{display:inline-block;margin-top:20px;background:#2f6896;color:#fff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:12px;font-size:15.5px}
.rel{margin-top:40px}.rel h2{font-size:17px;margin:0 0 14px}
.rel ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px}
.rel li a{display:block;background:#fff;border:1px solid #dde8f0;border-radius:11px;padding:11px 13px;text-decoration:none;font-size:13.5px;font-weight:700;color:#1f5f8b}
footer{margin-top:44px;font-size:12.5px;color:#6b8aa1;text-align:center}`;

function pagina({title, desc, canonical, image, body, schema}){
  return `<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Paladear">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${image?`<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(image)}">`:'<meta name="twitter:card" content="summary">'}
<meta property="og:locale" content="es_AR">
<link rel="icon" href="${BASE}favicon-32x32.png" sizes="32x32">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<header class="top"><a href="${BASE}">Paladear Mercado de Sabores</a></header>
<div class="wrap">
${body}
<footer>Paladear Mercado de Sabores · Pueyrredón 588, Mendoza · <a href="${BASE}">Ver toda la tienda</a></footer>
</div>
</body>
</html>
`;
}

function paginaProducto(p, hermanos, hayFoto){
  const img = hayFoto ? BASE+'fotos/'+p.id+'.webp' : '';
  const titulo = p.nombre + (p.marca?' '+p.marca:'') + ' | Paladear Mendoza';
  const descMeta = recorte(p.desc || (p.nombre+(p.marca?' de '+p.marca:'')+'. Comprá online en Paladear, dietética en Mendoza con envíos a todo el país.'), 158);
  // Con oferta se muestran los dos precios, igual que en la tienda.
  const listaKg = p.granel ? p.precioKg : p.precioLista;
  const tachado = p.ofertaPct>0
    ? `<s>$${fmt(p.granel ? Math.round(p.precioKg*(p.gramoMin/1000)) : p.precioLista)}</s> ` : '';
  const precioTxt = p.granel
    ? `${tachado}$${fmt(p.desde)} <small>desde ${esc(medida(p.labels[0]))} · $${fmt(listaKg)} el kilo${p.ofertaPct>0?' · Oferta -'+p.ofertaPct+'%':''}</small>`
    : `${tachado}$${fmt(p.desde)}${(p.envase||p.ofertaPct>0)?` <small>${esc(p.envase||'')}${p.envase&&p.ofertaPct>0?' · ':''}${p.ofertaPct>0?'Oferta -'+p.ofertaPct+'%':''}</small>`:''}`;
  const offers = p.granel
    ? {"@type":"AggregateOffer","priceCurrency":"ARS","lowPrice":p.desde,"highPrice":p.hasta,
       "offerCount":p.labels.length,"availability":"https://schema.org/InStock","url":p.url}
    : {"@type":"Offer","priceCurrency":"ARS","price":p.desde,
       "availability":"https://schema.org/InStock","url":p.url,
       "priceValidUntil":new Date(Date.now()+1000*60*60*24*30).toISOString().slice(0,10)};
  const schema = {"@context":"https://schema.org","@graph":[
    {"@type":"Product","name":p.nombre,
     ...(p.desc?{"description":p.desc}:{}),
     ...(img?{"image":[img]}:{}),
     ...(p.marca?{"brand":{"@type":"Brand","name":p.marca}}:{}),
     "sku":p.id,"category":p.rubro,"offers":offers,
     "seller":{"@type":"Organization","name":TIENDA}},
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Inicio","item":BASE},
      {"@type":"ListItem","position":2,"name":p.rubro,"item":BASE+'c/'+p.rubroSlug+'/'},
      {"@type":"ListItem","position":3,"name":p.nombre,"item":p.url}]}]};
  const body = `<nav class="mig"><a href="${BASE}">Inicio</a> › <a href="${BASE}c/${p.rubroSlug}/">${esc(p.rubro)}</a> › ${esc(p.nombre)}</nav>
<article class="ficha">
  <div class="foto">${img?`<img src="${esc(img)}" alt="${esc(p.nombre)}${p.marca?' '+esc(p.marca):''}" width="600" height="600">`:''}</div>
  <div>
    ${p.marca?`<p class="marca">${esc(p.marca)}</p>`:''}
    <h1>${esc(p.nombre)}</h1>
    <p class="precio" data-art="${esc(p.id)}">${precioTxt}</p>
    ${p.labels.length>1?`<div class="medidas">${p.labels.map(l=>`<span>${esc(medida(l))}</span>`).join('')}</div>`:''}
    ${p.desc?`<p class="desc">${esc(p.desc)}</p>`:''}
    <a class="cta" href="${BASE}?producto=${esc(p.slug)}">Ver y agregar al carrito</a>
  </div>
</article>
${hermanos.length?`<section class="rel"><h2>Más de ${esc(p.rubro)}</h2><ul>${hermanos.map(h=>`<li><a href="${BASE}p/${esc(h.slug)}/">${esc(h.nombre)}</a></li>`).join('')}</ul></section>`:''}`;
  return pagina({title:titulo, desc:descMeta, canonical:p.url, image:img, body, schema});
}

function paginaRubro(rubro, rubroSlug, prods){
  const url = BASE+'c/'+rubroSlug+'/';
  const titulo = rubro + ' en Mendoza | Paladear';
  const descMeta = recorte(`${rubro}: ${prods.slice(0,6).map(p=>p.nombre).join(', ')} y más. Comprá online en Paladear, dietética en Mendoza con envíos a todo el país.`, 158);
  const schema = {"@context":"https://schema.org","@graph":[
    {"@type":"CollectionPage","name":rubro,"url":url,
     "mainEntity":{"@type":"ItemList","numberOfItems":prods.length,
       "itemListElement":prods.slice(0,60).map((p,i)=>({"@type":"ListItem","position":i+1,"name":p.nombre,"url":p.url}))}},
    {"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Inicio","item":BASE},
      {"@type":"ListItem","position":2,"name":rubro,"item":url}]}]};
  const body = `<nav class="mig"><a href="${BASE}">Inicio</a> › ${esc(rubro)}</nav>
<h1>${esc(rubro)}</h1>
<p class="desc">${prods.length} productos de ${esc(rubro.toLowerCase())} en Paladear, dietética en Mendoza. Entrá a cada uno para ver medidas y precios.</p>
<a class="cta" href="${BASE}?categoria=${esc(rubroSlug)}">Ver ${esc(rubro)} en la tienda</a>
<section class="rel"><h2>Todos los productos</h2><ul>${prods.map(p=>`<li><a href="${BASE}p/${esc(p.slug)}/">${esc(p.nombre)}</a></li>`).join('')}</ul></section>`;
  return pagina({title:titulo, desc:descMeta, canonical:url, image:BASE+'og-image.jpg', body, schema});
}

// ───────────────────────────────────────────────────────────────
const [pricesRaw, panelRaw] = await Promise.all([
  readFile('precios-min.csv','utf8'), readFile('catalogo-panel.json','utf8')
]);
const fichas=(JSON.parse(panelRaw)||{}).fichas||{};
if(!Object.keys(fichas).length) throw new Error('catalogo-panel.json no trae fichas');
const productos=buildProducts(pricesRaw.replace(/\r\n?/g,'\n'), fichas);
if(productos.length<50) throw new Error('Solo '+productos.length+' productos; se cancela para no romper lo publicado');

const porRubro=new Map();
for(const p of productos){ if(!porRubro.has(p.rubro)) porRubro.set(p.rubro,[]); porRubro.get(p.rubro).push(p); }

await rm(path.join(SALIDA,'p'),{recursive:true,force:true});
await rm(path.join(SALIDA,'c'),{recursive:true,force:true});

let nFotos=0;
for(const p of productos){
  const hayFoto=existsSync(path.join(SALIDA,'fotos',p.id+'.webp'));
  if(hayFoto) nFotos++;
  const hermanos=(porRubro.get(p.rubro)||[]).filter(h=>h.id!==p.id).slice(0,8);
  const dir=path.join(SALIDA,'p',p.slug);
  await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,'index.html'), paginaProducto(p,hermanos,hayFoto));
}
for(const [rubro,prods] of porRubro){
  const dir=path.join(SALIDA,'c',prods[0].rubroSlug);
  await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,'index.html'), paginaRubro(rubro,prods[0].rubroSlug,prods));
}
// ── Sitemaps ───────────────────────────────────────────────────────────────
// Ahora apuntan a las páginas reales (/p/ y /c/), no a los parámetros. Las
// direcciones ?producto= siguen funcionando para los links ya compartidos,
// pero no se declaran: index.html dice que su canónica es la portada, así que
// Google las consolida ahí en vez de tomarlas como duplicados.
const urls = [
  BASE,
  BASE + 'catalogo.html',
  ...[...porRubro.values()].map(ps => BASE + 'c/' + ps[0].rubroSlug + '/'),
  ...productos.map(p => p.url)
];
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => '  <url><loc>' + esc(u) + '</loc></url>'),
  '</urlset>',
  ''
].join('\n');
await writeFile(path.join(SALIDA,'sitemap.xml'), sitemap);
await writeFile(path.join(SALIDA,'sitemap.txt'), urls.join('\n') + '\n');

console.log('Páginas generadas: '+productos.length+' productos ('+nFotos+' con foto) y '+porRubro.size+' rubros.');
console.log('Sitemap: '+urls.length+' direcciones.');
