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
                { label: 'PASE MENSUAL', value: 19.90, active: true, promotion: false }
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
                { label: '5000+800', value: 42.00, active: true, promotion: false }
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
                { label: '💎310+31', value: 2.80, active: true, promotion: false }
            ]
        },
        'GENSHIN IMPACT': {
            logoUrl: '/image/gi.png',
            inputRequirement: 'id_server',
            articles: [
                { label: 'PASE LUNAR', value: 4.8, active: true, promotion: false },
                { label: '60', value: 0.90, active: true, promotion: false },
                { label: '300+30', value: 4.70, active: true, promotion: false },
                { label: '980+110', value: 13.00, active: true, promotion: false }
            ]
        },
        'PUBG MOBILE': {
            logoUrl: '/image/pm.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '60', value: 0.99, active: true, promotion: false },
                { label: '300+25', value: 4.85, active: true, promotion: false },
                { label: '600+60', value: 9.00, active: true, promotion: false }
            ]
        },
        'MOBILE LEGENDS': {
            logoUrl: '/image/ml.png',
            inputRequirement: 'id_server_name',
            articles: [
                { label: 'PASE SEMANAL ML', value: 1.60, active: true, promotion: false },
                { label: 'CREPUSCULAR', value: 9.50, active: true, promotion: false },
                { label: '50+5💎', value: 0.90, active: true, promotion: false },
                { label: '150+15💎', value: 2.80, active: true, promotion: false }
            ]
        },
        'CALL OF DUTY MOBILE': {
            logoUrl: '/image/codm.png',
            inputRequirement: 'cod_full',
            articles: [
                { label: '80 CP', value: 1.50, active: true, promotion: false },
                { label: '420 CP', value: 5.50, active: true, promotion: false },
                { label: '880 CP', value: 11.00, active: true, promotion: false }
            ]
        },
        'DELTA FORCE STEAM': {
            logoUrl: '/image/dfss.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '60 Coins', value: 0.99, active: true, promotion: false },
                { label: '300+20 Coins', value: 4.70, active: true, promotion: false },
                { label: '420+40 Coins', value: 6.80, active: true, promotion: false }
            ]
        },
        'DELTA FORCE GARENA': {
            logoUrl: '/image/dfsg.png',
            inputRequirement: 'id_only',
            articles: [
                { label: '60 Coins', value: 0.99, active: true, promotion: false },
                { label: '300+36 Coins', value: 4.80, active: true, promotion: false },
                { label: '420+62 Coins', value: 7.00, active: true, promotion: false }
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
                imageUrl: '/image/prize-2.png', // Imagen por defecto
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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

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
};

// Función para obtener el requerimiento de input
function getInputRequirement(gameName) {
    const requirements = {
        'DELTA FORCE GARENA': 'ID de jugador',
        'CALL OF DUTY MOBILE': 'ID de jugador',
        'MO
