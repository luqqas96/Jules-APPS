import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60; // Evitar error 504 Gateway Timeout de Vercel para llamadas de IA con multimedia

export async function POST(request: Request) {
  try {
    const { prompt, chatHistory, currentMeals, currentTotals, macroGoals, profile, image, audio, todayDate } = await request.json();

    if (!prompt && !image && !audio) {
      return NextResponse.json({ error: 'Falta el prompt, imagen o audio del usuario' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Falta configuración de API Key de Gemini' }, { status: 500 });
    }

    const today = todayDate || new Date().toISOString().split("T")[0];
    const goals = macroGoals || { calories: 2000, protein: 150, carbs: 250, fats: 70 };
    const totals = currentTotals || { calories: 0, protein: 0, carbs: 0, fats: 0 };

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
The user is talking to you via a chat interface and may send text, photos of food (like a plate, omelette, etc.), or voice notes (audio).
You must decide between FOUR actions based on the user's latest prompt, image, or audio:
1. "propose_meal": The user wants to add or log a food entry, OR has sent a photo/voice recording of food they ate. You MUST NOT save it automatically. Instead, propose the meal by providing an array of \`proposed_foods\`, a detailed \`analysis_description\` (explaining what ingredients/macros you detected from the image/audio or text), and a conversational \`message\` asking them to confirm/approve the proposal.
2. "modify_meals": (Only use if user explicitly says they already approved via system command, otherwise ALWAYS prefer "propose_meal" for any new food addition).
3. "log_weight": The user is telling you their current weight (e.g., "Anota que peso 75kg", "Hoy peso 75.5"). You MUST extract the weight as a number and return it in the \`weight\` field, plus a confirming \`message\`.
4. "chat": The user is asking a general question, seeking advice, or asking for food recommendations without adding food right now. Provide a \`message\` responding to them in a friendly, conversational manner.

CONTEXT INFORMATION:
User Profile: ${profile || "Unknown"}
Today's Date: ${today}
Macro Goals: Calories: ${goals.calories}, Protein: ${goals.protein}g, Carbs: ${goals.carbs}g, Fats: ${goals.fats}g
Current Daily Consumption: Calories: ${Math.round(totals.calories || 0)}, Protein: ${Math.round(totals.protein || 0)}g, Carbs: ${Math.round(totals.carbs || 0)}g, Fats: ${Math.round(totals.fats || 0)}g
Remaining Calories: ${Math.round((goals.calories || 2000) - (totals.calories || 0))}

User's Historically Consumed Foods:
${dictionaryContext}

Current Daily Meals JSON:
${JSON.stringify(currentMeals, null, 2)}

Chat History:
${JSON.stringify((chatHistory || []).slice(-5), null, 2)}

Instructions:
- If making a recommendation, USE their historical foods from the dictionary above to suggest things they actually eat.
- Keep messages concise and clear.
- When action is "propose_meal", accurately calculate the macros (\`macros\` scaled to grams, plus \`baseMacros\` per 100g or unit base) for each proposed food item. Include \`analysis_description\` detailing why/how you estimated those numbers or what ingredients you identified in the photo/audio.
- CRITICAL REGISTER RULES: If the user asks to add, record, log, or drink any food/beverage (e.g., "agrega a la cena...", "anota una cerveza...", "cena de ayer...", "500ml de cerveza Guinness"), you MUST choose "propose_meal" and populate the "proposed_foods" array with the details. You MUST populate the 'proposed_foods' array with at least one food item detailing the name, grams, mealType, and calculated macros. NEVER return an empty 'proposed_foods' array. Do NOT choose "chat" and do NOT wait for confirmation.
- CRITICAL FOR DATES: If the user specifies that they ate or drank something on a different date (e.g., "ayer", "antier", "el 15 de julio", "el 2026-07-10"), calculate the exact target date (YYYY-MM-DD) relative to Today's Date (${today}) and return it in the \`target_date\` field. If no historical date is specified, use Today's Date (${today}).
- IMPORTANT: For \`mealType\`, strictly choose one of these exact values: "Desayuno", "Almuerzo", "Merienda", or "Cena". If ambiguous, infer based on current time or suggest "Cena"/"Almuerzo".
- ALWAYS respond in the language the user speaks or communicates to you in (likely Spanish).`;

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
            action: { type: Type.STRING, enum: ["propose_meal", "modify_meals", "chat", "fetch_history", "log_weight"] },
            message: { type: Type.STRING, description: "The response message to the user." },
            analysis_description: { type: Type.STRING, description: "Detailed breakdown of detected ingredients, weight estimation rationale, or analysis of the photo/audio." },
            weight: { type: Type.NUMBER, description: "The weight in kg. Only provide if action is log_weight." },
            target_date: { type: Type.STRING, description: "The calculated target date for the food log in YYYY-MM-DD format. Resolve relative dates ('ayer', 'hace 2 días') relative to today's date." },
            history_scope: { type: Type.STRING, enum: ["all", "specific_date"], description: "The scope of history to fetch. Only use if action is fetch_history." },
            history_date: { type: Type.STRING, description: "The specific date to fetch history for in YYYY-MM-DD format. Only use if action is fetch_history and scope is specific_date." },
            new_foods: {
                type: Type.ARRAY,
                items: newFoodSchema,
                description: "Array of food items to ADD directly. Only use if action is modify_meals."
            },
            proposed_foods: {
                type: Type.ARRAY,
                items: newFoodSchema,
                description: "Array of proposed food items for the user to verify and approve. Use when action is propose_meal."
            }
        },
        required: ["action", "message"]
    };

    const userParts: any[] = [];
    if (prompt) {
      userParts.push({ text: systemPrompt + "\n\nUser Latest Prompt: " + prompt });
    } else {
      userParts.push({ text: systemPrompt + "\n\nUser sent multimedia (image or audio) with no extra text prompt. Please analyze and respond or propose meal." });
    }

    if (image && image.data) {
      userParts.push({ inlineData: { data: image.data, mimeType: image.mimeType || 'image/jpeg' } });
    }
    if (audio && audio.data) {
      userParts.push({ inlineData: { data: audio.data, mimeType: audio.mimeType || 'audio/webm' } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: userParts
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

    let cleanText = resultText;
    try {
      // Evitar desbordamiento de coma flotante por exponentes exagerados (ej. e-25000)
      cleanText = cleanText.replace(/:\s*[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]{3,})/g, ": 0");
    } catch (e) {
      console.warn("Failed to sanitize regex", e);
    }

    try {
      const parsed = JSON.parse(cleanText);

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
              model: 'gemini-3.5-flash',
              contents: [
                  { role: 'user', parts: [{ text: systemPrompt + "\n\nUser Latest Prompt: " + prompt + "\n\nFETCHED HISTORY DATA (JSON):\n" + fetchedHistory + "\n\nPlease analyze this data and answer the user's question." }] }
              ],
              config: { responseMimeType: "application/json", responseSchema: responseSchema }
          });
          const secondParsed = JSON.parse(secondResponse.text || '{"action": "chat", "message": "Failed to analyze history."}');
          return NextResponse.json(secondParsed);
      }

      // Handle propose_meal or normalize modify_meals into propose_meal if desired, or keep both
      if (parsed.action === "propose_meal" || (parsed.action === "modify_meals" && parsed.proposed_foods)) {
          const foods = parsed.proposed_foods || parsed.new_foods || [];
          const normalizedFoods = foods.map((food: any) => {
             let targetMeal = food.mealType;
             const mLow = (targetMeal || "").toLowerCase();
             if (mLow.includes("break") || mLow.includes("desay")) targetMeal = "Desayuno";
             else if (mLow.includes("lunch") || mLow.includes("almuerz")) targetMeal = "Almuerzo";
             else if (mLow.includes("snack") || mLow.includes("meriend")) targetMeal = "Merienda";
             else if (mLow.includes("dinner") || mLow.includes("cena")) targetMeal = "Cena";
             else targetMeal = "Desayuno";

             return {
                 id: Math.random().toString(36).substring(2, 9),
                 mealType: targetMeal,
                 name: food.name || "Alimento Identificado",
                 grams: food.grams || 100,
                 macros: food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0, cholesterol: 0, sodium: 0, sugar: 0, calcium: 0 },
                 baseMacros: food.baseMacros || food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0, cholesterol: 0, sodium: 0, sugar: 0, calcium: 0 }
             };
          });
          parsed.action = "propose_meal";
          parsed.proposed_foods = normalizedFoods;
      } else if (parsed.action === "modify_meals" && parsed.new_foods && Array.isArray(parsed.new_foods)) {
          // If Gemini still returned modify_meals directly, normalize to propose_meal for safety when adding new food
          const foods = parsed.new_foods;
          const normalizedFoods = foods.map((food: any) => {
             let targetMeal = food.mealType;
             const mLow = (targetMeal || "").toLowerCase();
             if (mLow.includes("break") || mLow.includes("desay")) targetMeal = "Desayuno";
             else if (mLow.includes("lunch") || mLow.includes("almuerz")) targetMeal = "Almuerzo";
             else if (mLow.includes("snack") || mLow.includes("meriend")) targetMeal = "Merienda";
             else if (mLow.includes("dinner") || mLow.includes("cena")) targetMeal = "Cena";
             else targetMeal = "Desayuno";

             return {
                 id: Math.random().toString(36).substring(2, 9),
                 mealType: targetMeal,
                 name: food.name || "Alimento Identificado",
                 grams: food.grams || 100,
                 macros: food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0, cholesterol: 0, sodium: 0, sugar: 0, calcium: 0 },
                 baseMacros: food.baseMacros || food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0, cholesterol: 0, sodium: 0, sugar: 0, calcium: 0 }
             };
          });
          parsed.action = "propose_meal";
          parsed.proposed_foods = normalizedFoods;
          delete parsed.new_foods;
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
