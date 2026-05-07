import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { date, meals, weight } = await request.json();


    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    const sheets = await getSheets();

    // 1. Ensure required sheets exist
    const requiredSheets = ['Principal', 'Peso Diario', 'Estadisticas'];
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = spreadsheetInfo.data.sheets?.map(s => s.properties?.title) || [];

    const missingSheets = requiredSheets.filter(title => !existingTitles.includes(title));
    if (missingSheets.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missingSheets.map(title => ({
            addSheet: { properties: { title } }
          }))
        }
      });

      // Optionally add headers to Principal if we just created it
      if (missingSheets.includes('Principal')) {
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Principal!A1:H1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Fecha', 'Comida', 'Producto/Marca', 'Cantidad', 'Proteínas (g)', 'Carbohidratos (g)', 'Grasas (g)', 'Calorías (Kcal)']]
            }
         });
      }
      if (missingSheets.includes('Peso Diario')) {
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "'Peso Diario'!A1:B1",
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Fecha', 'Peso (kg)']]
            }
         });
      }
    }

    // 2. Format rows according to new layout
    // Format: Fecha | Comida | Producto/Marca | Cantidad | Proteínas (g) | Carbohidratos (g) | Grasas (g) | Calorías (Kcal)
    const rows: (string | number)[][] = [];

    for (const [mealName, entries] of Object.entries(meals)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entries as any[]).forEach((entry: any) => {
         // Extract "150g" or "100g" from name if possible, otherwise just use entry.grams
         // In our implementation, we add grams like "My Food (150g)"
         // Actually, entry.grams is stored in the object directly.
         const cleanName = entry.name.replace(/\s*\(\d+g\)$/, '');
         const cantidad = entry.grams ? `${entry.grams}g` : '1 porción';

         rows.push([
           date,
           mealName,
           cleanName,
           cantidad,
           entry.macros.protein,
           entry.macros.carbs,
           entry.macros.fats,
           entry.macros.calories
         ]);
      });
    }

    // If there's an AI adjustment or something, we could add it, but currently the AI directly modifies the entries.
    // So all items are already represented in 'meals'.

    if (rows.length === 0 && !weight) {
       return NextResponse.json({ error: 'No hay datos para guardar' }, { status: 400 });
    }

    if (rows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Principal!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      });
    }


    if (weight) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Peso Diario'!A:B",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[date, weight]],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error saving to Google Sheets:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") || 'Error guardando en Sheets' }, { status: 500 });
  }
}