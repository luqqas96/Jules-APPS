import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profile = searchParams.get('profile') || "Lucas";
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let foodQuery = supabase.from('food_logs').select('date, meal_type, calories, protein, carbs, fats').eq('profile', profile);
    let weightQuery = supabase.from('weight_logs').select('date, weight').eq('profile', profile).order('date', { ascending: true });

    if (startDate) {
        foodQuery = foodQuery.gte('date', startDate);
        weightQuery = weightQuery.gte('date', startDate);
    }
    if (endDate) {
        foodQuery = foodQuery.lte('date', endDate);
        weightQuery = weightQuery.lte('date', endDate);
    }

    const [foodRes, weightRes] = await Promise.all([
       foodQuery,
       weightQuery
    ]);

    if (foodRes.error) throw foodRes.error;
    if (weightRes.error) throw weightRes.error;

    const macroData: Record<string, any> = {};

    foodRes.data?.forEach(row => {
       const date = row.date;
       if (!macroData[date]) {
          macroData[date] = { date, calories: 0, protein: 0, carbs: 0, fats: 0, hasDinner: false };
       }
       if (row.meal_type === 'Cena') {
          macroData[date].hasDinner = true;
       }
       macroData[date].calories += Number(row.calories) || 0;
       macroData[date].protein += Number(row.protein) || 0;
       macroData[date].carbs += Number(row.carbs) || 0;
       macroData[date].fats += Number(row.fats) || 0;
    });

    let aggregatedMacros = Object.values(macroData).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Si el último día no tiene "Cena", lo excluimos para que no afecte promedios ni muestre caídas en el gráfico
    if (aggregatedMacros.length > 0) {
        const lastDay = aggregatedMacros[aggregatedMacros.length - 1];
        if (!lastDay.hasDinner) {
            aggregatedMacros.pop();
        }
    }

    const sortedWeight = weightRes.data || [];

    // Calculate advanced stats
    let advancedStats = null;
    if (aggregatedMacros.length > 0) {
      const cals = aggregatedMacros.map((m: any) => m.calories).filter((c: number) => c > 0);
      const prots = aggregatedMacros.map((m: any) => m.protein).filter((c: number) => c > 0);
      const carbo = aggregatedMacros.map((m: any) => m.carbs).filter((c: number) => c > 0);
      const fat = aggregatedMacros.map((m: any) => m.fats).filter((c: number) => c > 0);

      if (cals.length > 0) {
        const sum = cals.reduce((a: number, b: number) => a + b, 0);
        const avgCals = Math.round(sum / cals.length);

        const sortedCals = [...cals].sort((a, b) => a - b);
        const mid = Math.floor(sortedCals.length / 2);
        const medianCals = sortedCals.length % 2 !== 0 ? sortedCals[mid] : Math.round((sortedCals[mid - 1] + sortedCals[mid]) / 2);

        const variance = cals.reduce((a: number, b: number) => a + Math.pow(b - avgCals, 2), 0) / cals.length;
        const stdDev = Math.round(Math.sqrt(variance));

        const minCals = sortedCals[0];
        const maxCals = sortedCals[sortedCals.length - 1];

        const calcMacroStats = (arr: number[]) => {
            if (arr.length === 0) return { avg: 0, median: 0, min: 0, max: 0 };
            const mSum = arr.reduce((a, b) => a + b, 0);
            const avg = Math.round(mSum / arr.length);
            const sorted = [...arr].sort((a, b) => a - b);
            const mMid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 !== 0 ? sorted[mMid] : Math.round((sorted[mMid - 1] + sorted[mMid]) / 2);
            return { avg, median, min: Math.round(sorted[0]), max: Math.round(sorted[sorted.length - 1]) };
        };

        const proteinStats = calcMacroStats(prots);
        const carbsStats = calcMacroStats(carbo);
        const fatsStats = calcMacroStats(fat);

        advancedStats = {
          avgCals,
          medianCals,
          stdDev,
          minCals,
          maxCals,
          protein: proteinStats,
          carbs: carbsStats,
          fats: fatsStats
        };
      }
    }

    return NextResponse.json({ weight: sortedWeight, macros: aggregatedMacros, advancedStats });

  } catch (error: unknown) {
    console.error('Error fetching stats from Supabase:', error);
    return NextResponse.json({ error: 'Error leyendo estadísticas' }, { status: 500 });
  }
}
