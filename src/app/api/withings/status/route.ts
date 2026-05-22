import { NextResponse } from 'next/server';
import { getTokensFromSheets, refreshTokens, saveTokensToSheets } from '@/lib/withings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profile = searchParams.get('profile') || "Lucas";

  try {
    let tokens = await getTokensFromSheets(profile);

    if (!tokens) {
      return NextResponse.json({ connected: false });
    }

    // Check if token needs refresh (withings token expires in usually 3 hours)
    const now = Date.now();
    const expiresInMs = tokens.expires_in * 1000;
    // Buffer of 5 minutes (300000ms)
    if (now >= tokens.timestamp + expiresInMs - 300000) {
      console.log('Withings token expired, refreshing...');
      try {
        tokens = await refreshTokens(tokens.refresh_token);
        await saveTokensToSheets(tokens, profile);
      } catch (refreshErr) {
        console.error('Failed to refresh token:', refreshErr);
        return NextResponse.json({ connected: false, error: 'Token expired and refresh failed. Re-authenticate.' });
      }
    }

    return NextResponse.json({ connected: true, userid: tokens.userid });
  } catch (error: unknown) {
    console.error('Error checking Withings status:', error);
    return NextResponse.json({ connected: false, error: (error instanceof Error ? error.message : "Unknown error") });
  }
}
