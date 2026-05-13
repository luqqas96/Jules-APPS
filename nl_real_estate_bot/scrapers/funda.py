import time
import random
import re
from curl_cffi import requests
from bs4 import BeautifulSoup
from ..gemini_helper import calcular_distancia_estacion

class FundaScraper:
    def __init__(self, preferences):
        self.preferences = preferences
        self.base_url = "https://www.funda.nl"

    def build_url(self):
        ciudad = self.preferences.ciudad.lower().replace(" ", "-")
        precio_max = int(self.preferences.precio_maximo) if self.preferences.precio_maximo else ""
        url = f"{self.base_url}/zoeken/huur?selected_area=%22{ciudad}%22"
        if precio_max:
            url += f"&price=%220-{precio_max}%22"
        return url

    def scrape(self):
        resultados = []
        url = self.build_url()
        print(f"[Funda] Scraping URL: {url}")

        try:
            # impersonate Chrome to avoid Cloudflare/DataDome blocks
            response = requests.get(url, impersonate="chrome110", timeout=15)
            response.raise_for_status()
        except Exception as e:
            print(f"[Funda] Error al hacer request: {e}")
            return resultados

        soup = BeautifulSoup(response.text, 'html.parser')

        # Selectors in Funda can change frequently.
        # Typically they use data-test-id or specific classes for cards.
        cards = soup.select('div[data-test-id="search-result-item"]')

        for card in cards:
            try:
                # Extract URL
                a_tag = card.select_first('a[data-test-id="object-image-link"]')
                if not a_tag:
                    continue
                prop_url = a_tag['href']

                # Extract ID from URL or attributes
                # e.g., /huur/amsterdam/appartement-43632971-straatnaam/
                match_id = re.search(r'-(\d+)-', prop_url)
                id_plataforma = match_id.group(1) if match_id else prop_url.split('/')[-2]

                # Title / Address
                title_elem = card.select_first('h2[data-test-id="street-name-house-number"]')
                titulo = title_elem.text.strip() if title_elem else "Sin titulo"

                # Price
                price_elem = card.select_first('p[data-test-id="price-rent"]')
                precio_raw = price_elem.text.replace('€', '').replace('.', '').replace(',', '').strip() if price_elem else "0"
                precio_match = re.search(r'\d+', precio_raw)
                precio = float(precio_match.group(0)) if precio_match else 0.0

                # Check max price constraint locally just in case
                if self.preferences.precio_maximo and precio > self.preferences.precio_maximo:
                    continue

                # Rooms
                rooms_elem = card.select_first('li[data-test-id="features-room-count"]')
                habitaciones_raw = rooms_elem.text.strip() if rooms_elem else "0"
                hab_match = re.search(r'\d+', habitaciones_raw)
                habitaciones = int(hab_match.group(0)) if hab_match else 0

                if self.preferences.habitaciones_minimas and habitaciones < self.preferences.habitaciones_minimas:
                    continue

                # Photo
                img_tag = card.select_first('img')
                foto_url = img_tag['src'] if img_tag and 'src' in img_tag.attrs else ""

                # Check train distance
                distancia = calcular_distancia_estacion(titulo, self.preferences.ciudad)
                if self.preferences.distancia_tren_max_minutos and distancia > self.preferences.distancia_tren_max_minutos:
                    continue

                resultados.append({
                    "id_plataforma": f"funda_{id_plataforma}",
                    "titulo": titulo,
                    "precio": precio,
                    "ciudad": self.preferences.ciudad,
                    "habitaciones": habitaciones,
                    "url": prop_url if prop_url.startswith("http") else f"{self.base_url}{prop_url}",
                    "foto_url": foto_url,
                    "plataforma_origen": "Funda"
                })
            except Exception as e:
                print(f"[Funda] Error parseando tarjeta: {e}")
                continue

        time.sleep(random.uniform(2, 5))
        return resultados
