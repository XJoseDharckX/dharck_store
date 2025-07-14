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
            // Obtener o crear la hoja 'Juegos'
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
            
            // Si la hoja está vacía, llenarla con los juegos iniciales
            if (rows.length === 0) {
                await populateInitialGames(gamesSheet);
                // Recargar las filas después de llenar
                const newRows = await gamesSheet.getRows();
                return res.status(200).json(convertRowsToGameConfig(newRows));
            }
            
            // Convertir filas a configuración de juegos
            const gameConfig = convertRowsToGameConfig(rows);
            res.status(200).json(gameConfig);
            
        } else if (req.method === 'POST') {
            // Actualizar configuración desde el panel
            const gameConfig = req.body;
            
            let gamesSheet;
            try {
                gamesSheet = doc.sheetsByTitle['Juegos'];
            } catch {
                gamesSheet = await doc.addSheet({
                    title: 'Juegos',
                    headerValues: ['Juego', 'articulo', 'precio', 'on/off', 'promocion_on/off']
                });
            }
            
            // Limpiar hoja existente
            await gamesSheet.clear();
            await gamesSheet.setHeaderRow(['Juego', 'articulo', 'precio', 'on/off', 'promocion_on/off']);
            
            // Agregar todas las configuraciones
            const rowsToAdd = [];
            Object.keys(gameConfig).forEach(gameName => {
                const game = gameConfig[gameName];
                game.articles.forEach(article => {
                    rowsToAdd.push({
                        'Juego': gameName,
                        'articulo': article.label,
                        'precio': article.value,
                        'on/off': article.active ? 'on' : 'off',
                        'promocion_on/off': article.promotion ? 'on' : 'off'
                    });
                });
            });
            
            if (rowsToAdd.length > 0) {
                await gamesSheet.addRows(rowsToAdd);
            }
            
            res.status(200).json({ success: true, message: 'Configuración guardada exitosamente' });
        }
    } catch (error) {
        console.error('Error en articles-config:', error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
};

// Función para llenar juegos iniciales
async function populateInitialGames(sheet) {
    const initialGames = {
        'LORDS MOBILE': {
            logoUrl: '/image/lm1.png',
            inputRequirement: 'id_name',
            articles: [
                { label: '💎499+CUPON', value: 5.20, active: true, promotion: false },
                { label: '💎999+CUPON', value: 12.00, active: true, promotion: false },
                { label: '💎1999+CUPON', value: 20.00, active: true, promotion: false },
                { label: '💎2499+CUPON', value: 25.50, active: true, promotion: false },
                { label: '💎2999+CUPON', value: 30.00, active: true, promotion: false },
                { label: '💎4999+CUPON', value: 48.50, active: true, promotion: false },
                { label: '💎9999+CUPON', value: 95.00, active: true, promotion: false },
                { label: 'PASE SEMANAL', value: 2.30, active: true, promotion: false },
                { label: 'PASE MENSUAL', value: 19.90, active: true, promotion: false },
                { label: '209💎', value: 2.30, active: true, promotion: false },
                { label: '524💎', value: 5.20, active: true, promotion: false },
                { label: '1048💎', value: 10.00, active: true, promotion: false },
                { label: '2096💎', value: 19.50, active: true, promotion: false },
                { label: '3144💎', value: 29.00, active: true, promotion: false },
                { label: '5240💎', value: 48.00, active: true, promotion: false },
                { label: '6812💎', value: 62.00, active: true, promotion: false },
                { label: '9956💎', value: 92.00, active: true, promotion: false },
                { label: '19912💎', value: 178.00, active: true, promotion: false },
                { label: '30392💎', value: 270.00, active: true, promotion: false },
                { label: '50304💎', value: 440.00, active: true, promotion: false }
            ]
        },
        'BLOOD STRIKE': {
            logoUrl: '/image/bs.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '100+5', value: 0.89, active: true, promotion: false },
                { label: '300+20', value: 2.50, active: true, promotion: false },
                { label: '500+40', value: 4.30, active: true, promotion: false },
                { label: '1000+100', value: 8.50, active: true, promotion: false },
                { label: '2000+200', value: 17.60, active: true, promotion: false },
                { label: '5000+800', value: 42.00, active: true, promotion: false },
                { label: 'PASE ELITE', value: 3.50, active: true, promotion: false },
                { label: 'PASE PREMIUM', value: 8.51, active: true, promotion: false },
                { label: 'PASE DE NIVEL', value: 2.00, active: true, promotion: false }
            ]
        },
        'FREE FIRE': {
            logoUrl: '/image/ffm.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '💎SEMANAL', value: 1.80, active: true, promotion: false },
                { label: '💎MENSUAL', value: 9.50, active: true, promotion: false },
                { label: '💎100+10', value: 0.99, active: true, promotion: false },
                { label: '💎200+20', value: 1.90, active: true, promotion: false },
                { label: '💎310+31', value: 2.80, active: true, promotion: false },
                { label: '💎520+52', value: 4.60, active: true, promotion: false },
                { label: '💎1069+106', value: 9.50, active: true, promotion: false },
                { label: '💎2180+218', value: 18.00, active: true, promotion: false },
                { label: '💎5600+560', value: 40.00, active: true, promotion: false }
            ]
        },
        'GENSHIN IMPACT': {
            logoUrl: '/image/gi.png',
            inputRequirement: 'id_server',
            articles: [
                { label: 'PASE LUNAR', value: 4.8, active: true, promotion: false },
                { label: '60', value: 0.90, active: true, promotion: false },
                { label: '300+30', value: 4.70, active: true, promotion: false },
                { label: '980+110', value: 13.00, active: true, promotion: false },
                { label: '1980+260', value: 27.00, active: true, promotion: false },
                { label: '3280+600', value: 45.50, active: true, promotion: false },
                { label: '6480+1600', value: 90.00, active: true, promotion: false }
            ]
        },
        'PUBG MOBILE': {
            logoUrl: '/image/pm.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '60', value: 0.99, active: true, promotion: false },
                { label: '300+25', value: 4.85, active: true, promotion: false },
                { label: '600+60', value: 9.00, active: true, promotion: false },
                { label: '1500+300', value: 23.00, active: true, promotion: false },
                { label: '3000+850', value: 45.00, active: true, promotion: false },
                { label: '6000+2100', value: 92.00, active: true, promotion: false }
            ]
        },
        'MOBILE LEGENDS': {
            logoUrl: '/image/ml.png',
            inputRequirement: 'id_server_name',
            articles: [
                { label: 'PASE SEMANAL ML', value: 1.60, active: true, promotion: false },
                { label: 'CREPUSCULAR', value: 9.50, active: true, promotion: false },
                { label: '50+5💎', value: 0.90, active: true, promotion: false },
                { label: '150+15💎', value: 2.80, active: true, promotion: false },
                { label: '250+25💎', value: 4.40, active: true, promotion: false },
                { label: '500+65💎', value: 8.30, active: true, promotion: false },
                { label: '625+81💎', value: 10.00, active: true, promotion: false },
                { label: '940+144💎', value: 18.00, active: true, promotion: false },
                { label: '1860+335💎', value: 27.50, active: true, promotion: false },
                { label: '3099+589💎', value: 44.20, active: true, promotion: false },
                { label: '4649+883💎', value: 65.40, active: true, promotion: false },
                { label: '7740+1548💎', value: 110.00, active: true, promotion: false }
            ]
        },
        'CALL OF DUTY MOBILE': {
            logoUrl: '/image/codm.png',
            inputRequirement: 'cod_full',
            articles: [
                { label: '80 CP', value: 1.50, active: true, promotion: false },
                { label: '420 CP', value: 5.50, active: true, promotion: false },
                { label: '880 CP', value: 11.00, active: true, promotion: false },
                { label: '2400 CP', value: 26.00, active: true, promotion: false },
                { label: '5000 CP', value: 55.00, active: true, promotion: false },
                { label: '10800 CP', value: 110.00, active: true, promotion: false }
            ]
        },
        'DELTA FORCE STEAM': {
            logoUrl: '/image/dfss.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '60 Coins', value: 0.99, active: true, promotion: false },
                { label: '300+20 Coins', value: 4.70, active: true, promotion: false },
                { label: '420+40 Coins', value: 6.80, active: true, promotion: false },
                { label: '680+70 Coins', value: 9.00, active: true, promotion: false },
                { label: '1280+200 Coins', value: 17.00, active: true, promotion: false },
                { label: '1680+300 Coins', value: 21.00, active: true, promotion: false },
                { label: '3280+670 Coins', value: 40.00, active: true, promotion: false },
                { label: '6480+1620 Coins', value: 80.00, active: true, promotion: false },
                { label: '12960+3240 Coins', value: 174.00, active: true, promotion: false },
                { label: '19440+4860 Coins', value: 260.00, active: true, promotion: false }
            ]
        },
        'DELTA FORCE GARENA': {
            logoUrl: '/image/dfsg.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '60 Coins', value: 0.99, active: true, promotion: false },
                { label: '300+36 Coins', value: 4.80, active: true, promotion: false },
                { label: '420+62 Coins', value: 7.00, active: true, promotion: false },
                { label: '680+105 Coins', value: 9.60, active: true, promotion: false },
                { label: '1280+264 Coins', value: 19.00, active: true, promotion: false },
                { label: '1680+385 Coins', value: 23.50, active: true, promotion: false },
                { label: '3280+834 Coins', value: 45.00, active: true, promotion: false },
                { label: '6480+1944 Coins', value: 88.00, active: true, promotion: false },
                { label: '12960+3888 Coins', value: 180.00, active: true, promotion: false },
                { label: '19440+5832 Coins', value: 270.00, active: true, promotion: false }
            ]
        }
    };
    
    const rowsToAdd = [];
    Object.keys(initialGames).forEach(gameName => {
        const game = initialGames[gameName];
        game.articles.forEach(article => {
            rowsToAdd.push({
                'Juego': gameName,
                'articulo': article.label,
                'precio': article.value,
                'on/off': article.active ? 'on' : 'off',
                'promocion_on/off': article.promotion ? 'on' : 'off'
            });
        });
    });
    
    if (rowsToAdd.length > 0) {
        await sheet.addRows(rowsToAdd);
    }
}

