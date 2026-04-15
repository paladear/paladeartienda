#!/usr/bin/env python3
"""
generate.py — Paladear Mercado de Sabores
Lee la planilla de Google Sheets y actualiza el array PRODS en index.html
"""

import csv
import urllib.request
import re
import json
import os

# ─────────────────────────────────────────────
# URL del CSV publicado en Google Sheets
# ─────────────────────────────────────────────
CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2RlZaSdlV-aaVGUw7YI9MVE1MHjopNhbjTOfWBZwPNo_clhJUao2KNcNowEzsdBGpd2Bh5-2rt1aH/pub?output=csv"

# ─────────────────────────────────────────────
# Mapeo de rubros del Sheet → IDs del catálogo
# Ajustá los nombres izquierda según cómo aparecen en tu planilla
# ─────────────────────────────────────────────
RUBRO_MAP = {
    "frutos secos":     "frutos",
    "frutos":           "frutos",
    "cereales":         "cereales",
    "semillas":         "semillas",
    "harinas":          "harinas",
    "granos":           "granos",
    "granos y legumbres": "granos",
    "legumbres":        "granos",
    "especias":         "especias",
    "deshidratados":    "deshidratados",
    "dulces":           "dulces",
    "dulces miel y chocolates": "dulces",
    "miel":             "dulces",
    "chocolates":       "dulces",
    "infusiones":       "infusiones",
    "infusiones y hierbas": "infusiones",
    "hierbas":          "infusiones",
    "suplementos":      "suplementos",
    "aceites":          "aceites",
    "aceites y vinagres": "aceites",
    "vinagres":         "aceites",
    "reposteria":       "reposteria",
    "repostería":       "reposteria",
    "azucar cacao y reposteria": "reposteria",
    "sin tacc":         "sintacc",
    "sin gluten":       "sintacc",
    "snacks":           "snack",
    "snack":            "snack",
    "gourmet":          "gourmet",
    "linea gourmet":    "gourmet",
    "línea gourmet":    "gourmet",
    "bebidas":          "bebidas",
    "encurtidos":       "encurtidos",
    "aceitunas":        "aceitunas",
    "frio":             "frio",
    "productos de frio": "frio",
    "frío":             "frio",
    "congelados":       "congelados",
    "vinos":            "vinos",
    "vinos y licores":  "vinos",
    "home":             "home",
    "paladear home":    "home",
    "tomate":           "tomate",
    "mantecas":         "mantecas",
    "mantecas y pastas": "mantecas",
}

# ─────────────────────────────────────────────
# Mapeo de icono según rubro (igual que el HTML original)
# ─────────────────────────────────────────────
ICONO_MAP = {
    "frutos":       "mix",
    "cereales":     "granola",
    "semillas":     "semillas_mix",
    "harinas":      "harina",
    "granos":       "garbanzos",
    "especias":     "especias",
    "deshidratados":"datil",
    "dulces":       "miel",
    "infusiones":   "te_verde",
    "suplementos":  "colageno",
    "aceites":      "aceite_oliva",
    "reposteria":   "cacao",
    "sintacc":      "semillas_mix",
    "snack":        "barra",
    "gourmet":      "tahine",
    "bebidas":      "kombucha",
    "encurtidos":   "pepinillos",
    "aceitunas":    "aceitunas",
    "frio":         "yoghurt",
    "congelados":   "arandanos_cong",
    "vinos":        "vino",
    "home":         "home",
    "tomate":       "especias",
    "mantecas":     "mantequilla_mani",
}

def limpiar_precio(valor):
    """Convierte '$1.234,56' o '1234.56' o '1234' a entero."""
    if not valor:
        return 0
    # Quitar símbolo $ y espacios
    v = valor.strip().replace("$", "").replace(" ", "")
    # Formato argentino: punto = separador miles, coma = decimal
    # Ej: 1.234,50  → quitar puntos → 1234,50 → reemplazar coma → 1234.50
    if "," in v and "." in v:
        v = v.replace(".", "").replace(",", ".")
    elif "," in v:
        v = v.replace(",", ".")
    else:
        v = v.replace(".", "")
    try:
        return int(float(v))
    except:
        return 0

