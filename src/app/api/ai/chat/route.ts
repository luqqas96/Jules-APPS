import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { prompt, chatHistory, currentMeals, currentTotals, macroGoals, profile } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Falta el prompt del usuario' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    // 1. Fetch user's Dictionary (food_history) from Supabase
    let dictionaryContext = "No history available.";
    try {
       const { data: dictRows, error } = await supabase
         .from('food_history')
         .select('name, base_macros')
         .eq('profile', profile || "Lucas")
         .order('updated_at', { ascending: false })
         .limit(50);

       if (!error && dictRows && dictRows.length > 0) {
           const items = dictRows.map(row => {
               const macros = row.base_macros as any;
               return `- ${row.name} (${macros.calories || 0}kcal per 100g)`;
           });
           dictionaryContext = items.join("\n");
       }
    } catch (e) {
      console.error("Failed to fetch dictionary for AI context", e);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `You are a helpful nutrition and diet assistant integrated globally in a tracking app.
The user is talking to you via a chat interface.
You must decide between THREE actions based on the user's latest prompt:
1. "modify_meals": The user is explicitly asking to add a food entry to their daily meals. Provide an array of \`new_foods\` to add, and a brief \`message\` confirming the action.
2. "log_weight": The user is telling you their current weight (e.g., "Anota que peso 75kg", "Hoy peso 75.5"). You MUST extract the weight as a number and return it in the \`weight\` field, plus a confirming \`message\`.
3. "chat": The user is asking a question, seeking advice, or asking for food recommendations. Provide a \`message\` responding to them in a friendly, conversational manner.

CONTEXT INFORMATION:
User Profile: ${profile || "Unknown"}
Macro Goals: Calories: ${macroGoals.calories}, Protein: ${macroGoals.protein}g, Carbs: ${macroGoals.carbs}g, Fats: ${macroGoals.fats}g
Current Daily Consumption: Calories: ${Math.round(currentTotals?.calories || 0)}, Protein: ${Math.round(currentTotals?.protein || 0)}g, Carbs: ${Math.round(currentTotals?.carbs || 0)}g, Fats: ${Math.round(currentTotals?.fats || 0)}g
Remaining Calories: ${Math.round(macroGoals.calories - (currentTotals?.calories || 0))}

User's Historically Consumed Foods:
${dictionaryContext}

Current Daily Meals JSON:
${JSON.stringify(currentMeals, null, 2)}

Chat History:
${JSON.stringify(chatHistory.slice(-5), null, 2)}

Instructions:
- If making a recommendation, USE their historical foods from the dictionary above to suggest things they actually eat.
- Keep "chat" messages concise (1-3 short paragraphs).
- If adding foods, calculate the macros accurately based on their request. Return the scaled \`macros\` and the \`baseMacros\` (per 100g or per unit base).
- CRITICAL: If the user asks to add or log a food by units (e.g., "agregue 2 oreos"), you MUST estimate the weight in grams (e.g. 1 oreo = 11g) and calculate the macros. YOU MUST choose "modify_meals".
- IMPORTANT: For \`mealType\`, you MUST strictly map the user's request to one of these exact values: "Desayuno", "Almuerzo", "Merienda", or "Cena".
- ALWAYS respond in the language the user speaks to you in (likely Spanish).`;

    const macroSchema: Schema = {
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
    };

    const newFoodSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        mealType: { type: Type.STRING, enum: ["Desayuno", "Almuerzo", "Merienda", "Cena"] },
        name: { type: Type.STRING },
        grams: { type: Type.NUMBER },
        macros: macroSchema,
        baseMacros: macroSchema,
      },
      required: ["mealType", "name", "grams", "macros", "baseMacros"]
    };

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ["modify_meals", "chat", "fetch_history", "log_weight"] },
            message: { type: Type.STRING, description: "The response message to the user." },
            weight: { type: Type.NUMBER, description: "The weight in kg. Only provide if action is log_weight." },
            history_scope: { type: Type.STRING, enum: ["all", "specific_date"], description: "The scope of history to fetch. Only use if action is fetch_history." },
            history_date: { type: Type.STRING, description: "The specific date to fetch history for in YYYY-MM-DD format. Only use if action is fetch_history and scope is specific_date." },
            new_foods: {
                type: Type.ARRAY,
                items: newFoodSchema,
                description: "Array of food items to ADD to the user's meals. Only provide this if action is modify_meals."
            }
        },
        required: ["action", "message"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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

      if (parsed.action === "fetch_history") {
          let fetchedHistory = "No history found.";
          try {
              let query = supabase.from('food_logs').select('*').eq('profile', profile || "Lucas").order('date', { ascending: false }).limit(200);
              
              if (parsed.history_scope === "specific_date" && parsed.history_date) {
                  query = supabase.from('food_logs').select('*').eq('profile', profile || "Lucas").eq('date', parsed.history_date);
              }
              
              const { data: foodRows, error: foodError } = await query;
              
              if (!foodError && foodRows && foodRows.length > 0) {
                  const flattened = foodRows.map(row => ({
                      Date: row.date,
                      Meal: row.meal_type,
                      Product: row.product_name,
                      Amount: row.amount,
                      Calories: row.calories,
                      Protein: row.protein
                  }));
                  fetchedHistory = JSON.stringify(flattened.slice(0, 100));
              }
          } catch (e) {
              console.error("Failed to fetch history from Supabase", e);
              fetchedHistory = "Error fetching history.";
          }

          const secondResponse = await ai.models.generateContent({
              model: 'gemini-1.5-flash',
              contents: [
                  { role: 'user', parts: [{ text: systemPrompt + "\n\nUser Latest Prompt: " + prompt + "\n\nFETCHED HISTORY DATA (JSON):\n" + fetchedHistory + "\n\nPlease analyze this data and answer the user's question." }] }
              ],
              config: { responseMimeType: "application/json", responseSchema: responseSchema }
          });
          const secondParsed = JSON.parse(secondResponse.text || '{"action": "chat", "message": "Failed to analyze history."}');
          return NextResponse.json(secondParsed);
      }

      if (parsed.action === "modify_meals" && parsed.new_foods && Array.isArray(parsed.new_foods)) {
          const updatedMeals = JSON.parse(JSON.stringify(currentMeals || {})); // Deep copy

          parsed.new_foods.forEach((food: any) => {
             let targetMeal = food.mealType;
             const mLow = targetMeal.toLowerCase();
             if (mLow.includes("break") || mLow.includes("desay")) targetMeal = "Desayuno";
             else if (mLow.includes("lunch") || mLow.includes("almuerz")) targetMeal = "Almuerzo";
             else if (mLow.includes("snack") || mLow.includes("meriend")) targetMeal = "Merienda";
             else if (mLow.includes("dinner") || mLow.includes("cena")) targetMeal = "Cena";
             else targetMeal = "Merienda";

             if (!updatedMeals[targetMeal]) updatedMeals[targetMeal] = [];

             if (updatedMeals[targetMeal]) {
                updatedMeals[targetMeal].push({
                   id: Math.random().toString(36).substring(2, 9),
                   name: food.name || "Unknown Food",
                   grams: food.grams || 100,
                   timestamp: Date.now(),
                   macros: food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0, cholesterol: 0, sodium: 0, sugar: 0, calcium: 0 },
                   baseMacros: food.baseMacros || food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0, cholesterol: 0, sodium: 0, sugar: 0, calcium: 0 }
                });
             }
          });

          parsed.meals = updatedMeals;
          delete parsed.new_foods; 
      } else if (parsed.action === "modify_meals") {
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
