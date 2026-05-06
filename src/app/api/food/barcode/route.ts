import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
  }

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${code}.json`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    return NextResponse.json({
      name: product.product_name_es || product.product_name || `Producto ${code}`,
      macros: {
        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal_value'] || 0,
        protein: nutriments.proteins_100g || nutriments.proteins_value || 0,
        carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates_value || 0,
        fats: nutriments.fat_100g || nutriments.fat_value || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching OpenFoodFacts barcode:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}