def detectar_opcion_y_unidad(nombre):
    """
    Del nombre del producto detecta la opción de venta y la unidad.
    Ej: 'ALMENDRA X KG' → opción '1 kg', unidad 'kg'
         'CHIPS X 100 GR' → opción '100g', unidad 'und'
         'MIEL X 500 G' → opción '500g', unidad 'kg'
    """
    nombre_up = nombre.upper()

    # Buscar patrones como "X 500 G", "X 500GR", "X 1 KG", etc.
    pat_gramos = re.search(r'X\s*(\d+)\s*G(?:R(?:S|AMOS?)?)?\b', nombre_up)
    pat_kg = re.search(r'X\s*(\d+(?:[.,]\d+)?)\s*KG', nombre_up)
    pat_ml = re.search(r'X\s*(\d+)\s*(?:ML|CC)', nombre_up)
    pat_lt = re.search(r'X\s*(\d+(?:[.,]\d+)?)\s*(?:LT|LTS|L\b)', nombre_up)
    pat_un = re.search(r'X\s*(\d+)\s*(?:UN(?:IDADES?)?|UDS?)', nombre_up)

    if pat_kg:
        kg = pat_kg.group(1).replace(",", ".")
        num = float(kg)
        opc = f"{int(num)} kg" if num == int(num) else f"{num} kg"
        return opc, "kg"
    elif pat_gramos:
        gr = int(pat_gramos.group(1))
        return f"{gr}g", "kg"
    elif pat_ml:
        ml = int(pat_ml.group(1))
        return f"{ml} ml", "und"
    elif pat_lt:
        lt = pat_lt.group(1).replace(",", ".")
        return f"{lt} L", "und"
    elif pat_un:
        return f"{pat_un.group(1)} und", "und"
    elif "X KG" in nombre_up or "XKG" in nombre_up:
        return "1 kg", "kg"
    else:
        return "1 und", "und"

def construir_prods(filas):
    """Convierte las filas del CSV al array PRODS."""
    prods = []
    id_counter = 10000  # IDs nuevos para no pisar los existentes

    for fila in filas:
        # Esperamos al menos 5 columnas (A,B,C,D,E) pero los datos están en C,D,E,F,G
        # Columnas: A=0, B=1, C=2, D=3, E=4, F=5, G=6
        if len(fila) < 4:
            continue

        # Columna C (índice 2): Nombre
        nombre = fila[2].strip() if len(fila) > 2 else ""
        if not nombre or nombre.upper() in ("NOMBRE", "PRODUCTO", "ARTICULO", "ARTÍCULO", "N"):
            continue  # saltar encabezados o vacíos

        # Columna D (índice 3): Lista 1 (minorista)
        precio_min = limpiar_precio(fila[3]) if len(fila) > 3 else 0

        # Columna E (índice 4): Lista 2 (mayorista)
        precio_may = limpiar_precio(fila[4]) if len(fila) > 4 else 0

        # Columna F (índice 5): Rubro
        rubro_raw = fila[5].strip().lower() if len(fila) > 5 else ""
        rubro = RUBRO_MAP.get(rubro_raw, "gourmet")  # default: gourmet

        # Columna G (índice 6): Imagen (URL)
        imagen_url = fila[6].strip() if len(fila) > 6 else ""

        # Si los dos precios son 0 o el nombre está vacío, saltear
        if precio_min == 0 and precio_may == 0:
            continue

        # Detectar opción de venta y unidad del nombre
        opcion, unidad = detectar_opcion_y_unidad(nombre)

        # Ícono según rubro
        icono = ICONO_MAP.get(rubro, "semillas_mix")

        # Marca: extraer del nombre si tiene formato "NOMBRE MARCA"
        # Por simplicidad usamos "Granel" para a granel, o el texto después de una coma
        if "," in nombre:
            partes = nombre.split(",", 1)
            nombre_limpio = partes[0].strip()
            marca = partes[1].strip()
        else:
            nombre_limpio = nombre
            marca = "Granel"

        # Construcción del producto
        prod = [
            id_counter,
            rubro,
            nombre_limpio,
            marca,
            unidad,
            False,        # destacado (podés activar manualmente)
            icono,
            {opcion: [precio_min, precio_may]},
        ]

        # Si hay imagen URL, la guardamos en un campo extra (para uso futuro)
        if imagen_url:
            prod.append(imagen_url)

        prods.append(prod)
        id_counter += 1

    return prods

