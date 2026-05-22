import { NextResponse } from 'next/server';
import { getTokensFromSheets, refreshTokens, saveTokensToSheets, fetchWithingsActivity, fetchWithingsSleep, fetchWithingsBody } from '@/lib/withings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profile = searchParams.get('profile') || "Lucas";

  try {
    let tokens = await getTokensFromSheets(profile);

    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Withings' }, { status: 401 });
    }

    // Auto-refresh logic
    const now = Date.now();
    const expiresInMs = tokens.expires_in * 1000;
    if (now >= tokens.timestamp + expiresInMs - 300000) {
      try {
        tokens = await refreshTokens(tokens.refresh_token);
        await saveTokensToSheets(tokens, profile);
      } catch (e) {
         return NextResponse.json({ error: 'Token expired. Please reconnect.' }, { status: 401 });
      }
    }

    // Get last 7 days dates
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const endDate = today.toISOString().split('T')[0];
    const startDate = lastWeek.toISOString().split('T')[0];

    // Fetch data in parallel
    const [activityData, sleepData, bodyData] = await Promise.all([
      fetchWithingsActivity(tokens.access_token, startDate, endDate).catch(e => ({ error: e.message, activities: [] })),
      fetchWithingsSleep(tokens.access_token, startDate, endDate).catch(e => ({ error: e.message, series: [] })),
      fetchWithingsBody(tokens.access_token).catch(e => ({ error: e.message, measuregrps: [] }))
    ]);

    // Parse Body measurements
    let bodyComp = null;
    if (bodyData && bodyData.measuregrps && bodyData.measuregrps.length > 0) {
       const latestGrp = bodyData.measuregrps[0];
       bodyComp = {
          date: new Date(latestGrp.date * 1000).toISOString().split('T')[0],
          weight: latestGrp.measures.find((m: any) => m.type === 1)?.value * Math.pow(10, latestGrp.measures.find((m: any) => m.type === 1)?.unit || 0),
          fatMass: latestGrp.measures.find((m: any) => m.type === 8)?.value * Math.pow(10, latestGrp.measures.find((m: any) => m.type === 8)?.unit || 0),
          fatRatio: latestGrp.measures.find((m: any) => m.type === 71)?.value * Math.pow(10, latestGrp.measures.find((m: any) => m.type === 71)?.unit || 0),
          muscleMass: latestGrp.measures.find((m: any) => m.type === 76)?.value * Math.pow(10, latestGrp.measures.find((m: any) => m.type === 76)?.unit || 0),
          boneMass: latestGrp.measures.find((m: any) => m.type === 88)?.value * Math.pow(10, latestGrp.measures.find((m: any) => m.type === 88)?.unit || 0),
       };
    }

    return NextResponse.json({
       connected: true,
       activity: activityData.activities || [],
       sleep: sleepData.series || [],
       body: bodyComp
    });

  } catch (error: unknown) {
    console.error('Error fetching Withings data:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }
}
