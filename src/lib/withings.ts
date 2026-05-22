import { getSheets } from './sheets';

const WITHINGS_AUTH_URL = 'https://account.withings.com/oauth2_user/authorize2';
const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';

export interface WithingsTokens {
  access_token: string;
  refresh_token: string;
  userid: string;
  expires_in: number;
  timestamp: number; // When the token was obtained
}

export function getAuthorizationUrl(redirectUri: string, state: string = 'pixeltracker') {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  if (!clientId) throw new Error('Missing WITHINGS_CLIENT_ID');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    state: state,
    scope: 'user.info,user.metrics,user.activity',
    redirect_uri: redirectUri,
    mode: 'demo', // Optional, remove for real users if needed, but safe to keep
  });

  return `${WITHINGS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<WithingsTokens> {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error('Missing Withings credentials');

  const params = new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(WITHINGS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.status !== 0 || !data.body) {
    throw new Error(`Withings token exchange failed: ${JSON.stringify(data)}`);
  }

  return {
    access_token: data.body.access_token,
    refresh_token: data.body.refresh_token,
    userid: data.body.userid,
    expires_in: data.body.expires_in,
    timestamp: Date.now(),
  };
}

export async function saveTokensToSheets(tokens: WithingsTokens, profile: string = "Lucas") {
  const sheets = await getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SPREADSHEET_ID');

  // Ensure WithingsAuth sheet exists
  const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = spreadsheetInfo.data.sheets?.map((s: any) => s.properties?.title) || [];

  if (!existingTitles.includes('WithingsAuth')) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: 'WithingsAuth' } } }]
      }
    });
    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'WithingsAuth'!A1:F1",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Profile', 'User ID', 'Access Token', 'Refresh Token', 'Expires In', 'Timestamp']] }
    });
  }

  // Get existing to update or append
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'WithingsAuth'!A:F",
  });
  const rows = response.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === profile) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  const rowData = [[
    profile,
    tokens.userid,
    tokens.access_token,
    tokens.refresh_token,
    tokens.expires_in.toString(),
    tokens.timestamp.toString()
  ]];

  if (rowIndex > -1) {
    // Update
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'WithingsAuth'!A${rowIndex}:F${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rowData }
    });
  } else {
    // Append
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'WithingsAuth'!A:F",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rowData }
    });
  }
}

export async function getTokensFromSheets(profile: string = "Lucas"): Promise<WithingsTokens | null> {
  const sheets = await getSheets();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SPREADSHEET_ID');

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'WithingsAuth'!A:F",
    });
    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === profile) {
        return {
          userid: rows[i][1],
          access_token: rows[i][2],
          refresh_token: rows[i][3],
          expires_in: parseInt(rows[i][4], 10),
          timestamp: parseInt(rows[i][5], 10),
        };
      }
    }
  } catch (e) {
    // Sheet might not exist yet
    return null;
  }
  return null;
}

export async function refreshTokens(refreshToken: string): Promise<WithingsTokens> {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error('Missing Withings credentials');

  const params = new URLSearchParams({
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(WITHINGS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.status !== 0 || !data.body) {
    throw new Error(`Withings token refresh failed: ${JSON.stringify(data)}`);
  }

  return {
    access_token: data.body.access_token,
    refresh_token: data.body.refresh_token,
    userid: data.body.userid,
    expires_in: data.body.expires_in,
    timestamp: Date.now(),
  };
}
