const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');

// Configuración de autenticación
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Datos por defecto de países
const defaultCountryData = [
    { name: 'VENEZUELA', code: 'VES', exchangeRate: 144.5, symbol: 'Bs.', imageUrl: '/image/paises/ve.png' },
    { name: 'COLOMBIA', code: 'COP', exchangeRate: 4150, symbol: '$', imageUrl: '/image/paises/co.png' },
    { name: 'PERU', code: 'PEN', exchangeRate: 3.85, symbol: 'S/', imageUrl: '/image/paises/pe.png' },
    { name: 'MEXICO', code: 'MXN', exchangeRate: 20, symbol: '$', imageUrl: '/image/paises/mx.png' },
    { name: 'ESTADOS UNIDOS', code: 'USD', exchangeRate: 1.05, symbol: '$', imageUrl: '/image/paises/us.png' },
    { name: 'ARGENTINA', code: 'ARS', exchangeRate: 1320, symbol: '$', imageUrl: '/image/paises/ar.png' },
    { name: 'ECUADOR', code: 'USD', exchangeRate: 1.06, symbol: '$', imageUrl: '/image/paises/ec.png' },
    { name: 'CHILE', code: 'CLP', exchangeRate: 1010, symbol: '$', imageUrl: '/image/paises/cl.png' },
    { name: 'ESPAÑA', code: 'EUR', exchangeRate: 1.04, symbol: '€', imageUrl: '/image/paises/es.png' },
    { name: 'COSTA RICA', code: 'CRC', exchangeRate: 600, symbol: '₡', imageUrl: '/image/paises/cr.png' },
    { name: 'BOLIVIA', code: 'BOB', exchangeRate: 15.5, symbol: 'Bs', imageUrl: '/image/paises/bo.png' },
    { name: 'NICARAGUA', code: 'NIO', exchangeRate: 43.5, symbol: 'C$', imageUrl: '/image/paises/ni.png' }
];

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'GET') {
        try {
            // Intentar obtener tasas desde Google Sheets
            try {
                const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
                await doc.loadInfo();
                
                const ratesSheet = doc.sheetsByTitle['TasasCambio'];
                if (ratesSheet) {
                    const rows = await ratesSheet.getRows();
                    
                    // Combinar datos por defecto con tasas actualizadas
                    const updatedCountryData = defaultCountryData.map(country => {
                        const updatedRate = rows.find(row => row.get('Pais') === country.name);
                        if (updatedRate) {
                            return {
                                ...country,
                                exchangeRate: parseFloat(updatedRate.get('TasaCambio'))
                            };
                        }
                        return country;
                    });
                    
                    return res.status(200).json(updatedCountryData);
                }
            } catch (sheetsError) {
                console.log('No se pudo acceder a Google Sheets, usando datos por defecto:', sheetsError.message);
            }
            
            // Fallback: usar datos por defecto
            res.status(200).json(defaultCountryData);
            
        } catch (error) {
            console.error('Error al obtener tasas de cambio:', error);
            res.status(500).json({ error: 'Error al obtener tasas de cambio' });
        }
    } else {
        res.status(405).json({ error: 'Método no permitido' });
    }
}