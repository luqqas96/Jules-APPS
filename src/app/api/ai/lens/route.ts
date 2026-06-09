import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const maxDuration = 60; // Allow more time for image processing

export async function POST(request: Request) {
  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `Eres un experto en nutrición y reconocimiento de alimentos. El usuario ha tomado una fotografía de un alimento o comida. 
Tu tarea es analizar la imagen y:
1. Identificar de qué comida se trata.
2. Estimar con la mayor precisión posible sus valores nutricionales por CADA 100 GRAMOS (o 100 ml).
Devuelve la respuesta ESTRICTAMENTE en formato JSON cumpliendo el esquema solicitado.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "El nombre detallado del producto o plato identificado en español." },
        macros: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            cholesterol: { type: Type.NUMBER },
            sodium: { type: Type.NUMBER },
            sugar: { type: Type.NUMBER },
            calcium: { type: Type.NUMBER },
          },
          required: ["calories", "protein", "carbs", "fats"]
        }
      },
      required: ["name", "macros"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const resultText = response.text;
    if (!resultText) {
       throw new Error("No response from Gemini");
    }

    const parsed = JSON.parse(resultText);

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error('Error in AI lens API:', error.message || error);
    return NextResponse.json({ error: 'Error al procesar la imagen con IA.' }, { status: 500 });
  }
}
