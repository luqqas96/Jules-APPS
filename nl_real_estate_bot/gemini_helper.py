import os
import json
from google import genai
from google.genai import types

def calcular_distancia_estacion(direccion: str, ciudad: str) -> int:
    """
    Usa la API de Gemini (modelo flash-lite) para estimar el tiempo en minutos
    desde una dirección hasta la estación central de trenes más cercana.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY no configurada. Asumiendo distancia 0.")
        return 0

    client = genai.Client(api_key=api_key)

    prompt = f"""
    Eres un asistente experto en el transporte público de Países Bajos (NS, GVB, etc.).
    Calcula o estima el tiempo de viaje en transporte público (tren/tram/bus) desde la siguiente dirección hasta la estación de tren principal (Centraal Station) más cercana en la ciudad de {ciudad}.
    Dirección: {direccion}

    Responde ÚNICAMENTE con un número entero que represente el tiempo estimado en minutos. Si no puedes calcularlo, responde con 999.
    Ejemplo de respuesta válida: 12
    """
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt,
        )
        texto = response.text.strip()
        minutos = int(''.join(filter(str.isdigit, texto)))
        return minutos
    except Exception as e:
        print(f"Error calculando distancia con Gemini para {direccion}: {e}")
        return 999 # Default to very high if error
