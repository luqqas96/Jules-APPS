import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getSheets } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { prompt, chatHistory, currentMeals, currentTotals, macroGoals, profile } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Falta el prompt del usuario' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    // 1. Fetch user's Dictionary to provide context for personalized recommendations
    let dictionaryContext = "No history available.";
    try {
      const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
      if (spreadsheetId) {
        const sheets = await getSheets();
        const dictResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "'Dictionary'!A:B",
        });
        const dictRows = dictResponse.data.values || [];
        // Extract recent items (limit to 50 for context size)
        if (dictRows.length > 1) {
            const items = dictRows.slice(1).slice(-50).map(row => {
                try {
                    const parsed = JSON.parse(row[1]);
                    return `${row[0]}: ${parsed.name} (${parsed.baseMacros.calories}kcal per 100g)`;
                } catch {
                    return `${row[0]}: ${row[1]}`;
                }
            });
            dictionaryContext = items.join("\n");
        }
      }
    } catch (e) {
      console.error("Failed to fetch dictionary for AI context", e);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `You are a helpful nutrition and diet assistant.
The user is talking to you via a chat interface.
You must decide between TWO actions based on the user's latest prompt:
1. "modify_meals": The user is explicitly asking to add, remove, or modify a food entry in their current daily meals. If you choose this, you MUST provide the fully updated \`meals\` object (with all meals and entries) and a brief \`message\` confirming the action.
2. "chat": The user is asking a question, seeking advice, or asking for food recommendations. If you choose this, you ONLY provide a \`message\` responding to them in a friendly, conversational manner. You do not return the meals object.

CONTEXT INFORMATION:
User Profile: ${profile || "Unknown"}
Macro Goals: Calories: ${macroGoals.calories}, Protein: ${macroGoals.protein}g, Carbs: ${macroGoals.carbs}g, Fats: ${macroGoals.fats}g
Current Daily Consumption: Calories: ${Math.round(currentTotals.calories)}, Protein: ${Math.round(currentTotals.protein)}g, Carbs: ${Math.round(currentTotals.carbs)}g, Fats: ${Math.round(currentTotals.fats)}g
Remaining Calories: ${Math.round(macroGoals.calories - currentTotals.calories)}

User's Historically Consumed Foods (Google Sheets Dictionary):
${dictionaryContext}

Current Daily Meals JSON:
${JSON.stringify(currentMeals, null, 2)}

Chat History:
${JSON.stringify(chatHistory.slice(-5), null, 2)}

Instructions:
- If making a recommendation, USE their historical foods from the dictionary above to suggest things they actually eat.
- Keep "chat" messages concise (1-3 short paragraphs).
- If modifying meals, calculate the macros accurately based on their request. Use the "grams" to scale "baseMacros" if provided, or adjust "macros" directly.
- ALWAYS respond in the language the user speaks to you in (likely Spanish).`;

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

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["modify_meals", "chat"] },
            message: { type: Type.STRING, description: "The response message to the user." },
            meals: {
                type: Type.OBJECT,
                properties: {
                    Desayuno: { type: Type.ARRAY, items: entrySchema },
                    Almuerzo: { type: Type.ARRAY, items: entrySchema },
                    Merienda: { type: Type.ARRAY, items: entrySchema },
                    Cena: { type: Type.ARRAY, items: entrySchema },
                },
                description: "Only provide this if action is modify_meals."
            }
        },
        required: ["action", "message"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt + "\n\nUser Latest Prompt: " + prompt }
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

    try {
      const parsed = JSON.parse(resultText);

      // Server-side strict sanitization before sending to client
      if (parsed.action === "modify_meals" && parsed.meals) {
          const sanitizeEntries = (entries: any[]) => {
             if (!Array.isArray(entries)) return [];
             return entries.map(e => ({
                id: e.id || Math.random().toString(36).substring(2, 9),
                name: e.name || "Unknown Food",
                grams: e.grams || 100,
                timestamp: e.timestamp || Date.now(),
                macros: e.macros || { calories: 0, protein: 0, carbs: 0, fats: 0 },
                baseMacros: e.baseMacros || e.macros || { calories: 0, protein: 0, carbs: 0, fats: 0 }
             }));
          };

          parsed.meals = {
             Desayuno: sanitizeEntries(parsed.meals.Desayuno),
             Almuerzo: sanitizeEntries(parsed.meals.Almuerzo),
             Merienda: sanitizeEntries(parsed.meals.Merienda),
             Cena: sanitizeEntries(parsed.meals.Cena)
          };
      } else if (parsed.action === "modify_meals" && !parsed.meals) {
          // If action is modify_meals but no meals returned, fallback to chat
          parsed.action = "chat";
          parsed.message = parsed.message || "I couldn't modify the meals properly.";
      }

      return NextResponse.json(parsed);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", resultText);
      return NextResponse.json({ error: 'La IA devolvió un formato inválido.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in AI chat route:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to process AI chat' }, { status: 500 });
  }
}
