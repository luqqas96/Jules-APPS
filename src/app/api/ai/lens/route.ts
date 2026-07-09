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

    const systemPrompt = `Eres un experto en nutrición y reconocimiento visual de alimentos. El usuario ha tomado una fotografía de un plato de comida o etiqueta.
Tu tarea es analizar la imagen con máxima precisión y:
1. Identificar el nombre específico del plato o producto en español (\`name\`).
2. Estimar el peso total aproximado de la porción en el plato en gramos (\`estimatedGrams\`). Si no se puede determinar o es una etiqueta de producto, usa 100 como valor por defecto.
3. Proporcionar una explicación clara y concisa de los ingredientes detectados, por qué estimas ese peso y desglose (\`description\`).
4. Estimar sus valores nutricionales por CADA 100 GRAMOS o 100 ml (\`macros\`).
Devuelve la respuesta ESTRICTAMENTE en formato JSON cumpliendo el esquema solicitado.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "El nombre detallado del producto o plato identificado en español." },
        estimatedGrams: { type: Type.NUMBER, description: "Peso total estimado del plato o porción completa mostrada en gramos." },
        description: { type: Type.STRING, description: "Explicación breve de los ingredientes identificados en la foto y justificación del cálculo nutricional." },
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
      required: ["name", "estimatedGrams", "description", "macros"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
