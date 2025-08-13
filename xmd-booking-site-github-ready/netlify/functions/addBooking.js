const { google } = require('googleapis');

exports.handler = async (event) => {
  try {
    const { name, email, date, time, service } = JSON.parse(event.body);

    if (!name || !email || !date || !time || !service) {
      return { statusCode: 400, body: 'Missing fields' };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Parse time and check business hours (8 AM - 8 PM)
    const requestedTime = new Date(`1970-01-01T${time}:00`);
    const openingTime = new Date(`1970-01-01T08:00:00`);
    const closingTime = new Date(`1970-01-01T20:00:00`);

    if (requestedTime < openingTime || requestedTime > closingTime) {
      return {
        statusCode: 400,
        body: 'Bookings are only available between 8:00 AM and 8:00 PM'
      };
    }

    // Get existing bookings for the date
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Bookings!A:E'
    });

    const rows = res.data.values || [];
    const bookedTimes = rows
      .filter(r => r[2] === date)
      .map(r => r[3]);

    // Check for 2-hour gap
    const twoHours = 2 * 60 * 60 * 1000;
    for (let booked of bookedTimes) {
      const bookedTime = new Date(`1970-01-01T${booked}:00`);
      const diff = Math.abs(requestedTime - bookedTime);
      if (diff < twoHours) {
        return {
          statusCode: 400,
          body: 'Selected time is too close to another booking (must be at least 2 hours apart)'
        };
      }
    }

    // Append new booking
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Bookings!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[name, email, date, time, service]]
      }
    });

    return { statusCode: 200, body: 'Booking successful' };

  } catch (error) {
    console.error('Booking error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
    console.error(error);
    return { statusCode: 500, body: 'Server error' };
  }
};
