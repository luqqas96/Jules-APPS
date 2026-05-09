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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Dictionary'!A:B",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({ dictionary: {} });
    }

    const dictionary: Record<string, {name: string, baseMacros: Record<string, number>}[]> = {
      Breakfast: [],
      Lunch: [],
      Snack: [],
      Dinner: []
    };

    rows.slice(1).forEach(row => {
      const mealType = row[0];
      const productJson = row[1];
      if (mealType && productJson) {
         try {
           const parsed = JSON.parse(productJson);
           if (!dictionary[mealType]) dictionary[mealType] = [];
           dictionary[mealType].push(parsed);
         } catch(e) {
           // ignore bad json
         }
      }
    });

    // Sort alphabetically
    for (const meal in dictionary) {
       dictionary[meal].sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({ dictionary });
  } catch (error: unknown) {
    console.error('Error fetching dictionary:', error);
    return NextResponse.json({ error: 'Error leyendo diccionario' }, { status: 500 });
  }
}
