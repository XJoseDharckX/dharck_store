const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Configuración de Google Sheets
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        
        if (req.method === 'GET') {
            // Obtener configuración guardada desde Google Sheets
            let configSheet;
            try {
                configSheet = doc.sheetsByTitle['ArticulosConfig'];
            } catch {
                // Crear hoja si no existe
                configSheet = await doc.addSheet({
                    title: 'ArticulosConfig',
                    headerValues: ['juego', 'configuracion']
                });
            }
            
            const rows = await configSheet.getRows();
            const config = {};
            
            rows.forEach(row => {
                try {
                    config[row.juego] = JSON.parse(row.configuracion);
                } catch (e) {
                    console.error('Error parsing config for game:', row.juego);
                }
            });
            
            res.status(200).json(config);
            
        } else if (req.method === 'POST') {
            // Guardar nueva configuración en Google Sheets
            const { gameArticlesConfig } = req.body;
            
            let configSheet;
            try {
                configSheet = doc.sheetsByTitle['ArticulosConfig'];
            } catch {
                configSheet = await doc.addSheet({
                    title: 'ArticulosConfig',
                    headerValues: ['juego', 'configuracion']
                });
            }
            
            // Limpiar hoja existente
            await configSheet.clear();
            await configSheet.setHeaderRow(['juego', 'configuracion']);
            
            // Guardar cada juego
            const rows = [];
            Object.keys(gameArticlesConfig).forEach(gameName => {
                rows.push({
                    juego: gameName,
                    configuracion: JSON.stringify(gameArticlesConfig[gameName])
                });
            });
            
            await configSheet.addRows(rows);
            
            res.status(200).json({ success: true, message: 'Configuración guardada exitosamente' });
        }
    } catch (error) {
        console.error('Error en articles-config:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
};