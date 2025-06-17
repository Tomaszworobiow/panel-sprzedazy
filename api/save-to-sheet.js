onst { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  try {
    const { sheetName, data } = req.body;

    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Przechwytujemy odpowiedź od Google
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [data],
      },
    });

    // NOWE, SZCZEGÓŁOWE LOGOWANIE
    console.log('ODPOWIEDŹ Z GOOGLE API:', JSON.stringify(response.data, null, 2));

    res.status(200).json({ 
        message: 'Success, check logs for Google API Response', 
        googleResponse: response.data 
    });

  } catch (error) {
    console.error('BŁĄD ZAPISU DO ARKUSZA:', error.message);
    res.status(500).json({ 
      error: 'Nie udało się zapisać danych do arkusza.', 
      details: error.message 
    });
  }
}
