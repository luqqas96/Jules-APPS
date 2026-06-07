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
    const requiredSheets = ['Main', 'Daily Weight', 'Statistics', 'Dictionary', 'Fitness Progress'];
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

      // Optionally add headers to Main if we just created it
      if (missingSheets.includes('Main')) {
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "'Main'!A1:N1",
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Fecha', 'Comida', 'Producto/Marca', 'Cantidad', 'Proteínas (g)', 'Carbohidratos (g)', 'Grasas (g)', 'Calorías (Kcal)', 'Usuario', 'Colesterol (mg)', 'Sodio (mg)', 'Azúcares (g)', 'Calcio (mg)', 'Hora']]
            }
         });
      }

      if (missingSheets.includes('Dictionary')) {
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "'Dictionary'!A1:B1",
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Meal', 'Product (JSON)']]
            }
         });
      }
      if (missingSheets.includes('Daily Weight')) {
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "'Daily Weight'!A1:C1",
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Date', 'Weight (kg)', 'User']]
            }
         });
      }
      if (missingSheets.includes('Fitness Progress')) {
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "'Fitness Progress'!A1:F1",
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['Date', 'Category', 'Exercise', 'Reps', 'Weight', 'User']]
            }
         });
      }
    }

    // Check if headers need updating for existing sheets to add User column
    if (!missingSheets.includes('Main')) {
       const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Main'!A1:N1" });
       const headers = headerRes.data.values?.[0] || [];
       if (!headers.includes('Colesterol (mg)') && !headers.includes('Cholesterol (mg)') || !headers.includes('Hora')) {
         // Overwrite entire header row to ensure all columns are present and correctly translated
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'Main'!A1:N1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['Fecha', 'Comida', 'Producto/Marca', 'Cantidad', 'Proteínas (g)', 'Carbohidratos (g)', 'Grasas (g)', 'Calorías (Kcal)', 'Usuario', 'Colesterol (mg)', 'Sodio (mg)', 'Azúcares (g)', 'Calcio (mg)', 'Hora']] }
         });
       }
    }

    if (!missingSheets.includes('Daily Weight')) {
       const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Daily Weight'!A1:C1" });
       const headers = headerRes.data.values?.[0] || [];
       if (!headers.includes('User')) {
         const nextColIndex = headers.length;
         const colLetter = String.fromCharCode(65 + nextColIndex);
         await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'Daily Weight'!${colLetter}1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['User']] }
         });
       }
    }

    // Get existing data to prevent duplicates
    let existingData: any[] = [];
    try {
      // Extend range to M to accommodate the new micronutrients
      const existingRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Main'!A:N"
      });
      existingData = existingRes.data.values || [];
    } catch (e) {
      console.log("Could not fetch existing data for deduplication", e);
    }

    // 2. Format rows according to new layout
    // Format: Fecha | Comida | Producto/Marca | Cantidad | Proteínas (g) | Carbohidratos (g) | Grasas (g) | Calorías (Kcal) | Usuario | Colesterol (mg) | Sodio (mg) | Azúcares (g) | Calcio (mg) | Hora
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

         let horaString = '';
         if (entry.timestamp) {
            const dateObj = new Date(entry.timestamp);
            // Quick local timezone fix for Amsterdam (CET/CEST) without complex Intl dependencies
            // We use the date offset to get Amsterdam time
            const localDate = new Date(dateObj.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
            horaString = `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`;
         }

         const rowData = [
           date,
           mealName,
           cleanName,
           cantidad,
           entry.macros.protein,
           entry.macros.carbs,
           entry.macros.fats,
           entry.macros.calories,
           activeProfile,
           entry.macros.cholesterol ?? 0,
           entry.macros.sodium ?? 0,
           entry.macros.sugar ?? 0,
           entry.macros.calcium ?? 0,
           horaString
         ];

         // Basic deduplication: check if an identical row already exists in the sheet
         // (comparing Date, Meal, Product, Amount, and User)
         const isDuplicate = existingData.some(existingRow => {
           return existingRow[0] === date &&
                  existingRow[1] === mealName &&
                  existingRow[2] === cleanName &&
                  existingRow[3] === cantidad &&
                  (existingRow[8] || "Lucas") === activeProfile; // Fallback to Lucas if missing User column
         });

         if (!isDuplicate) {
           rows.push(rowData);
         } else {
           console.log(`Skipping duplicate entry: ${date} - ${mealName} - ${cleanName}`);
         }
      });
    }

    if (rows.length === 0 && !weight) {
       return NextResponse.json({ success: true, message: 'No hay nuevos datos para guardar (o eran duplicados)' });
    }

    if (rows.length > 0) {
      // Find the last used row or just append to A:M (including extended macros)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Main'!A:N",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      });
    }



    // 3. Save unique items to Dictionary
    if (Object.keys(meals).length > 0) {
      try {
        const dictResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "'Dictionary'!A:B",
        });
        const dictRows = dictResponse.data.values || [];
        const existingDict = new Set(dictRows.slice(1).map(r => r[0] + '|' + r[1]));

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

    if (weight) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Daily Weight'!A:C",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[date, weight, activeProfile]], // <-- Added User Profile Column
        },
      });
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
      range: "'Main'!A:N", // Extended range to M to include User & extended macros
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
        let timestamp = Date.now();
        const timeString = row[13];
        if (timeString && timeString.includes(':')) {
           const [hh, mm] = timeString.split(':');
           const d = new Date(row[0] + 'T00:00:00');
           d.setHours(parseInt(hh, 10));
           d.setMinutes(parseInt(mm, 10));
           timestamp = d.getTime();
        }

        meals[mealType].push({
          id: `history-${idx}`,
          name: row[2],
          grams: row[3],
          timestamp,
          macros: {
            protein: parseFloat(row[4]) || 0,
            carbs: parseFloat(row[5]) || 0,
            fats: parseFloat(row[6]) || 0,
            calories: parseFloat(row[7]) || 0,
            cholesterol: parseFloat(row[9]) || 0,
            sodium: parseFloat(row[10]) || 0,
            sugar: parseFloat(row[11]) || 0,
            calcium: parseFloat(row[12]) || 0,
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
