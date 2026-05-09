#!/bin/bash
sed -i 's/export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;/export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { customProp?: string; }/g' src/components/ui/input.tsx
sed -i 's/import { GoogleAuth } from "google-auth-library";/import type { Auth } from "googleapis";/g' src/lib/sheets/index.ts
sed -i 's/GoogleAuth/Auth.GoogleAuth/g' src/lib/sheets/index.ts
