const { getSellerSheet } = require('./sheets-config');

// Configuración completa de ganancias por artículo específico (en USD)
const ARTICLE_PROFIT_CONFIG = {
  // LORDS MOBILE
  'PASE SEMANAL': 0.40,
  'PASE MENSUAL': 1.50,
  '209💎': 0.45,
  '524💎': 0.80,
  '1048💎': 1.20,
  '2096💎': 1.80,
  '3144💎': 2.50,
  '5240💎': 3.50,
  '6812💎': 4.20,
  '9956💎': 5.50,
  '19912💎': 10.00,
  '30392💎': 15.00,
  '50304💎': 22.00,
  
  // LORDS MOBILE PROMOCION (NUEVO)
  '💎499+20%': 0.80,
  '💎999+20%': 1.30,
  '💎1999+20%': 2.00,
  '💎2499+20%': 2.50,
  '💎2999+20%': 2.80,
  '💎4999+20%': 4.50,
  '💎9999+20%': 8.50,
  
  // BLOOD STRIKE
  '100+5': 0.25,
  '300+20': 0.40,
  '500+40': 0.60,
  '1000+100': 1.00,
  '2000+200': 1.50,
  '5000+800': 3.50,
  'PASE ELITE': 0.50,
  'PASE PREMIUM': 1.00,
  'PASE DE NIVEL': 0.35,
  
  // FREE FIRE
  '100💎': 0.30,
  '210💎': 0.40,
  '520💎': 0.60,
  '1080💎': 1.00,
  '2200💎': 1.50,
  '5600💎': 3.00,
  
  // GENSHIN IMPACT
  'PASE LUNAR': 0.70,
  '60': 0.25,
  '300+30': 0.50,
  '980+110': 1.20,
  '1980+260': 2.20,
  '3280+600': 3.80,
  '6480+1600': 7.50,
  
  // PUBG MOBILE
  '60': 0.25,
  '300+25': 0.50,
  '600+60': 0.85,
  '1500+300': 1.90,
  '3000+850': 3.80,
  '6000+2100': 7.00,
  
  // DELTA FORCE STEAM
  '60 Coins': 0.25,
  '300+20 Coins': 0.50,
  '420+40 Coins': 0.60,
  '680+70 Coins': 0.70,
  '1280+200 Coins': 1.20,
  '1680+300 Coins': 1.40,
  '3280+670 Coins': 2.50,
  '6480+1620 Coins': 4.00,
  '12960+3240 Coins': 8.00,
  '19440+4860 Coins': 12.00,
  
  // DELTA FORCE GARENA
  '300+36 Coins': 0.55,
  '420+62 Coins': 0.65,
  '680+105 Coins': 0.75,
  '1280+264 Coins': 1.30,
  '1680+385 Coins': 1.50,
  '3280+834 Coins': 2.70,
  '6480+1944 Coins': 4.50,
  '12960+3888 Coins': 9.00,
  '19440+5832 Coins': 13.50,
  
  // CALL OF DUTY MOBILE
  '80 CP': 0.35,
  '420 CP': 0.80,
  '880 CP': 1.20,
  '2400 CP': 2.00,
  '5000 CP': 3.50,
  '10800 CP': 6.00,
  
  // Ganancia por defecto si no se encuentra el artículo específico
  'DEFAULT': 0.50
};

// Función para verificar si un artículo está en promoción
function isArticleInPromotion(gameName, articleLabel) {
    const ACTIVE_PROMOTIONS = {
        'LORDS_MOBILE_PROMO': true,
        'FREE_FIRE_WEEKEND': false,
        'DELTA_FORCE_SPECIAL': false,
        'BLOOD_STRIKE_BONUS': false
    };
    
    const PROMOTION_CONFIG = {
        'LORDS MOBILE': {
            active: ACTIVE_PROMOTIONS.LORDS_MOBILE_PROMO,
            articles: ['209💎', '524💎', '1048💎', '2096💎', '3144💎']
        },
        'FREE FIRE': {
            active: ACTIVE_PROMOTIONS.FREE_FIRE_WEEKEND,
            articles: ['520💎', '1080💎', '2200💎']
        },
        'DELTA FORCE STEAM': {
            active: ACTIVE_PROMOTIONS.DELTA_FORCE_SPECIAL,
            articles: ['680+70 Coins', '1280+200 Coins', '1680+300 Coins']
        },
        'BLOOD STRIKE': {
            active: ACTIVE_PROMOTIONS.BLOOD_STRIKE_BONUS,
            articles: ['1000+100', '2000+200', '5000+800']
        }
    };
    
    const gamePromo = PROMOTION_CONFIG[gameName];
    return gamePromo && gamePromo.active && gamePromo.articles.includes(articleLabel);
}

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      sellerName,
      gameName,
      itemLabel,
      amountUSD, // Valor USD original del artículo
      totalPrice,
      currencySymbol,
      playerId,
      playerName,
      countryName
    } = req.body;

    // Validar datos requeridos
    if (!sellerName || !gameName || !itemLabel || !amountUSD) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Obtener la hoja del vendedor específico
    const sheet = await getSellerSheet(sellerName);
    
    // Calcular ganancia específica por artículo
    let ganancia = ARTICLE_PROFIT_CONFIG[itemLabel] || ARTICLE_PROFIT_CONFIG['DEFAULT'];
    
    // Aplicar bonus de ganancia si está en promoción
    if (isArticleInPromotion(gameName, itemLabel)) {
        ganancia = ganancia * 1.2; // 20% más de ganancia en promociones
    }
    
    // Preparar datos con indicador de promoción
    const rowData = {
        '📦Juego': gameName,
        '📦Artículo': itemLabel + (isArticleInPromotion(gameName, itemLabel) ? ' 🔥PROMO' : ''),
        '📦Cantidad': 1,
        '📦Monto_total': amountUSD,
        '📦Ganancia': ganancia,
        '📦Fecha_hora': new Date().toLocaleString('es-ES', { 
            timeZone: 'America/Caracas',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };

    // Agregar la fila a la hoja
    await sheet.addRow(rowData);
    
    console.log(`Venta registrada para ${sellerName}:`, rowData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Venta registrada exitosamente',
      seller: sellerName,
      data: {
        ...rowData,
        // No incluir ganancia real en la respuesta por privacidad
        '📦Ganancia': '[PRIVADO]'
      }
    });
    
  } catch (error) {
    console.error('Error al registrar la venta:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};