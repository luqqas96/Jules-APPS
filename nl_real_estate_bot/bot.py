import os
import time
from datetime import datetime, timedelta
from .models import SessionLocal, PropertyListing, Preferences
from .scrapers.funda import FundaScraper
from .scrapers.pararius import ParariusScraper
from .scrapers.kamernet import KamernetScraper
from .telegram_notifier import send_telegram_message

bot_status = {
    "is_running": False,
    "last_check": None
}

def clean_old_listings(db, days=14):
    """Elimina listados más antiguos de 'days' días."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    deleted_count = db.query(PropertyListing).filter(PropertyListing.fecha_descubrimiento < cutoff_date).delete()
    db.commit()
    if deleted_count > 0:
        print(f"Limpieza de datos: Se eliminaron {deleted_count} listados antiguos.")

def run_check_cycle():
    global bot_status
    bot_status["is_running"] = True
    bot_status["last_check"] = datetime.now()
    print(f"[{datetime.now()}] Iniciando ciclo de verificación...")

    db = SessionLocal()
    try:
        prefs = db.query(Preferences).first()
        if not prefs:
            print("No se encontraron preferencias, abortando ciclo.")
            return

        scrapers = [
            FundaScraper(prefs),
            ParariusScraper(prefs),
            KamernetScraper(prefs)
        ]

        all_results = []
        for scraper in scrapers:
            print(f"Ejecutando scraper para {scraper.__class__.__name__}...")
            try:
                results = scraper.scrape()
                all_results.extend(results)
            except Exception as e:
                print(f"Error en {scraper.__class__.__name__}: {e}")

        nuevos_anuncios = 0
        for item in all_results:
            # Check if property already exists
            exists = db.query(PropertyListing).filter(
                (PropertyListing.id_plataforma == item["id_plataforma"]) |
                (PropertyListing.url == item["url"])
            ).first()

            if not exists:
                nueva_propiedad = PropertyListing(**item)
                db.add(nueva_propiedad)
                db.commit()
                nuevos_anuncios += 1

                # Send notification
                msg = f"<b>Nuevo Anuncio en {item['plataforma_origen']}</b>\n"
                msg += f"📍 {item['titulo']} ({item['ciudad']})\n"
                msg += f"💶 €{item['precio']}\n"
                msg += f"🛏 {item['habitaciones']} Habitaciones\n"
                msg += f"<a href='{item['url']}'>Ver Anuncio</a>"

                send_telegram_message(msg, item.get('foto_url'))

        print(f"Ciclo terminado. Se encontraron {nuevos_anuncios} propiedades nuevas.")

        # Run cleanup
        clean_old_listings(db, days=14)

    finally:
        db.close()
        bot_status["is_running"] = False
