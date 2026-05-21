from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

Base = declarative_base()

class PropertyListing(Base):
    __tablename__ = 'property_listings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_plataforma = Column(String, unique=True, index=True) # ID from Funda/Pararius/etc
    titulo = Column(String)
    precio = Column(Float)
    ciudad = Column(String)
    habitaciones = Column(Integer)
    url = Column(String, unique=True)
    foto_url = Column(String)
    plataforma_origen = Column(String) # Funda, Pararius, Kamernet
    fecha_descubrimiento = Column(DateTime, default=datetime.utcnow)

class Preferences(Base):
    __tablename__ = 'preferences'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ciudad = Column(String)
    precio_maximo = Column(Float)
    habitaciones_minimas = Column(Integer)
    distancia_tren_max_minutos = Column(Integer)
    interior = Column(String) # furnished, unfurnished, etc.
    min_metros_cuadrados = Column(Integer)

# Setup Database
DATABASE_URL = "sqlite:///./real_estate.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

    # Check if preferences exist, if not create default
    db = SessionLocal()
    if not db.query(Preferences).first():
        default_pref = Preferences(
            ciudad="Amsterdam",
            precio_maximo=1500,
            habitaciones_minimas=1,
            distancia_tren_max_minutos=15,
            interior="",
            min_metros_cuadrados=0
        )
        db.add(default_pref)
        db.commit()
    db.close()
