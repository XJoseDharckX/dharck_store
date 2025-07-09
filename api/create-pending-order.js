const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Configuración de autenticación
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

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
      amountUSD,
      totalPrice,
      currencySymbol,
      playerId,
      playerName,
      playerEmail,
      countryName
    } = req.body;

    // Validar datos requeridos
    if (!sellerName || !gameName || !itemLabel || !amountUSD || !playerName) {
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

    // Buscar o crear la hoja de pedidos pendientes
    let pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    if (!pendingOrdersSheet) {
      pendingOrdersSheet = await doc.addSheet({
        title: 'Pedidos_Pendientes',
        headerValues: [
          'ID_Pedido',
          'Fecha_Hora',
          'Vendedor',
          'Juego',
          'Artículo',
          'Monto_USD',
          'Precio_Total',
          'Moneda',
          'ID_Jugador',
          'Nombre_Jugador',
          'Email_Jugador',
          'País',
          'Estado'
        ]
      });
    }

    // Generar ID único para el pedido
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Preparar datos del pedido con mejor formato de fecha
    const now = new Date();
    const caracasTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Caracas"}));
    
    const orderData = {
        'ID_Pedido': orderId,
        'Fecha_Hora': caracasTime.toLocaleString('es-ES', { 
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        'Vendedor': sellerName,
        'Juego': gameName,
        'Artículo': itemLabel,
        'Monto_USD': parseFloat(amountUSD).toFixed(2), // Asegurar formato numérico
        'Precio_Total': totalPrice,
        'Moneda': currencySymbol,
        'ID_Jugador': playerId || 'N/A',
        'Nombre_Jugador': playerName,
        'Email_Jugador': playerEmail || 'N/A',
        'País': countryName,
        'Estado': 'Pendiente'
    };

    // Agregar la fila a la hoja
    await pendingOrdersSheet.addRow(orderData);
    
    console.log(`Pedido pendiente creado:`, orderData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Pedido registrado exitosamente. Será procesado por el administrador.',
      orderId: orderId,
      data: orderData
    });
    
  } catch (error) {
    console.error('Error al crear pedido pendiente:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};