import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { date, category, exercise, sets, reps, weight, profile } = await request.json();
    const activeProfile = profile || "Lucas";

    if (!date || !category || !exercise || sets === undefined || reps === undefined || weight === undefined) {
       return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const { error } = await supabase.from('fitness_progress').insert([
      {
        profile: activeProfile,
        date,
        category,
        exercise,
        sets: Number(sets),
        reps: Number(reps),
        weight: Number(weight)
      }
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error saving fitness data to Supabase:', error);
    return NextResponse.json({ error: 'Error guardando en Supabase' }, { status: 500 });
  }
}
