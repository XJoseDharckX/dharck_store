const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Configuración de autenticación
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Función para obtener el documento de Google Sheets
async function getGoogleSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error('Error al conectar con Google Sheets:', error);
    throw error;
  }
}

// Mapeo de nombres de vendedores a nombres de hojas
const SELLER_SHEET_MAPPING = {
  'XJoseDharckX': 'XJoseDharckX',
  'Miguel': 'Miguel',
  'Alfredo Favier': 'Alfredo',
  'Candy Candy': 'Candy',
  'Satoru': 'Satoru',
  'Ernesto': 'Ernesto',
  'OSCAR': 'Oscar'
};

// Función para obtener la hoja específica del vendedor
async function getSellerSheet(sellerName) {
  try {
    const doc = await getGoogleSheet();
    const sheetName = SELLER_SHEET_MAPPING[sellerName];
    
    if (!sheetName) {
      throw new Error(`Vendedor no encontrado: ${sellerName}`);
    }
    
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Hoja no encontrada para el vendedor: ${sheetName}`);
    }
    
    return sheet;
  } catch (error) {
    console.error('Error al obtener la hoja del vendedor:', error);
    throw error;
  }
}

module.exports = {
  getGoogleSheet,
  getSellerSheet,
  SELLER_SHEET_MAPPING
};