// Función para convertir filas a configuración de juegos
function convertRowsToGameConfig(rows) {
    const gameConfig = {};
    
    rows.forEach(row => {
        const gameName = row.Juego;
        const isActive = row['on/off'] && row['on/off'].toLowerCase() === 'on';
        const hasPromotion = row['promocion_on/off'] && row['promocion_on/off'].toLowerCase() === 'on';
        
        if (gameName && row.articulo && row.precio) {
            if (!gameConfig[gameName]) {
                gameConfig[gameName] = {
                    logoUrl: getGameLogo(gameName),
                    inputRequirement: getInputRequirement(gameName),
                    articles: []
                };
            }
            
            gameConfig[gameName].articles.push({
                label: row.articulo,
                value: parseFloat(row.precio) || 0,
                imageUrl: '/image/prize-2.png',
                active: isActive,
                promotion: hasPromotion
            });
        }
    });
    
    return gameConfig;
}

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
        'DELTA FORCE GARENA': 'id_only',
        'CALL OF DUTY MOBILE': 'cod_full',
        'MOBILE LEGENDS': 'id_server_name',
        'FREE FIRE': 'id_only',
        'PUBG MOBILE': 'id_only',
        'GENSHIN IMPACT': 'id_server',
        'LORDS MOBILE': 'id_name',
        'BLOOD STRIKE': 'id_only',
        'DELTA FORCE STEAM': 'id_only'
    };
    return requirements[gameName.toUpperCase()] || 'id_only';
}