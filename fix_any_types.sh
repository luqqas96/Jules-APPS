#!/bin/bash

# Fix Add page
sed -i 's/useState, useRef/useState/g' src/app/add/page.tsx
sed -i 's/PencilSquareIcon, PencilIcon, QrCodeIcon/PencilSquareIcon, QrCodeIcon/g' src/app/add/page.tsx
sed -i 's/const \[dictionary, setDictionary\] = useState<any\[\]>(\[\]);/const \[dictionary, setDictionary\] = useState<Partial<FoodEntry>\[\]>(\[\]);/' src/app/add/page.tsx
sed -i 's/catch (e) {/catch (_e) {/g' src/app/add/page.tsx

# Fix route.ts warnings
sed -i 's/catch (e) {/catch (_e) {/g' src/app/api/ai/modify/route.ts
sed -i 's/catch (error) {/catch (_error) {/g' src/app/api/ai/modify/route.ts
sed -i 's/catch (e) {/catch (_e) {/g' src/app/api/dictionary/route.ts
sed -i 's/catch (error) {/catch (_error) {/g' src/app/api/dictionary/route.ts
sed -i 's/catch (e) {/catch (_e) {/g' src/app/api/food/search/route.ts
sed -i 's/catch (error) {/catch (_error) {/g' src/app/api/food/search/route.ts
sed -i 's/catch (e) {/catch (_e) {/g' src/app/api/food/vision/route.ts
sed -i 's/catch (error) {/catch (_error) {/g' src/app/api/food/vision/route.ts
sed -i 's/catch (e) {/catch (_e) {/g' src/app/api/stats/route.ts
sed -i 's/catch (error: unknown) {/catch (_error: unknown) {/g' src/app/api/stats/route.ts
sed -i 's/catch (e: unknown) {/catch (_e: unknown) {/g' src/app/historial/page.tsx
sed -i 's/catch (e) {/catch (_e) {/g' src/app/page.tsx
sed -i 's/catch (error) {/catch (_error) {/g' src/components/dashboard/AIAssistantBox.tsx

# App page unused imports
sed -i 's/import { useEffect, useState } from "react";/import { useState } from "react";/' src/app/page.tsx
