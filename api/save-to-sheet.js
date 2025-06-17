const { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  try {
    const { sheetName, data } = req.body;

    // NOWA METODA DEKODOWANIA KLUCZA
    const privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY, 'base64').toString('utf8');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey, // Używamy odkodowanego klucza
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [data],
      },
    });

    res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error('Error saving to sheet:', error.message);
    res.status(500).json({ error: 'Failed to save data to sheet' });
  }
}
