import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
  }

  let productName = searchParams.get('name');

  try {
    if (!productName) {
      // Paso 1: Obtener el nombre del producto de UPCitemDB
      const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`;
      const upcRes = await fetch(upcUrl, { cache: 'no-store' });
      const upcData = await upcRes.json();

      if (!upcData.items || upcData.items.length === 0) {
        return NextResponse.json({ error: 'Producto no encontrado en la base de datos alternativa.' }, { status: 404 });
      }
      productName = upcData.items[0].title;
    }

    // Paso 2: Pedir a Gemini que estime los macros
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `Eres un experto en nutrición. El usuario ha escaneado un producto cuyo nombre es "${productName}". 
Debes estimar con la mayor precisión posible sus valores nutricionales por cada 100 gramos (o 100 ml).
Devuelve la respuesta ESTRICTAMENTE en formato JSON cumpliendo el esquema solicitado.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "El nombre del producto, preferiblemente traducido al español o mejorado para ser más legible." },
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
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt }
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
    console.error('Error in AI fallback barcode API:', error.message || error);
    return NextResponse.json({ error: 'Error al consultar la API alternativa.' }, { status: 500 });
  }
}
