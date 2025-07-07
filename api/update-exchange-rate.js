const fs = require('fs').promises;
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Configuración de autenticación
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'POST') {
        try {
            const { countryName, exchangeRate } = req.body;
            
            if (!countryName || !exchangeRate || exchangeRate <= 0) {
                return res.status(400).json({ error: 'País y tasa de cambio válida son requeridos' });
            }
            
            // Conectar a Google Sheets
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
            await doc.loadInfo();
            
            // Buscar o crear hoja de tasas de cambio
            let ratesSheet = doc.sheetsByTitle['TasasCambio'];
            if (!ratesSheet) {
                ratesSheet = await doc.addSheet({
                    title: 'TasasCambio',
                    headerValues: ['Pais', 'TasaCambio', 'FechaActualizacion']
                });
            }
            
            await ratesSheet.loadCells();
            
            // Buscar si el país ya existe
            const rows = await ratesSheet.getRows();
            let countryRow = rows.find(row => row.get('Pais') === countryName);
            
            if (countryRow) {
                // Actualizar tasa existente
                countryRow.set('TasaCambio', exchangeRate);
                countryRow.set('FechaActualizacion', new Date().toISOString());
                await countryRow.save();
            } else {
                // Agregar nueva tasa
                await ratesSheet.addRow({
                    'Pais': countryName,
                    'TasaCambio': exchangeRate,
                    'FechaActualizacion': new Date().toISOString()
                });
            }
            
            res.status(200).json({ 
                success: true, 
                message: `Tasa de cambio para ${countryName} actualizada a ${exchangeRate}` 
            });
            
        } catch (error) {
            console.error('Error al actualizar tasa de cambio:', error);
            res.status(500).json({ error: 'Error al actualizar tasa de cambio: ' + error.message });
        }
    } else {
        res.status(405).json({ error: 'Método no permitido' });
    }
}