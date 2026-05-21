import time
import random
import re
from curl_cffi import requests
from bs4 import BeautifulSoup
from ..gemini_helper import calcular_distancia_estacion

class ParariusScraper:
    def __init__(self, preferences):
        self.preferences = preferences
        self.base_url = "https://www.pararius.com"

    def build_url(self):
        ciudad = self.preferences.ciudad.lower().replace(" ", "-")
        url = f"{self.base_url}/apartments/{ciudad}"
        filters = []
        if self.preferences.precio_maximo:
            filters.append(f"0-{int(self.preferences.precio_maximo)}")
        if self.preferences.habitaciones_minimas:
            filters.append(f"{self.preferences.habitaciones_minimas}-rooms")

        if filters:
            url += "/" + "/".join(filters)

        return url

    def scrape(self):
        resultados = []
        url = self.build_url()
        print(f"[Pararius] Scraping URL: {url}")

        try:
            # impersonate Chrome to avoid Cloudflare
            response = requests.get(url, impersonate="chrome110", timeout=15)
            response.raise_for_status()
        except Exception as e:
            print(f"[Pararius] Error al hacer request: {e}")
            return resultados

        soup = BeautifulSoup(response.text, 'html.parser')

        # Pararius specific selectors
        cards = soup.select('section.listing-search-item')

        for card in cards:
            try:
                # URL and Title
                title_link = card.select_first('a.listing-search-item__link--title')
                if not title_link:
                    continue
                prop_url = title_link['href']
                titulo = title_link.text.strip()

                # ID
                id_match = re.search(r'pr(\d+)', prop_url)
                id_plataforma = id_match.group(1) if id_match else prop_url.split('/')[-1]

                # Price
                price_elem = card.select_first('div.listing-search-item__price')
                precio_raw = price_elem.text.replace('€', '').replace('.', '').replace(',', '').strip() if price_elem else "0"
                precio_match = re.search(r'\d+', precio_raw)
                precio = float(precio_match.group(0)) if precio_match else 0.0

                # Rooms
                rooms_elem = card.select_first('li.listing-features__info--number-of-rooms')
                habitaciones_raw = rooms_elem.text.strip() if rooms_elem else "0"
                hab_match = re.search(r'\d+', habitaciones_raw)
                habitaciones = int(hab_match.group(0)) if hab_match else 0

                # Photo
                img_tag = card.select_first('picture.listing-search-item__media-picture img')
                foto_url = img_tag['src'] if img_tag and 'src' in img_tag.attrs else ""

                # Check train distance
                distancia = calcular_distancia_estacion(titulo, self.preferences.ciudad)
                if self.preferences.distancia_tren_max_minutos and distancia > self.preferences.distancia_tren_max_minutos:
                    continue

                resultados.append({
                    "id_plataforma": f"pararius_{id_plataforma}",
                    "titulo": titulo,
                    "precio": precio,
                    "ciudad": self.preferences.ciudad,
                    "habitaciones": habitaciones,
                    "url": f"{self.base_url}{prop_url}" if prop_url.startswith("/") else prop_url,
                    "foto_url": foto_url,
                    "plataforma_origen": "Pararius"
                })
            except Exception as e:
                print(f"[Pararius] Error parseando tarjeta: {e}")
                continue

        time.sleep(random.uniform(2, 5))
        return resultados
