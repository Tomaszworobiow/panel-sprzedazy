const { google } = require('googleapis');

const getAuth = () => {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST method is allowed' });
    }

    try {
        const { sheetName, id, data } = req.body;
        if (!sheetName || !id || !data) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const auth = getAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        const getRowsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `${sheetName}!A:A`,
        });

        const rows = getRowsResponse.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Sheet not found' });
        }

        const rowIndex = rows.findIndex(row => row[0] === id);
        if (rowIndex === -1) {
            return res.status(404).json({ error: `ID '${id}' not found` });
        }

        const rowNumber = rowIndex + 1;

        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `${sheetName}!A${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [data] },
        });

        res.status(200).json({ message: `Row with ID ${id} updated.` });
    } catch (error) {
        console.error('BŁĄD AKTUALIZACJI WIERSZA:', error.message);
        res.status(500).json({ error: 'Nie udało się zaktualizować danych.', details: error.message });
    }
}

