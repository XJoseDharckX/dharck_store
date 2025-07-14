const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    try {
        console.log('Testing Google Sheets connection...');
        console.log('Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
        console.log('Sheet ID:', process.env.GOOGLE_SHEET_ID);
        console.log('Private Key exists:', !!process.env.GOOGLE_PRIVATE_KEY);
        
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        
        res.status(200).json({ 
            success: true, 
            title: doc.title,
            sheets: doc.sheetsByIndex.map(sheet => sheet.title)
        });
    } catch (error) {
        console.error('Connection test failed:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
};