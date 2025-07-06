const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { getSellerSheet } = require('./sheets-config');

// Configuración de autenticación
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Configuración de ganancias por defecto
const ARTICLE_PROFIT_CONFIG = {
  // LORDS MOBILE
  'PASE SEMANAL': 0.25,
  'PASE MENSUAL': 0.7,
  '209💎': 0.25,
  '524💎': 0.30,
  '1048💎': 0.40,
  '2096💎': 0.70,
  '3144💎': 1.00,
  '5240💎': 2.00,
  '6812💎': 3.00,
  '9956💎': 6.00,
  '19912💎': 8.00,
  '30392💎': 10.00,
  '50304💎': 18.00,
  
  // LORDS MOBILE PROMOCION
  '💎499+CUPON': 0.25,
  '💎999+CUPON': 0.50,
  '💎1999+CUPON': 0.70,
  '💎2499+CUPON': 0.70,
  '💎2999+CUPON': 0.70,
  '💎4999+CUPON': 0.70,
  '💎9999+CUPON': 0.70,
  
  // BLOOD STRIKE
  '100+5': 0.10,
  '300+20': 0.20,
  '500+40': 0.50,
  '1000+100': 1.00,
  '2000+200': 1.50,
  '5000+800': 1.50,
  'PASE ELITE': 0.30,
  'PASE PREMIUM': 1.00,
  'PASE DE NIVEL': 0.20,
  
  // FREE FIRE
  '💎100+10': 0.10,
  '💎200+20': 0.20,
  '💎310+31': 0.30,
  '💎520+52': 0.40,
  '💎1069+106': 0.50,
  '💎2180+218': 1.50,
  '💎5600+560': 3.00,
  '💎SEMANAL': 0.20,
  '💎MENSUAL': 0.40,

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
  '80 CP': 0.20,
  '420 CP': 0.50,
  '880 CP': 0.70,
  '2400 CP': 0.70,
  '5000 CP': 1.50,
  '10800 CP': 4.00,
  
  'DEFAULT': 0.50
};

// Configuración de ganancias personalizadas para XJoseDharckX
const XJOSEDHARCKX_PROFIT_CONFIG = {
  // LORDS MOBILE - Ganancias personalizadas para XJoseDharckX
  'PASE SEMANAL': 0.30,
  'PASE MENSUAL': 0.90,
  '209💎': 0.30,
  '524💎': 0.40,
  '1048💎': 0.50,
  '2096💎': 1.00,
  '3144💎': 2.00,
  '5240💎': 3.00,
  '6812💎': 4.00,
  '9956💎': 8.00,
  '19912💎': 10.00,
  '30392💎': 15.00,
  '50304💎': 23.00,
  
  // LORDS MOBILE PROMOCION (CORREGIDO - usar labels exactos de index.html)
  '💎499+CUPON': 0.40,
  '💎999+CUPON': 1.00,
  '💎1999+CUPON': 1.00,
  '💎2499+CUPON': 1.00,
  '💎2999+CUPON': 1.00,
  '💎4999+CUPON': 1.00,
  '💎9999+CUPON': 1.00,
  
  // BLOOD STRIKE
  '100+5': 0.20,
  '300+20': 0.50,
  '500+40': 1.00,
  '1000+100': 1.80,
  '2000+200': 4.30,
  '5000+800': 9.00,
  'PASE ELITE': 0.50,
  'PASE PREMIUM': 1.60,
  'PASE DE NIVEL': 0.50,
  
  // FREE FIRE
  '💎100+10': 0.10,
  '💎200+20': 0.60,
  '💎310+31': 0.40,
  '💎520+52': 0.80,
  '💎1069+106': 1.30,
  '💎2180+218': 3.00,
  '💎5600+560': 5.00,
  '💎SEMANAL': 0.60,
  '💎MENSUAL': 1.00,

  // GENSHIN IMPACT
  'PASE LUNAR': 1.00,
  '60': 0.15,
  '300+30': 1.00,
  '980+110': 2.00,
  '1980+260': 3.00,
  '3280+600': 8.80,
  '6480+1600': 16.80,
  
  // PUBG MOBILE
  '60': 0.10,
  '300+25': 1.00,
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
  '80 CP': 0.20,
  '420 CP': 0.80,
  '880 CP': 0.80,
  '2400 CP': 0.80,
  '5000 CP': 4.40,
  '10800 CP': 9.50,
  
  // Ganancia por defecto si no se encuentra el artículo específico
  'DEFAULT': 0.50
};

// Función para obtener la configuración de ganancias según el vendedor
function getProfitConfig(vendedor) {
  if (vendedor === 'XJoseDharckX') {
    return XJOSEDHARCKX_PROFIT_CONFIG;
  }
  return ARTICLE_PROFIT_CONFIG;
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
    const { orderId, rowNumber } = req.body;

    if (!orderId || !rowNumber) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Configurar autenticación JWT
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_SHEETS_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Conectar al documento
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // Obtener la hoja de pedidos pendientes
    const pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    if (!pendingOrdersSheet) {
      return res.status(404).json({ error: 'Hoja de pedidos pendientes no encontrada' });
    }

    // Obtener la fila específica
    const rows = await pendingOrdersSheet.getRows();
    const orderRow = rows[rowNumber - 2]; // -2 porque rowNumber incluye header

    if (!orderRow) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Obtener datos del pedido
    const orderData = {
      vendedor: orderRow.get('Vendedor'),
      juego: orderRow.get('Juego'),
      articulo: orderRow.get('Artículo'),
      montoUSD: orderRow.get('Monto_USD')
    };

    // 1. Registrar en la hoja del vendedor
    const sellerSheet = await getSellerSheet(orderData.vendedor);
    
    // Obtener configuración de ganancias específica del vendedor
    const profitConfig = getProfitConfig(orderData.vendedor);
    
    // Calcular ganancia usando la configuración específica
    const ganancia = profitConfig[orderData.articulo] || profitConfig['DEFAULT'];
    
    const saleData = {
      '📦Juego': orderData.juego,
      '📦Articulo': orderData.articulo, // Corregido: sin tilde
      '📦Cantidad': 1,
      '📦Monto_total': orderData.montoUSD,
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

    await sellerSheet.addRow(saleData);

    // 2. Actualizar estado en pedidos pendientes
    orderRow.set('Estado', 'Entregado');
    await orderRow.save();

    console.log(`Pedido ${orderId} marcado como entregado y registrado en Excel`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Pedido marcado como entregado y registrado en Excel exitosamente',
      orderId: orderId
    });
    
  } catch (error) {
    console.error('Error al marcar pedido como entregado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};