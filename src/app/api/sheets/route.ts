import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const profile = searchParams.get('profile') || "Lucas";

    if (!date) {
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 });
    }

    const { data: foodRows, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('profile', profile)
      .eq('date', date);

    if (error) throw error;

    const meals: Record<string, any[]> = {
      Desayuno: [],
      Almuerzo: [],
      Merienda: [],
      Cena: []
    };

    if (foodRows && foodRows.length > 0) {
      foodRows.forEach((row: any) => {
        const mealType = row.meal_type;
        if (meals[mealType]) {
          let timestamp = Date.now();
          const timeString = row.time;
          if (timeString && timeString.includes(':')) {
             const [hh, mm] = timeString.split(':');
             const d = new Date(row.date + 'T00:00:00');
             d.setHours(parseInt(hh, 10));
             d.setMinutes(parseInt(mm, 10));
             timestamp = d.getTime();
          }

          meals[mealType].push({
            id: row.id,
            name: row.product_name,
            grams: row.amount,
            timestamp,
            macros: {
              protein: Number(row.protein) || 0,
              carbs: Number(row.carbs) || 0,
              fats: Number(row.fats) || 0,
              calories: Number(row.calories) || 0,
              cholesterol: Number(row.cholesterol) || 0,
              sodium: Number(row.sodium) || 0,
              sugar: Number(row.sugar) || 0,
              calcium: Number(row.calcium) || 0,
            }
          });
        }
      });
    }

    return NextResponse.json({ meals });
  } catch (error: unknown) {
    console.error('Error fetching history from Supabase:', error);
    return NextResponse.json({ error: 'Error leyendo historial' }, { status: 500 });
  }
}
