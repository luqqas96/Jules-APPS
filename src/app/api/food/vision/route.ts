import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Requires GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    const prompt = `Analiza esta imagen de comida.
Identifica qué comida es y estima sus valores nutricionales totales en la porción que se muestra.
Responde ÚNICAMENTE en formato JSON estricto con esta estructura, sin bloques de código Markdown, sin texto adicional:
{
  "name": "Nombre de la comida",
  "macros": {
    "calories": numero_entero,
    "protein": numero_entero,
    "carbs": numero_entero,
    "fats": numero_entero
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: file.type,
              }
            }
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
      return NextResponse.json({ error: 'La IA no pudo determinar los macros con seguridad.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}