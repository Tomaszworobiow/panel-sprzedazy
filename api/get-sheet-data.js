const { google } = require('googleapis');

const getAuth = () => {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
};

const parseData = (rows, headersMap) => {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
        let obj = {};
        for (const key in headersMap) {
            const headerName = headersMap[key].header;
            const parseFn = headersMap[key].parser;
            const index = headers.indexOf(headerName);
            obj[key] = index !== -1 ? parseFn(row[index]) : headersMap[key].default;
        }
        return obj;
    });
};

export default async function handler(req, res) {
    try {
        const auth = getAuth();
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            ranges: ['Zamówienia', 'Produkty', 'Klienci'],
        });
        const sheetValues = response.data.valueRanges;
        const orders = parseData(sheetValues[0].values, { id: { header: 'ID', parser: val => val || '', default: '' }, customerName: { header: 'Klient', parser: val => val || '', default: '' }, seller: { header: 'Sprzedawca', parser: val => val || '', default: '' }, date: { header: 'Data', parser: val => val || '', default: '' }, total: { header: 'Suma', parser: val => parseFloat(val) || 0, default: 0 }, paymentStatus: { header: 'StatusPłatności', parser: val => val || '', default: '' }, fulfillmentStatus: { header: 'StatusRealizacji', parser: val => val || '', default: '' }, products: { header: 'Produkty', parser: val => JSON.parse(val || '[]'), default: [] }, });
        const products = parseData(sheetValues[1].values, { id: { header: 'ID', parser: val => val || '', default: '' }, name: { header: 'Nazwa', parser: val => val || '', default: '' }, type: { header: 'Typ', parser: val => val || '', default: '' }, weight: { header: 'Waga', parser: val => val || '', default: '' }, price: { header: 'Cena', parser: val => parseFloat(val) || 0, default: 0 }, cost: { header: 'Koszt', parser: val => parseFloat(val) || 0, default: 0 }, stock: { header: 'StanMagazynowy', parser: val => parseInt(val, 10) || 0, default: 0 }, });
        const customers = parseData(sheetValues[2].values, { id: { header: 'ID', parser: val => val || '', default: '' }, name: { header: 'Nazwa', parser: val => val || '', default: '' }, email: { header: 'Email', parser: val => val || '', default: '' }, orderCount: { header: 'LiczbaZamówień', parser: val => parseInt(val, 10) || 0, default: 0 }, totalSpent: { header: 'SumaWydana', parser: val => parseFloat(val) || 0, default: 0 }, });
        res.status(200).json({ orders, products, customers });
    } catch (error) {
        console.error('BŁĄD WCZYTYWANIA DANYCH Z ARKUSZA:', error.message);
        res.status(500).json({ error: 'Nie udało się wczytać danych z arkusza.', details: error.message });
    }
}
