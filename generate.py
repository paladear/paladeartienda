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

CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2RlZaSdlV-aaVGUw7YI9MVE1MHjopNhbjTOfWBZwPNo_clhJUao2KNcNowEzsdBGpd2Bh5-2rt1aH/pub?output=csv"

# Rubros exactos del Sheet (en mayúsculas) → IDs del catálogo HTML
RUBRO_MAP = {
    "FRUTOS SECOS":             "frutos",
    "CEREALES":                 "cereales",
    "SEMILLAS":                 "semillas",
    "HARINAS":                  "harinas",
    "GRANOS Y LEGUMBRES":       "granos",
    "ESPECIAS":                 "especias",
    "DESHIDRATADOS":            "deshidratados",
    "DULCES, MIEL Y CHOCOLATES":"dulces",
    "INFUSIONES Y HIERBAS":     "infusiones",
    "SUPLEMENTOS":              "suplementos",
    "ACEITES Y VINAGRES":       "aceites",
    "AZUCAR, CACAO Y REPOSTERIA":"reposteria",
    "PRODUCTOS SIN TACC":       "sintacc",
    "SNACK":                    "snack",
    "LINEA GOURMET":            "gourmet",
    "BEBIDAS":                  "bebidas",
    "ENCURTIDOS":               "encurtidos",
    "ACEITUNAS":                "aceitunas",
    "PRODUCTOS DE FRIO":        "frio",
    "PRODUCTOS CONGELADOS":     "congelados",
    "VINOS":                    "vinos",
    "PALADEAR HOME":            "home",
    "TOMATE TRITURADO":         "tomate",
    "MANTECAS Y PASTAS":        "mantecas",
}

ICONO_MAP = {
    "frutos":"mix","cereales":"granola","semillas":"semillas_mix",
    "harinas":"harina","granos":"garbanzos","especias":"especias",
    "deshidratados":"datil","dulces":"miel","infusiones":"te_verde",
    "suplementos":"colageno","aceites":"aceite_oliva","reposteria":"cacao",
    "sintacc":"semillas_mix","snack":"barra","gourmet":"tahine",
    "bebidas":"kombucha","encurtidos":"pepinillos","aceitunas":"aceitunas",
    "frio":"yoghurt","congelados":"arandanos_cong","vinos":"vino",
    "home":"home","tomate":"especias","mantecas":"mantequilla_mani",
}

def limpiar_precio(valor):
    if not valor:
        return 0
    v = valor.strip().replace("$","").replace(" ","").replace("-","")
    if "," in v and "." in v:
        v = v.replace(".","").replace(",",".")
    elif "," in v:
        v = v.replace(",",".")
    else:
        v = v.replace(".","")
    try:
        return int(float(v))
    except:
        return 0

def detectar_opcion_y_unidad(nombre):
    n = nombre.upper()
    m = re.search(r'X\s*(\d+(?:[.,]\d+)?)\s*KG', n)
    if m:
        num = float(m.group(1).replace(",","."))
        opc = f"{int(num)} kg" if num == int(num) else f"{num} kg"
        return opc, "kg"
    m = re.search(r'X\s*(\d+)\s*G(?:R(?:S|AMOS?)?)?\b', n)
    if m:
        return f"{m.group(1)}g", "kg"
    m = re.search(r'X\s*(\d+)\s*(?:ML|CC)', n)
    if m:
        return f"{m.group(1)} ml", "und"
    m = re.search(r'X\s*(\d+(?:[.,]\d+)?)\s*(?:LT|LTS|L\b)', n)
    if m:
        return f"{m.group(1).replace(',','.')} L", "und"
    if "X KG" in n or "XKG" in n:
        return "1 kg", "kg"
    return "1 und", "und"

def construir_prods(filas):
    prods = []
    id_counter = 10000
    for fila in filas:
        # Columnas: A=0, B=1, C=2(nombre), D=3(lista1), E=4(lista2), F=5(rubro)
        if len(fila) < 4:
            continue
        nombre = fila[2].strip() if len(fila) > 2 else ""
        if not nombre:
            continue
        precio_min = limpiar_precio(fila[3]) if len(fila) > 3 else 0
        precio_may = limpiar_precio(fila[4]) if len(fila) > 4 else 0
        rubro_raw = fila[5].strip().upper() if len(fila) > 5 else ""
        rubro = RUBRO_MAP.get(rubro_raw, "gourmet")
        if precio_min == 0 and precio_may == 0:
            continue
        opcion, unidad = detectar_opcion_y_unidad(nombre)
        icono = ICONO_MAP.get(rubro, "semillas_mix")
        prods.append([
            id_counter, rubro, nombre, "Granel",
            unidad, False, icono,
            {opcion: [precio_min, precio_may]}
        ])
        id_counter += 1
    return prods

def prods_a_js(prods):
    items = []
    for p in prods:
        opts_str = json.dumps(p[7], ensure_ascii=False)
        item = '[{},\"{}\",{},{},\"{}\",{},\"{}\",{}]'.format(
            p[0], p[1],
            json.dumps(p[2], ensure_ascii=False),
            json.dumps(p[3], ensure_ascii=False),
            p[4], str(p[5]).lower(), p[6], opts_str
        )
        items.append(item)
    return "[" + ",".join(items) + "]"

def main():
    print("📥 Descargando datos del Google Sheet...")
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        contenido = resp.read().decode("utf-8")

    lector = csv.reader(contenido.splitlines())
    filas = list(lector)
    print(f"   → {len(filas)} filas encontradas")

    filas_datos = [f for f in filas if len(f) > 3 and limpiar_precio(f[3]) > 0]
    print(f"   → {len(filas_datos)} productos con precio válido")

    prods = construir_prods(filas_datos)
    print(f"   → {len(prods)} productos procesados")
    print(f"   → Rubros: {sorted(set(p[1] for p in prods))}")

    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Buscar PRODS usando contador de corchetes (método seguro)
    marker = "const PRODS="
    idx_inicio = html.find(marker)
    if idx_inicio == -1:
        print("⚠️  No se encontró 'const PRODS=' en el HTML.")
        return

    idx_corchete = html.find("[", idx_inicio)
    if idx_corchete == -1:
        print("⚠️  No se encontró '[' después de 'const PRODS='")
        return

    # Contar corchetes para encontrar el cierre correcto
    profundidad = 0
    idx_cierre = -1
    for i in range(idx_corchete, len(html)):
        if html[i] == '[':
            profundidad += 1
        elif html[i] == ']':
            profundidad -= 1
            if profundidad == 0:
                idx_cierre = i
                break

    if idx_cierre == -1:
        print("⚠️  No se encontró el cierre del array PRODS")
        return

    # Encontrar el ';' que sigue al cierre
    idx_fin = idx_cierre + 1
    while idx_fin < len(html) and html[idx_fin] in ' \t\n\r':
        idx_fin += 1
    if idx_fin < len(html) and html[idx_fin] == ';':
        idx_fin += 1

    # Reemplazar solo PRODS
    nuevo_array = prods_a_js(prods)
    html_nuevo = html[:idx_inicio] + "const PRODS=" + nuevo_array + ";" + html[idx_fin:]

    # Verificaciones de seguridad
    if "const CATS=" not in html_nuevo:
        print("⚠️  Error crítico: CATS desapareció. Abortando.")
        return
    if "const IMGS=" not in html_nuevo:
        print("⚠️  Error crítico: IMGS desapareció. Abortando.")
        return

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_nuevo)

    print("✅ index.html actualizado correctamente!")

if __name__ == "__main__":
    main()
