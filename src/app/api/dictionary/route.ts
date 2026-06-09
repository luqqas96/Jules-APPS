import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase.from('food_history').select('*');

    if (error) {
      throw error;
    }

    const dictionary: Record<string, any[]> = {
      All: []
    };

    if (data && data.length > 0) {
       data.forEach(row => {
          dictionary.All.push({
             name: row.name,
             baseMacros: row.base_macros
          });
       });
       dictionary.All.sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({ dictionary });
  } catch (error: unknown) {
    console.error('Error fetching dictionary from Supabase:', error);
    return NextResponse.json({ error: 'Error leyendo diccionario' }, { status: 500 });
  }
}
