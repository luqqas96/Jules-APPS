import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Busca en tu base de datos información nutricional sobre el producto o alimento: "${query}".
Devuelve una lista de 3 a 5 opciones que mejor coincidan con esta búsqueda (diferentes marcas, variantes o tipos genéricos si no encuentras la marca exacta).
Para CADA opción, proporciona los valores nutricionales SIEMPRE calculados para una porción estándar de 100 gramos.
Responde estrictamente en el formato JSON indicado.`;

    const macroSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fats: { type: Type.NUMBER },
      },
      required: ["calories", "protein", "carbs", "fats"]
    };

    const itemSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        macros: macroSchema
      },
      required: ["name", "macros"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: itemSchema,
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    const parsed = JSON.parse(resultText);
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error('Error fetching food data from Gemini:', error.message || error);
    return NextResponse.json({ error: 'Error al buscar el producto' }, { status: 500 });
  }
}