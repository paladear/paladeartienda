import { readFile, writeFile } from 'node:fs/promises';

const RUBRO_MAP = {
  'FRUTOS SECOS': { id: 'frutos', n: 'Frutos Secos', ic: '🥜' },
  'DESHIDRATADOS': { id: 'deshidratados', n: 'Deshidratados', ic: '🍇' },
  'SEMILLAS': { id: 'semillas', n: 'Semillas', ic: '🌻' },
  'ESPECIAS': { id: 'especias', n: 'Especias', ic: '🌿' },
  'INFUSIONES Y HIERBAS': { id: 'infusiones', n: 'Infusiones y Hierbas', ic: '🍵' },
  'CEREALES': { id: 'cereales', n: 'Cereales', ic: '🥣' },
  'GRANOS Y LEGUMBRES': { id: 'granos', n: 'Granos y Legumbres', ic: '🫘' },
  'HARINAS': { id: 'harinas', n: 'Harinas', ic: '🌾' },
  'PRODUCTOS SIN TACC': { id: 'sintacc', n: 'Sin TACC', ic: '🌱' },
  'DULCES, MIEL Y CHOCOLATES': { id: 'dulces', n: 'Dulces, Miel y Chocolates', ic: '🍯' },
  'AZUCAR, CACAO Y REPOSTERIA': { id: 'reposteria', n: 'Azúcar, Cacao y Repostería', ic: '🍫' },
  'MANTECAS Y PASTAS': { id: 'mantecas', n: 'Mantecas y Pastas', ic: '🧈' },
  'ACEITES Y VINAGRES': { id: 'aceites', n: 'Aceites y Vinagres', ic: '🫙' },
  'ACEITUNAS': { id: 'aceitunas', n: 'Aceitunas', ic: '🫒' },
  'ENCURTIDOS': { id: 'encurtidos', n: 'Encurtidos', ic: '🥒' },
  'TOMATE TRITURADO': { id: 'tomate', n: 'Tomate', ic: '🍅' },
  'SNACK': { id: 'snack', n: 'Snacks', ic: '🍿' },
  'SUPLEMENTOS': { id: 'suplementos', n: 'Suplementos', ic: '💊' },
  'LINEA GOURMET': { id: 'gourmet', n: 'Línea Gourmet', ic: '⭐' },
  'BEBIDAS': { id: 'bebidas', n: 'Bebidas', ic: '🥤' },
  'VINOS': { id: 'vinos', n: 'Vinos y Licores', ic: '🍷' },
  'PRODUCTOS DE FRIO': { id: 'frio', n: 'Productos de Frío', ic: '❄️' },
  'PRODUCTOS CONGELADOS': { id: 'congelados', n: 'Congelados', ic: '🧊' },
  'PALADEAR HOME': { id: 'home', n: 'Paladear Home', ic: '🏠' }
};

