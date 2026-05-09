#!/bin/bash
sed -i 's/Record<string, unknown>/Record<string, string>/g' src/app/api/stats/route.ts
sed -i 's/let macroData: Record<string, string> = {};/let macroData: Record<string, {date: string, calories: number, protein: number, carbs: number, fats: number}> = {};/g' src/app/api/stats/route.ts

sed -i 's/data: unknown/data: { meals: unknown }/g' src/app/api/ai/modify/route.ts

sed -i 's/interface InputProps/export interface InputProps/g' src/components/ui/input.tsx
