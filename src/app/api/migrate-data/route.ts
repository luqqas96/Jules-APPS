import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    const sheets = await getSheets();

    // 1. Food Logs (Normalized)
    console.log("Migrating Food Logs...");
    let foodInsertsCount = 0;
    try {
       const mealsRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Main'!A:N" });
       const mealRows = mealsRes.data.values || [];
       const foodInserts: any[] = [];
       
       mealRows.slice(1).forEach((row, index) => {
          const date = row[0];
          let mealType = row[1];
          const product = row[2];
          const amount = parseFloat(row[3]);
          const protein = parseFloat(row[4]) || 0;
          const carbs = parseFloat(row[5]) || 0;
          const fats = parseFloat(row[6]) || 0;
          const calories = parseFloat(row[7]) || 0;
          const profile = row[8] || "Lucas";
          const cholesterol = parseFloat(row[9]) || 0;
          const sodium = parseFloat(row[10]) || 0;
          const sugar = parseFloat(row[11]) || 0;
          const calcium = parseFloat(row[12]) || 0;
          const time = row[13] || "12:00";

          if (date && mealType && product) {
             const mLow = mealType.toLowerCase();
             if (mLow.includes("break") || mLow.includes("desay")) mealType = "Desayuno";
             else if (mLow.includes("lunch") || mLow.includes("almuerz")) mealType = "Almuerzo";
             else if (mLow.includes("snack") || mLow.includes("meriend")) mealType = "Merienda";
             else if (mLow.includes("dinner") || mLow.includes("cena")) mealType = "Cena";
             else mealType = "Merienda";

             foodInserts.push({
                 id: `${date}-${index}-${Math.random().toString(36).substring(2, 7)}`,
                 profile,
                 date,
                 time,
                 meal_type: mealType,
                 product_name: product,
                 amount,
                 protein,
                 carbs,
                 fats,
                 calories,
                 cholesterol,
                 sodium,
                 sugar,
                 calcium
             });
          }
       });

       if (foodInserts.length > 0) {
           // Delete old table contents to prevent duplicates if ran twice
           await supabase.from('food_logs').delete().neq('profile', 'dummy'); 
           for (let i = 0; i < foodInserts.length; i += 100) {
               await supabase.from('food_logs').insert(foodInserts.slice(i, i + 100));
           }
           foodInsertsCount = foodInserts.length;
       }
    } catch (e) { console.error("Error migrating food logs", e); }

    // 2. Weight Logs (Normalized)
    console.log("Migrating Weight Logs...");
    try {
       const weightRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Daily Weight'!A:C" });
       const weightRows = weightRes.data.values || [];
       const weightInserts: any[] = [];
       
       weightRows.slice(1).forEach(row => {
          const date = row[0];
          const weight = parseFloat(row[1]);
          const profile = row[2] || "Lucas";
          if (date && !isNaN(weight)) {
             weightInserts.push({ profile, date, weight });
          }
       });

       if (weightInserts.length > 0) {
           await supabase.from('weight_logs').delete().neq('profile', 'dummy');
           for (let i = 0; i < weightInserts.length; i += 100) {
               await supabase.from('weight_logs').upsert(weightInserts.slice(i, i + 100), { onConflict: 'profile,date' });
           }
       }
    } catch (e) { console.error("Error fetching weights", e); }

    // Also clear the old daily_data since it's obsolete now
    await supabase.from('daily_data').delete().neq('profile', 'dummy');

    return NextResponse.json({ success: true, message: `Normalización completada! Insertados ${foodInsertsCount} alimentos.` });
  } catch (error: unknown) {
    console.error('Error migrando datos:', error);
    return NextResponse.json({ error: 'Error durante migración' }, { status: 500 });
  }
}
