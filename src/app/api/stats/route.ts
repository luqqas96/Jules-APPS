import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profile = searchParams.get('profile') || "Lucas"; // Default to Lucas

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    const sheets = await getSheets();

    // 1. Fetch Weight Data
    let weightData: any[] = [];
    try {
      const weightResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Daily Weight'!A:C", // Includes User column
      });
      const weightRows = weightResponse.data.values || [];
      // Format: Date | Weight | User
      weightData = weightRows
        .slice(1) // Skip header
        .filter(row => {
           const rowProfile = row[2] || "Lucas";
           return rowProfile === profile;
        })
        .map(row => ({ date: row[0], weight: parseFloat(row[1]) }))
        .filter(row => !isNaN(row.weight));
    } catch (e) {
      console.error("Error fetching weight data for stats", e);
    }

    // 2. Fetch Meals Data
    const macroData: Record<string, any> = {};
    try {
      const mealsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Main'!A:I", // Includes User column
      });
      const mealRows = mealsResponse.data.values || [];
      // Format: Fecha | Comida | Producto/Marca | Cantidad | Proteínas (g) | Carbohidratos (g) | Grasas (g) | Calorías (Kcal) | User

      mealRows.slice(1).forEach(row => {
        const date = row[0];
        const rowProfile = row[8] || "Lucas";

        if (!date || rowProfile !== profile) return;

        if (!macroData[date]) {
          macroData[date] = { date, calories: 0, protein: 0, carbs: 0, fats: 0 };
        }
        macroData[date].protein += parseFloat(row[4]) || 0;
        macroData[date].carbs += parseFloat(row[5]) || 0;
        macroData[date].fats += parseFloat(row[6]) || 0;
        macroData[date].calories += parseFloat(row[7]) || 0;
      });
    } catch (e) {
      console.error("Error fetching meals data for stats", e);
    }

    const aggregatedMacros = Object.values(macroData).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const sortedWeight = weightData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate advanced stats
    let advancedStats = null;
    if (aggregatedMacros.length > 0) {
      const cals = aggregatedMacros.map((m: any) => m.calories).filter((c: number) => c > 0);
      const prots = aggregatedMacros.map((m: any) => m.protein).filter((c: number) => c > 0);
      const carbo = aggregatedMacros.map((m: any) => m.carbs).filter((c: number) => c > 0);
      const fat = aggregatedMacros.map((m: any) => m.fats).filter((c: number) => c > 0);

      if (cals.length > 0) {
        // Calories Stats
        const sum = cals.reduce((a: number, b: number) => a + b, 0);
        const avgCals = Math.round(sum / cals.length);

        const sortedCals = [...cals].sort((a, b) => a - b);
        const mid = Math.floor(sortedCals.length / 2);
        const medianCals = sortedCals.length % 2 !== 0 ? sortedCals[mid] : Math.round((sortedCals[mid - 1] + sortedCals[mid]) / 2);

        const variance = cals.reduce((a: number, b: number) => a + Math.pow(b - avgCals, 2), 0) / cals.length;
        const stdDev = Math.round(Math.sqrt(variance));

        const minCals = sortedCals[0];
        const maxCals = sortedCals[sortedCals.length - 1];

        // Macro Stats Helper
        const calcMacroStats = (arr: number[]) => {
            if (arr.length === 0) return { avg: 0, median: 0, min: 0, max: 0 };
            const mSum = arr.reduce((a, b) => a + b, 0);
            const avg = Math.round(mSum / arr.length);
            const sorted = [...arr].sort((a, b) => a - b);
            const mMid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 !== 0 ? sorted[mMid] : Math.round((sorted[mMid - 1] + sorted[mMid]) / 2);
            return { avg, median, min: Math.round(sorted[0]), max: Math.round(sorted[sorted.length - 1]) };
        };

        const proteinStats = calcMacroStats(prots);
        const carbsStats = calcMacroStats(carbo);
        const fatsStats = calcMacroStats(fat);

        advancedStats = {
          avgCals,
          medianCals,
          stdDev,
          minCals,
          maxCals,
          protein: proteinStats,
          carbs: carbsStats,
          fats: fatsStats
        };
      }
    }

    // Send back combined data
    return NextResponse.json({ weight: sortedWeight, macros: aggregatedMacros, advancedStats });

  } catch (error: unknown) {
    console.error('Error fetching stats from Google Sheets:', error);
    return NextResponse.json({ error: 'Error leyendo estadísticas' }, { status: 500 });
  }
}
