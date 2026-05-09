import type { Auth } from "googleapis";
import { google } from "googleapis";

// Assuming you'll set these env variables:
// GOOGLE_SERVICE_ACCOUNT_EMAIL
// GOOGLE_PRIVATE_KEY
// GOOGLE_SPREADSHEET_ID

export async function getSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Replace escaped newlines with actual newlines
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error("Faltan credenciales de Google Service Account");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client as   any });

  return sheets;
}