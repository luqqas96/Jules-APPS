import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { date, meals, totals } = await request.json();

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    const sheets = await getSheets();

    // Ensure sheets "Entradas" and "Resumen" exist by making requests if needed,
    // but for simplicity we assume the user created "Resumen" sheet.
    // Format: Fecha, Calorias Totales, Proteinas Totales, Carbohidratos Totales, Grasas Totales, Detalles...

    // Create a summarized detail string
    let details = '';
    for (const [mealName, entries] of Object.entries(meals)) {
      if ((entries as any[]).length > 0) {
        details += `${mealName.toUpperCase()}: `;
        details += (entries as any[]).map((e: any) => `${e.name} (${e.macros.calories}kcal)`).join(", ");
        details += " | ";
      }
    }

    const row = [
      date,
      totals.calories,
      totals.protein,
      totals.carbs,
      totals.fats,
      details
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Resumen!A:F', // Assumes a sheet named "Resumen"
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving to Google Sheets:', error);
    return NextResponse.json({ error: error.message || 'Error guardando en Sheets' }, { status: 500 });
  }
}