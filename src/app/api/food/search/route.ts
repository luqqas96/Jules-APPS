export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    // Usamos OpenFoodFacts (gratuito, sin límite de cuota IA) y pedimos 10 resultados
    // Usamos /api/v2/search que devuelve JSON garantizado en vez de cgi/search.pl que a veces falla
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=10&fields=product_name,product_name_es,brands,nutriments`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

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