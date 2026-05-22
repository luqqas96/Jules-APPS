import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/withings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profile = searchParams.get('profile') || "Lucas";

  // Use the origin from the request or a defined env var for the redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/withings/callback`;

  // We pass the profile in the state so we know who we are authenticating in the callback
  const authUrl = getAuthorizationUrl(redirectUri, profile);

  return NextResponse.redirect(authUrl);
}
