/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { date, meals, weight, profile } = await request.json();
    const activeProfile = profile || "Lucas"; // Default to Lucas for backwards compatibility


    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    const sheets = await getSheets();

    // 1. Ensure required sheets exist
    const requiredSheets = ['Main', 'Daily Weight', 'Statistics', 'Dictionary'];
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

      // 1.1 Batch add headers to newly created sheets
      const data = [];
      if (missingSheets.includes('Main')) {
        data.push({
          range: "'Main'!A1:I1",
          values: [['Date', 'Meal', 'Product/Brand', 'Amount', 'Protein (g)', 'Carbs (g)', 'Fats (g)', 'Calories (Kcal)', 'User']]
        });
      }
      if (missingSheets.includes('Dictionary')) {
        data.push({
          range: "'Dictionary'!A1:B1",
          values: [['Meal', 'Product (JSON)']]
        });
      }
      if (missingSheets.includes('Daily Weight')) {
        data.push({
          range: "'Daily Weight'!A1:C1",
          values: [['Date', 'Weight (kg)', 'User']]
        });
      }

      if (data.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data
          }
        });
      }
    }

    // 1.2 Batch check if headers need updating for existing sheets to add User column
    const sheetsToCheck = [];
    if (!missingSheets.includes('Main')) sheetsToCheck.push("'Main'!A1:I1");
    if (!missingSheets.includes('Daily Weight')) sheetsToCheck.push("'Daily Weight'!A1:C1");

    if (sheetsToCheck.length > 0) {
      const headerRes = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: sheetsToCheck
      });

      const updateData = [];

      // Check Main headers
      if (!missingSheets.includes('Main')) {
        const mainHeaders = headerRes.data.valueRanges?.find(vr => vr.range?.includes('Main'))?.values?.[0] || [];
        if (!mainHeaders.includes('User')) {
          const colLetter = String.fromCharCode(65 + mainHeaders.length);
          updateData.push({
            range: `'Main'!${colLetter}1`,
            values: [['User']]
          });
        }
      }

      // Check Daily Weight headers
      if (!missingSheets.includes('Daily Weight')) {
        const weightHeaders = headerRes.data.valueRanges?.find(vr => vr.range?.includes('Daily Weight'))?.values?.[0] || [];
        if (!weightHeaders.includes('User')) {
          const colLetter = String.fromCharCode(65 + weightHeaders.length);
          updateData.push({
            range: `'Daily Weight'!${colLetter}1`,
            values: [['User']]
          });
        }
      }

      if (updateData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: updateData
          }
        });
      }
    }

    // 2. Format rows according to new layout
    // Format: Fecha | Comida | Producto/Marca | Cantidad | Proteínas (g) | Carbohidratos (g) | Grasas (g) | Calorías (Kcal) | Usuario
    const rows: (string | number)[][] = [];

    for (const [mealName, entries] of Object.entries(meals)) {

      (entries as any[]).forEach((entry: any) => {
         const matchedGrams = entry.name.match(/\((\d+(?:\.\d+)?)g\)$/);
         const derivedGrams = matchedGrams ? matchedGrams[1] : null;

         let cantidad = '1 porción';
         if (entry.grams) {
           cantidad = `${entry.grams}g`;
         } else if (derivedGrams) {
           cantidad = `${derivedGrams}g`;
         } else if (!matchedGrams && !entry.grams) {
           cantidad = '100g';
         }

         const cleanName = entry.name.replace(/\s*\(\d+(?:\.\d+)?g\)$/, '');

         // If headers have exactly 8 cols previously, we append the user at the 9th.
         // Even if there are blank rows for previous entries, Google Sheets allows appending dynamically.
         rows.push([
           date,
           mealName,
           cleanName,
           cantidad,
           entry.macros.protein,
           entry.macros.carbs,
           entry.macros.fats,
           entry.macros.calories,
           activeProfile // <-- Added User Profile Column
         ]);
      });
    }

    if (rows.length === 0 && !weight) {
       return NextResponse.json({ error: 'No hay datos para guardar' }, { status: 400 });
    }

    // 3. Concurrent operations for Main, Dictionary fetch, and Daily Weight
    const operations: Promise<any>[] = [];

    // Main sheet append
    if (rows.length > 0) {
      operations.push(sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Main'!A:I",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      }));
    }

    // Dictionary fetch (to be followed by conditional append)
    let dictFetchPromise: Promise<any> | null = null;
    if (Object.keys(meals).length > 0) {
      dictFetchPromise = sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Dictionary'!A:B",
      });
      operations.push(dictFetchPromise);
    }

    // Daily Weight append
    if (weight) {
      operations.push(sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Daily Weight'!A:C",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[date, weight, activeProfile]],
        },
      }));
    }

    // Wait for parallel operations
    const results = await Promise.all(operations);

    // 4. Follow-up: Save unique items to Dictionary if fetch was part of operations
    if (dictFetchPromise) {
      try {
        const dictResponse = await dictFetchPromise;
        const dictRows = dictResponse.data.values || [];
        const existingDict = new Set(dictRows.slice(1).map((r: any) => r[0] + '|' + r[1]));

        const newDictRows: string[][] = [];
        for (const [mealName, entries] of Object.entries(meals)) {
          (entries as any[]).forEach((entry: any) => {
             const cleanName = entry.name.replace(/\s*\(\d+g\)$/, '');
             const productData = JSON.stringify({ name: cleanName, baseMacros: entry.baseMacros });
             const key = mealName + '|' + productData;
             if (!existingDict.has(key)) {
               newDictRows.push([mealName, productData]);
               existingDict.add(key);
             }
          });
        }

        if (newDictRows.length > 0) {
           await sheets.spreadsheets.values.append({
             spreadsheetId,
             range: "'Dictionary'!A:B",
             valueInputOption: 'USER_ENTERED',
             requestBody: {
               values: newDictRows,
             },
           });
        }
      } catch (e) {
        console.error("Error updating Dictionary", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error saving to Google Sheets:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") || 'Error guardando en Sheets' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const profile = searchParams.get('profile') || "Lucas"; // Default to Lucas

    if (!date) {
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 });
    }

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Falta configurar ID de Spreadsheet' }, { status: 500 });
    }

    const sheets = await getSheets();

    // Fetch the data from "Main"
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Main'!A:I", // Extended range to I to include User
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ meals: { Desayuno: [], Almuerzo: [], Merienda: [], Cena: [] } });
    }

    // Filter by date (index 0) and profile (index 8)
    // If index 8 is undefined/empty, we treat it as legacy which is "Lucas"
    const filteredRows = rows.filter(row => {
      const rowDate = row[0];
      const rowProfile = row[8] || "Lucas";
      return rowDate === date && rowProfile === profile;
    });

    const meals: Record<string, any[]> = {
      Desayuno: [],
      Almuerzo: [],
      Merienda: [],
      Cena: []
    };

    filteredRows.forEach((row, idx) => {
      if (row[1] === 'Meal' || row[1] === 'Comida') return;

      const mealType = row[1];
      if (meals[mealType]) {
        meals[mealType].push({
          id: `history-${idx}`,
          name: row[2],
          grams: row[3],
          macros: {
            protein: parseFloat(row[4]) || 0,
            carbs: parseFloat(row[5]) || 0,
            fats: parseFloat(row[6]) || 0,
            calories: parseFloat(row[7]) || 0,
          }
        });
      }
    });

    return NextResponse.json({ meals });
  } catch (error: unknown) {
    console.error('Error fetching from Google Sheets:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") || 'Error leyendo de Sheets' }, { status: 500 });
  }
}