def prods_a_js(prods):
    """Convierte el array de productos a string JavaScript."""
    lineas = []
    for p in prods:
        # Separar imagen si existe
        img = p[8] if len(p) > 8 else ""
        base = p[:8]

        # Serializar el dict de opciones
        opts_str = json.dumps(base[7], ensure_ascii=False)

        linea = f'[{base[0]},"{base[1]}",{json.dumps(base[2], ensure_ascii=False)},{json.dumps(base[3], ensure_ascii=False)},"{base[4]}",{str(base[5]).lower()},"{base[6]}",{opts_str}]'
        lineas.append(linea)

    return "[\n" + ",\n".join(lineas) + "\n]"

def main():
    print("📥 Descargando datos del Google Sheet...")

    # Descargar CSV
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        contenido = resp.read().decode("utf-8")

    # Parsear CSV
    lector = csv.reader(contenido.splitlines())
    filas = list(lector)
    print(f"   → {len(filas)} filas encontradas")

    # Saltear filas de encabezado (las que no tengan precio numérico en col D)
    filas_datos = []
    for f in filas:
        if len(f) > 3:
            precio_test = limpiar_precio(f[3])
            if precio_test > 0:
                filas_datos.append(f)

    print(f"   → {len(filas_datos)} productos con precio válido")

    # Construir array de productos
    prods = construir_prods(filas_datos)
    print(f"   → {len(prods)} productos procesados")

    # Mostrar rubros detectados
    rubros = sorted(set(p[1] for p in prods))
    print(f"   → Rubros: {rubros}")

    # Leer el index.html
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Reemplazar el array PRODS
    # Regex flexible: acepta espacios, saltos de línea, con o sin punto y coma al final
    nuevo_js = "const PRODS=" + prods_a_js(prods) + ";"

    # Intentar varios patrones por si el HTML tiene variaciones de formato
    patrones = [
        r"const\s+PRODS\s*=\s*\[.*?\]\s*;",   # con punto y coma
        r"const\s+PRODS\s*=\s*\[.*?\]",         # sin punto y coma
        r"var\s+PRODS\s*=\s*\[.*?\]\s*;",       # con var
        r"var\s+PRODS\s*=\s*\[.*?\]",            # con var sin punto y coma
    ]

    html_nuevo = html
    reemplazado = False
    for patron in patrones:
        resultado = re.sub(patron, nuevo_js, html_nuevo, flags=re.DOTALL)
        if resultado != html_nuevo:
            html_nuevo = resultado
            reemplazado = True
            print(f"   → Patrón encontrado y reemplazado")
            break

    if not reemplazado:
        # Debug: mostrar fragmento del HTML donde debería estar PRODS
        idx = html.find("PRODS")
        if idx >= 0:
            fragmento = html[max(0, idx-20):idx+100]
            print(f"⚠️  PRODS encontrado en el HTML pero no coincide el patrón.")
            print(f"   Fragmento: {repr(fragmento)}")
        else:
            print("⚠️  No se encontró 'PRODS' en el HTML. Verificá el archivo.")
        return

    # Guardar index.html actualizado
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_nuevo)

    print("✅ index.html actualizado correctamente!")

if __name__ == "__main__":
    main()
