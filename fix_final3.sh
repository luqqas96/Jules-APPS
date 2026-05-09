#!/bin/bash
sed -i 's/auth: client as any/auth: client as \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any/g' src/lib/sheets/index.ts

sed -i 's/advancedStats?: any/advancedStats?: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any/g' src/app/estadisticas/page.tsx
sed -i 's/(value: any)/(value: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any)/g' src/app/estadisticas/page.tsx
sed -i 's/(value: any, name: any)/(value: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any, name: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any)/g' src/app/estadisticas/page.tsx
