const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Configuración de autenticación
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SHEETS_CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const GOOGLE_SHEETS_DOCUMENT_ID = process.env.GOOGLE_SHEETS_DOCUMENT_ID;

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Configurar autenticación JWT
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SHEETS_CLIENT_EMAIL,
      key: GOOGLE_SHEETS_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Conectar al documento
    const doc = new GoogleSpreadsheet(GOOGLE_SHEETS_DOCUMENT_ID, serviceAccountAuth);
    await doc.loadInfo();

    // Obtener la hoja de pedidos pendientes
    const pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    if (!pendingOrdersSheet) {
      return res.status(200).json([]);
    }

    // Cargar todas las filas
    const rows = await pendingOrdersSheet.getRows();
    
    // Mapear los datos
    const orders = rows.map((row, index) => ({
      rowNumber: index + 2, // +2 porque las filas empiezan en 2 (1 es header)
      ID_Pedido: row.get('ID_Pedido') || '',
      Fecha_Hora: row.get('Fecha_Hora') || '',
      Vendedor: row.get('Vendedor') || '',
      Juego: row.get('Juego') || '',
      Artículo: row.get('Artículo') || '',
      Monto_USD: row.get('Monto_USD') || '',
      Precio_Total: row.get('Precio_Total') || '',
      Moneda: row.get('Moneda') || '',
      ID_Jugador: row.get('ID_Jugador') || '',
      Nombre_Jugador: row.get('Nombre_Jugador') || '',
      Email_Jugador: row.get('Email_Jugador') || '',
      País: row.get('País') || '',
      Estado: row.get('Estado') || 'Pendiente'
    }));

    // Filtrar por fecha si se proporciona
    const { fecha } = req.query;
    let filteredOrders = orders;
    
    if (fecha) {
      const targetDate = new Date(fecha).toLocaleDateString('es-ES');
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.Fecha_Hora).toLocaleDateString('es-ES');
        return orderDate === targetDate;
      });
    }

    // Ordenar por fecha (más recientes primero)
    filteredOrders.sort((a, b) => new Date(b.Fecha_Hora) - new Date(a.Fecha_Hora));
    
    res.status(200).json(filteredOrders);
    
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};