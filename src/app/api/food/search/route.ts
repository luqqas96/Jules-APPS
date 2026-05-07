export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;

    const res = await fetch(url, {
        cache: 'no-store',
        headers: {
            'User-Agent': 'NutritionTrackerApp - Web - Version 1.0 - https://github.com/'
        }
    });

    const text = await res.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("OpenFoodFacts returned non-JSON:", text.substring(0, 100));
        return NextResponse.json({ error: 'El servicio de búsqueda no está disponible en este momento.' }, { status: 503 });
    }

    if (!data.products || data.products.length === 0) {
      return NextResponse.json({ error: 'No se encontraron resultados para esta búsqueda.' }, { status: 404 });
    }

    const results = data.products
      .filter((p: Record<string, any>) => p.product_name || p.product_name_es) // Filtrar los que no tienen nombre
      .map((product: Record<string, any>) => {
        const nutriments = product.nutriments || {};
        return {
          name: product.product_name_es || product.product_name || query,
          brand: product.brands || '',
          macros: {
            calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal_value'] || 0),
            protein: Math.round(nutriments.proteins_100g || nutriments.proteins_value || 0),
            carbs: Math.round(nutriments.carbohydrates_100g || nutriments.carbohydrates_value || 0),
            fats: Math.round(nutriments.fat_100g || nutriments.fat_value || 0),
          }
        };
      });

    // Remover duplicados exactos de nombre para limpiar la lista
    const uniqueResults = Array.from(new Map(results.map((item: Record<string, any>) => [item.name, item])).values());

    return NextResponse.json(uniqueResults.slice(0, 5)); // Devolver los 5 mejores resultados
  } catch (error: unknown) {
    console.error('Error fetching OpenFoodFacts:', (error instanceof Error ? error.message : "Unknown error") || error);
    return NextResponse.json({ error: `Error: ${(error instanceof Error ? error.message : "Unknown error") || error}` }, { status: 500 });
  }
}