function parseCsv(csv) {
  const rows = [];
  const lines = csv.trim().split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    let raw = lines[i++];
    let quoteCount = (raw.match(/"/g) || []).length;
    while (quoteCount % 2 !== 0 && i < lines.length) {
      raw += '\n' + lines[i++];
      quoteCount = (raw.match(/"/g) || []).length;
    }
    const cols = [];
    let current = '';
    let quoted = false;
    for (let j = 0; j < raw.length; j++) {
      const char = raw[j];
      if (char === '"') {
        if (quoted && raw[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    rows.push(cols);
  }
  return rows;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function cleanId(value) {
  return String(value || '').trim().replace(/\./g, '').replace(/,.*$/, '');
}

function price(value) {
  const clean = String(value || '').replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.');
  const number = Number.parseFloat(clean);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function list(value) {
  if (!value) return null;
  const items = String(value).split('/').map(item => item.trim()).filter(Boolean);
  return items.length ? items : null;
}

function optionPrice(option, regular, discount, isKg) {
  const compact = option.toLowerCase().replace(/\s+/g, '');
  let match = compact.match(/^(\d+)g$/);
  if (match && isKg) {
    const factor = Number.parseInt(match[1], 10) / 1000;
    return [Math.round(regular * factor), Math.round(discount * factor)];
  }
  match = compact.match(/^([\d.,]+)kg$/);
  if (match && isKg) {
    const factor = Number.parseFloat(match[1].replace(',', '.'));
    return [Math.round(regular * factor), Math.round(discount * factor)];
  }
  match = compact.match(/^(\d+)(unidad|unidades|und|u)$/);
  if (match) {
    const factor = Number.parseInt(match[1], 10);
    return [Math.round(regular * factor), Math.round(discount * factor)];
  }
  return [regular, discount];
}

function buildCatalog(pricesCsv, infoCsv) {
  const infoByKey = new Map();
  for (const cols of parseCsv(infoCsv).slice(1)) {
    const name = String(cols[0] || '').trim();
    if (!name) continue;
    const id = cleanId(cols[6]);
    const entry = {
      name,
      quantities: list(cols[1]),
      info: String(cols[2] || '').trim(),
      flavors: list(cols[3]),
      image: String(cols[4] || '').trim(),
      mix: /^si$/i.test(String(cols[5] || '').trim()),
      offer: Number.parseInt(String(cols[7] || '').replace('%', ''), 10) || 0
    };
    infoByKey.set(id || normalize(name), entry);
    if (id && normalize(name) !== id) infoByKey.set(normalize(name), entry);
  }

  const categoryIds = new Set();
  const products = [];
  let pid = 1;
  for (const cols of parseCsv(pricesCsv).slice(1)) {
    const sourceName = String(cols[2] || '').trim();
    const regular = price(cols[3]);
    const discount = price(cols[4]);
    const category = RUBRO_MAP[normalize(cols[5])];
    const productId = cleanId(cols[6]);
    if (!sourceName || !regular || !discount || !category) continue;

    categoryIds.add(category.id);
    const info = infoByKey.get(productId) || infoByKey.get(normalize(sourceName)) || {};
    const quantities = info.quantities || [];
    const isKgFromInfo = quantities.some(option => /g$|kg$/i.test(option.replace(/\s+/g, '')));
    const isKgFromName = /x kg|xkg|x 1 kg| kg/i.test(sourceName);
    const isKg = quantities.length ? isKgFromInfo : isKgFromName;
    const isSpice = category.id === 'especias' || category.id === 'infusiones';
    const options = {};

    if (quantities.length) {
      quantities.forEach(option => { options[option] = optionPrice(option, regular, discount, isKg); });
    } else if (isKg && isSpice) {
      options['100g'] = [Math.round(regular * .1), Math.round(discount * .1)];
      options['500g'] = [Math.round(regular * .5), Math.round(discount * .5)];
      options['1 kg'] = [regular, discount];
    } else if (isKg) {
      options['500g'] = [Math.round(regular * .5), Math.round(discount * .5)];
      options['1 kg'] = [regular, discount];
    } else {
      options['1 und'] = [regular, discount];
    }

    const hasImage = Boolean(info.image || String(cols[7] || '').trim());
    const image = hasImage && productId
      ? 'https://res.cloudinary.com/hswu4zpv/image/upload/f_auto,q_auto,w_500/' + productId
      : '';
    products.push([
      pid++, category.id, info.name || sourceName, isKg ? 'Granel' : 'Varios',
      isKg ? 'kg' : 'und', false, image, options, info.info || '', info.flavors || null,
      info.mix === true, false, { productId, oferta: info.offer || 0 }
    ]);
  }

  const categories = Object.values(RUBRO_MAP).filter(category => categoryIds.has(category.id));
  return { cats: categories, prods: products };
}

const [pricesCsv, infoCsv] = await Promise.all([
  readFile('precios-min.csv', 'utf8'),
  readFile('info-min.csv', 'utf8')
]);
const catalog = buildCatalog(pricesCsv, infoCsv);
if (catalog.prods.length < 50) throw new Error('Snapshot cancelado: solo se encontraron ' + catalog.prods.length + ' productos');
await writeFile('catalog-min.json', JSON.stringify(catalog));
console.log('Snapshot generado: ' + catalog.prods.length + ' productos y ' + catalog.cats.length + ' categorías.');
