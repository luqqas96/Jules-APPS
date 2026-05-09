import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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
        range: "'Daily Weight'!A:B",
      });
      const weightRows = weightResponse.data.values || [];
      // Format: Date | Weight
      weightData = weightRows
        .slice(1) // Skip header
        .map(row => ({ date: row[0], weight: parseFloat(row[1]) }))
        .filter(row => !isNaN(row.weight));
    } catch (e) {
      console.error("Error fetching weight data for stats", e);
    }

    // 2. Fetch Meals Data
    let macroData: Record<string, any> = {};
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

    // Send back combined data
    // We'll limit to last 30 days on the frontend or backend. Doing it frontend is more flexible.
    return NextResponse.json({ weight: sortedWeight, macros: aggregatedMacros });

  } catch (error: unknown) {
    console.error('Error fetching stats from Google Sheets:', error);
    return NextResponse.json({ error: 'Error leyendo estadísticas' }, { status: 500 });
  }
}
