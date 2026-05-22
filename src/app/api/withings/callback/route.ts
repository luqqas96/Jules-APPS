import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveTokensToSheets } from '@/lib/withings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Should be the profile name

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const profile = state || "Lucas";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/withings/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    await saveTokensToSheets(tokens, profile);

    // Redirect back to the Withings page on success
    return NextResponse.redirect(`${baseUrl}/withings?success=true`);
  } catch (error: unknown) {
    console.error('Withings OAuth Callback Error:', error);
    return NextResponse.redirect(`${baseUrl}/withings?error=${encodeURIComponent((error instanceof Error ? error.message : "Unknown error"))}`);
  }
}
