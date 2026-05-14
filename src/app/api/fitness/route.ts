import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { date, category, exercise, reps, weight, profile } = await request.json();
    const activeProfile = profile || "Lucas";

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    if (!date || !category || !exercise || reps === undefined || weight === undefined) {
       return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const sheets = await getSheets();

    // 1. Ensure Fitness Progress sheet exists
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = spreadsheetInfo.data.sheets?.map(s => s.properties?.title) || [];

    if (!existingTitles.includes('Fitness Progress')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Fitness Progress' } } }]
        }
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "'Fitness Progress'!A1:F1",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Date', 'Category', 'Exercise', 'Reps', 'Weight', 'User']]
        }
      });
    }

    // Append to Fitness Progress
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'Fitness Progress'!A:F",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, category, exercise, reps, weight, activeProfile]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error saving fitness data:', error);
    return NextResponse.json({ error: 'Error guardando en Sheets' }, { status: 500 });
  }
}
