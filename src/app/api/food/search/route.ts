import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    // We use Spanish localized OpenFoodFacts for better results
    const url = `https://es.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      return NextResponse.json({ error: 'No se encontraron resultados' }, { status: 404 });
    }

    const product = data.products[0];
    const nutriments = product.nutriments || {};

    return NextResponse.json({
      name: product.product_name_es || product.product_name || query,
      macros: {
        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal_value'] || 0,
        protein: nutriments.proteins_100g || nutriments.proteins_value || 0,
        carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates_value || 0,
        fats: nutriments.fat_100g || nutriments.fat_value || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching OpenFoodFacts:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}