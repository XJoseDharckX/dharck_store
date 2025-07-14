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
            // Leer desde la hoja 'Juegos'
            let gamesSheet;
            try {
                gamesSheet = doc.sheetsByTitle['Juegos'];
            } catch {
                // Crear hoja si no existe
                gamesSheet = await doc.addSheet({
                    title: 'Juegos',
                    headerValues: ['Juego', 'articulo', 'precio', 'on/off', 'promocion_on/off']
                });
            }
            
            const rows = await gamesSheet.getRows();
            const gameOptions = {};
            
            rows.forEach(row => {
                const gameName = row.Juego;
                const isActive = row['on/off'] && row['on/off'].toLowerCase() === 'on';
                const hasPromotion = row['promocion_on/off'] && row['promocion_on/off'].toLowerCase() === 'on';
                
                // Solo incluir artículos activos
                if (isActive && gameName && row.articulo && row.precio) {
                    if (!gameOptions[gameName]) {
                        gameOptions[gameName] = {
                            name: gameName,
                            logoUrl: getGameLogo(gameName),
                            inputRequirement: getInputRequirement(gameName),
                            amounts: [],
                            active: true
                        };
                    }
                    
                    gameOptions[gameName].amounts.push({
                        name: row.articulo,
                        price: parseFloat(row.precio) || 0,
                        promotion: hasPromotion
                    });
                }
            });
            
            res.status(200).json(gameOptions);
            
        } else if (req.method === 'POST') {
            // Para futuras actualizaciones desde el panel
            res.status(200).json({ success: true, message: 'Use la hoja Juegos para modificar artículos' });
        }
    } catch (error) {
        console.error('Error en articles-config:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
};

// Función para obtener el logo del juego
function getGameLogo(gameName) {
    const logos = {
        'DELTA FORCE GARENA': '/image/dfsg.png',
        'CALL OF DUTY MOBILE': '/image/codm.png',
        'MOBILE LEGENDS': '/image/ml.png',
        'FREE FIRE': '/image/ffm.png',
        'PUBG MOBILE': '/image/pm.png',
        'GENSHIN IMPACT': '/image/gi.png',
        'LORDS MOBILE': '/image/lm1.png',
        'BLOOD STRIKE': '/image/bs.png',
        'DELTA FORCE STEAM': '/image/dfss.png'
    };
    return logos[gameName.toUpperCase()] || '/image/logo.png';
}

// Función para obtener el requerimiento de input
function getInputRequirement(gameName) {
    const requirements = {
        'DELTA FORCE GARENA': 'ID de jugador',
        'CALL OF DUTY MOBILE': 'ID de jugador',
        'MOBILE LEGENDS': 'ID de jugador + Zona',
        'FREE FIRE': 'ID de jugador',
        'PUBG MOBILE': 'ID de jugador',
        'GENSHIN IMPACT': 'UID + Servidor',
        'LORDS MOBILE': 'ID de jugador',
        'BLOOD STRIKE': 'ID de jugador',
        'DELTA FORCE STEAM': 'ID de Steam'
    };
    return requirements[gameName.toUpperCase()] || 'ID de jugador';
}

// Guardar nueva configuración en Google Sheets
const gameArticlesConfig = req.body; // Cambiar esta línea

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