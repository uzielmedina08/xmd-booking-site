const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    const date = event.queryStringParameters.date;
    if (!date) return { statusCode: 400, body: 'Date required' };

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Bookings!A:E'
    });

    const rows = res.data.values || [];
    const bookedTimes = rows
      .filter(r => r[2] === date)
      .map(r => r[3]);

    return { statusCode: 200, body: JSON.stringify(bookedTimes) };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
