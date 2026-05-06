import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function POST(request: Request) {
  try {
    const { prompt, currentMeals } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Falta el prompt del usuario' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    const systemPrompt = `Eres un asistente de nutrición integrado en una aplicación de control de alimentos.
Recibirás un objeto JSON llamado "currentMeals" que representa lo que el usuario ha comido hoy, categorizado por "Desayuno", "Almuerzo", "Merienda" y "Cena".
También recibirás una instrucción del usuario (prompt) donde te pedirá modificar algo. Por ejemplo: "El mantecol del almuerzo solo comí la mitad (55g de los 111g)", o "Agrega 2 huevos a la cena", o "Borra el café de la merienda".

Tu trabajo es:
1. Analizar la instrucción.
2. Hacer los cálculos matemáticos necesarios. Si el usuario dice que comió la mitad de un producto que ya está registrado, debes dividir sus macros a la mitad y actualizar el nombre para reflejar la nueva porción.
3. Si te piden agregar algo nuevo y no tienes los datos, estima los macros lo mejor posible.
4. Devolver ÚNICAMENTE el nuevo objeto JSON completo de "meals" modificado.

IMPORTANTE: El JSON debe seguir EXACTAMENTE esta estructura, sin texto adicional ni bloques de código markdown:
{
  "Desayuno": [ { "id": "string", "name": "string", "macros": { "calories": number, "protein": number, "carbs": number, "fats": number }, "timestamp": number } ],
  "Almuerzo": [ ... ],
  "Merienda": [ ... ],
  "Cena": [ ... ]
}

Mantén los IDs y timestamps de los alimentos que no han sido modificados o eliminados. Para los alimentos nuevos, inventa un ID corto y un timestamp actual.`;

    const userMessage = `currentMeals: ${JSON.stringify(currentMeals)}
Instrucción del usuario: ${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
  } catch (error) {
    console.error('Error modifying meals with Gemini:', error);
    return NextResponse.json({ error: 'Failed to process AI modification' }, { status: 500 });
  }
}