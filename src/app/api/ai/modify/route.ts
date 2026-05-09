import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { prompt, currentMeals } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Falta el prompt del usuario' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `Eres un asistente de nutrición.
Recibes un objeto JSON "currentMeals" y una instrucción del usuario.
Debes hacer los cálculos matemáticos solicitados (ej. si el usuario comió la mitad de la porción registrada, divide los macros a la mitad), agregar/quitar alimentos según se pida, y devolver TODOS los datos (modificados e intactos).`;

    const userMessage = `currentMeals: ${JSON.stringify(currentMeals)}
Instrucción del usuario: ${prompt}`;

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

    const entrySchema: Schema = {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        grams: { type: Type.NUMBER },
        macros: macroSchema,
        baseMacros: macroSchema,
        timestamp: { type: Type.NUMBER }
      },
      required: ["id", "name", "macros", "timestamp"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt + "\n\n" + userMessage }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            Desayuno: { type: Type.ARRAY, items: entrySchema },
            Almuerzo: { type: Type.ARRAY, items: entrySchema },
            Merienda: { type: Type.ARRAY, items: entrySchema },
            Cena: { type: Type.ARRAY, items: entrySchema },
          },
          required: ["Desayuno", "Almuerzo", "Merienda", "Cena"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
       throw new Error("No response from Gemini");
    }

    try {
      const parsed = JSON.parse(resultText);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", resultText);
      return NextResponse.json({ error: 'La IA devolvió un formato inválido.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error modifying meals with Gemini:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to process AI modification' }, { status: 500 });
  }
}