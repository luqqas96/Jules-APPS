import time
import random
import re
from curl_cffi import requests
from bs4 import BeautifulSoup
from ..gemini_helper import calcular_distancia_estacion

class KamernetScraper:
    def __init__(self, preferences):
        self.preferences = preferences
        self.base_url = "https://kamernet.nl"

    def build_url(self):
        ciudad = self.preferences.ciudad.lower().replace(" ", "-")
        # Kamernet uses a slightly different URL structure, often /en/rent/room-amsterdam
        # Since it searches for rooms/studios/apartments, we use a generic search
        url = f"{self.base_url}/en/rent/rentals-{ciudad}"
        return url

    def scrape(self):
        resultados = []
        url = self.build_url()
        print(f"[Kamernet] Scraping URL: {url}")

        try:
            # Impersonate Chrome
            response = requests.get(url, impersonate="chrome110", timeout=15)
            response.raise_for_status()
        except Exception as e:
            print(f"[Kamernet] Error al hacer request: {e}")
            return resultados

        soup = BeautifulSoup(response.text, 'html.parser')

        # Kamernet generic selectors (might need adjustment as site changes)
        cards = soup.select('a.room-tile')

        for card in cards:
            try:
                prop_url = card['href'] if 'href' in card.attrs else ""
                if not prop_url:
                    continue

                # Extract ID from URL
                # e.g. /en/rent/room-amsterdam/streetname/room-id
                id_plataforma = prop_url.split('-')[-1]

                # Title
                title_elem = card.select_first('.tile-title')
                titulo = title_elem.text.strip() if title_elem else "Sin titulo"

                # Price
                price_elem = card.select_first('.tile-price')
                precio_raw = price_elem.text.replace('€', '').replace('.', '').replace(',', '').strip() if price_elem else "0"
                precio_match = re.search(r'\d+', precio_raw)
                precio = float(precio_match.group(0)) if precio_match else 0.0

                if self.preferences.precio_maximo and precio > self.preferences.precio_maximo:
                    continue

                # Rooms/Surface (Kamernet often focuses on surface area for rooms)
                # We will mock rooms to 1 if it's a room, or try to extract
                surface_elem = card.select_first('.tile-surface')
                habitaciones = 1 # Default for kamernet is usually 1 room (student rooms)

                # Photo
                img_tag = card.select_first('img')
                foto_url = img_tag['src'] if img_tag and 'src' in img_tag.attrs else ""

                # Check train distance
                distancia = calcular_distancia_estacion(titulo, self.preferences.ciudad)
                if self.preferences.distancia_tren_max_minutos and distancia > self.preferences.distancia_tren_max_minutos:
                    continue

                resultados.append({
                    "id_plataforma": f"kamernet_{id_plataforma}",
                    "titulo": titulo,
                    "precio": precio,
                    "ciudad": self.preferences.ciudad,
                    "habitaciones": habitaciones,
                    "url": f"{self.base_url}{prop_url}" if prop_url.startswith("/") else prop_url,
                    "foto_url": foto_url,
                    "plataforma_origen": "Kamernet"
                })
            except Exception as e:
                print(f"[Kamernet] Error parseando tarjeta: {e}")
                continue

        time.sleep(random.uniform(2, 5))
        return resultados
