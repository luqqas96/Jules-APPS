#!/bin/bash
sed -i 's/export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}/export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;/g' src/components/ui/input.tsx

sed -i 's/any/unknown/g' src/app/api/food/search/route.ts
sed -i 's/item: unknown/item: { product_name: string, brands: string, nutriments: Record<string, number>, code: string }/g' src/app/api/food/search/route.ts

sed -i 's/any/unknown/g' src/lib/sheets/index.ts
sed -i 's/auth: unknown/auth: GoogleAuth/g' src/lib/sheets/index.ts
sed -i '1s/^/import { GoogleAuth } from "google-auth-library";\n/' src/lib/sheets/index.ts

sed -i 's/any/unknown/g' src/app/api/ai/modify/route.ts
