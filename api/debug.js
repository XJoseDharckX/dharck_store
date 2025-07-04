module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verificar variables de entorno
    const envCheck = {
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      emailValue: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Configurado' : 'No configurado',
      keyLength: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0,
      sheetIdValue: process.env.GOOGLE_SHEET_ID ? 'Configurado' : 'No configurado'
    };

    // Intentar conectar con Google Sheets
    let connectionTest = 'No probado';
    try {
      const { getGoogleSheet } = require('./sheets-config');
      const doc = await getGoogleSheet();
      connectionTest = `Éxito - Título: ${doc.title}`;
    } catch (error) {
      connectionTest = `Error: ${error.message}`;
    }

    res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      googleSheetsConnection: connectionTest,
      nodeVersion: process.version
    });

  } catch (error) {
    res.status(500).json({
      error: 'Error en diagnóstico',
      details: error.message,
      stack: error.stack
    });
  }
};