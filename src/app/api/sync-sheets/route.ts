import { NextResponse } from 'next/server';
import { getSheets } from '@/lib/sheets';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetDate = body.date;

    if (!targetDate) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'No spreadsheet ID configured' }, { status: 500 });
    }

    console.log(`Starting client-driven backup to Google Sheets for date: ${targetDate}`);

    const sheets = await getSheets();

    // Fetch data from Supabase for target date
    const [foodRes, weightRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('date', targetDate),
      supabase.from('weight_logs').select('*').eq('date', targetDate)
    ]);

    if (foodRes.error) throw foodRes.error;
    if (weightRes.error) throw weightRes.error;

    // Append Food Logs to 'Main' sheet
    if (foodRes.data && foodRes.data.length > 0) {
      const foodRows = foodRes.data.map((log: any) => [
        log.date,
        log.meal_type,
        log.product_name,
        log.amount,
        log.protein,
        log.carbs,
        log.fats,
        log.calories,
        log.profile,
        log.cholesterol,
        log.sodium,
        log.sugar,
        log.calcium,
        log.time
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Main'!A:N",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: foodRows },
      });
      console.log(`Appended ${foodRows.length} food rows to Sheets.`);
    }

    // Append Weight Logs to 'Daily Weight' sheet
    if (weightRes.data && weightRes.data.length > 0) {
      const weightRows = weightRes.data.map((log: any) => [
        log.date,
        log.weight,
        log.profile
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Daily Weight'!A:C",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: weightRows },
      });
      console.log(`Appended ${weightRows.length} weight rows to Sheets.`);
    }

    return NextResponse.json({ success: true, date: targetDate, foods: foodRes.data?.length || 0, weights: weightRes.data?.length || 0 });
  } catch (error: any) {
    console.error('Error in sheet sync:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
