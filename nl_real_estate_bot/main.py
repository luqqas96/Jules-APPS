from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from contextlib import asynccontextmanager

from .models import init_db, SessionLocal, PropertyListing, Preferences
from .bot import run_check_cycle, bot_status

templates = Jinja2Templates(directory="nl_real_estate_bot/templates")
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    # Start the scheduler
    # Correr cada 30 minutos
    scheduler.add_job(
        run_check_cycle,
        trigger=IntervalTrigger(minutes=30),
        id="real_estate_scraper",
        name="Scrape real estate sites every 30 minutes",
        replace_existing=True,
    )
    scheduler.start()
    print("Scheduler started. Running jobs every 30 mins.")

    yield
    # Shutdown
    scheduler.shutdown()

app = FastAPI(title="NL Real Estate Bot", lifespan=lifespan)

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    db = SessionLocal()
    try:
        preferences = db.query(Preferences).first()
        properties = db.query(PropertyListing).order_by(PropertyListing.fecha_descubrimiento.desc()).limit(50).all()
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "preferences": preferences,
                "properties": properties,
                "bot_status": bot_status
            }
        )
    finally:
        db.close()

@app.post("/update_preferences")
async def update_preferences(
    ciudad: str = Form(...),
    precio_maximo: float = Form(...),
    habitaciones_minimas: int = Form(...),
    distancia_tren_max_minutos: int = Form(0),
):
    db = SessionLocal()
    try:
        pref = db.query(Preferences).first()
        if pref:
            pref.ciudad = ciudad
            pref.precio_maximo = precio_maximo
            pref.habitaciones_minimas = habitaciones_minimas
            pref.distancia_tren_max_minutos = distancia_tren_max_minutos
            db.commit()
    finally:
        db.close()
    return RedirectResponse(url="/", status_code=303)

@app.post("/trigger_bot")
async def trigger_bot(background_tasks: BackgroundTasks):
    """Permite forzar la ejecución manual desde el dashboard"""
    if not bot_status["is_running"]:
        background_tasks.add_task(run_check_cycle)
    return RedirectResponse(url="/", status_code=303)

# To run it:
# cd ..
# uvicorn nl_real_estate_bot.main:app --reload
