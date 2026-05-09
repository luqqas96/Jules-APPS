import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    const sheets = await getSheets();

    // 1. Fetch Weight Data
    let weightData: {date: string, weight: number}[] = [];
    try {
      const weightResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Daily Weight'!A:B",
      });
      const weightRows = weightResponse.data.values || [];
      // Format: Date | Weight
      weightData = weightRows
        .slice(1) // Skip header
        .map(row => ({ date: row[0], weight: parseFloat(row[1]) }))
        .filter(row => !isNaN(row.weight));
    } catch (_e) {
      console.error("Error fetching weight data for stats", _e);
    }

    // 2. Fetch Meals Data
    const macroData: Record<string, { date: string; calories: number; protein: number; carbs: number; fats: number; }> = {};
    try {
      const mealsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Main'!A:H",
      });
      const mealRows = mealsResponse.data.values || [];
      // Format: Fecha | Comida | Producto/Marca | Cantidad | Proteínas (g) | Carbohidratos (g) | Grasas (g) | Calorías (Kcal)

      mealRows.slice(1).forEach(row => {
        const date = row[0];
        if (!date) return;
        if (!macroData[date]) {
          macroData[date] = { date, calories: 0, protein: 0, carbs: 0, fats: 0 };
        }
        macroData[date]!.protein += parseFloat(row[4]) || 0;
        macroData[date]!.carbs += parseFloat(row[5]) || 0;
        macroData[date]!.fats += parseFloat(row[6]) || 0;
        macroData[date]!.calories += parseFloat(row[7]) || 0;
      });
    } catch (_e) {
      console.error("Error fetching meals data for stats", _e);
    }

    const aggregatedMacros = Object.values(macroData).sort((a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const sortedWeight = weightData.sort((a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate advanced stats
    let advancedStats = null;
    if (aggregatedMacros.length > 0) {
      const cals = aggregatedMacros.map((m: { calories: number }) => m.calories).filter((c: number) => c > 0);
      if (cals.length > 0) {
        const sum = cals.reduce((a: number, b: number) => a + b, 0);
        const avgCals = Math.round(sum / cals.length);

        const sortedCals = [...cals].sort((a, b) => a - b);
        const mid = Math.floor(sortedCals.length / 2);
        const medianCals = sortedCals.length % 2 !== 0 ? sortedCals[mid] : Math.round((sortedCals[mid - 1] + sortedCals[mid]) / 2);

        const variance = cals.reduce((a: number, b: number) => a + Math.pow(b - avgCals, 2), 0) / cals.length;
        const stdDev = Math.round(Math.sqrt(variance));

        const minCals = sortedCals[0];
        const maxCals = sortedCals[sortedCals.length - 1];

        advancedStats = {
          avgCals,
          medianCals,
          stdDev,
          minCals,
          maxCals
        };
      }
    }

    // Send back combined data
    // We'll limit to last 30 days on the frontend or backend. Doing it frontend is more flexible.
    return NextResponse.json({ weight: sortedWeight, macros: aggregatedMacros, advancedStats });

  } catch (_error: unknown) {
    console.error('Error fetching stats from Google Sheets:', _error);
    return NextResponse.json({ error: 'Error leyendo estadísticas' }, { status: 500 });
  }
}
