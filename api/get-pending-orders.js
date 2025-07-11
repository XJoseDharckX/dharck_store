const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Configuración de autenticación
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

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
      return res.status(200).json([]);
    }

    // Cargar todas las filas
    const rows = await pendingOrdersSheet.getRows();
    
    // Mapear los datos con mejor manejo de errores
    const orders = rows.map((row, index) => {
        try {
            return {
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
            };
        } catch (error) {
            console.error(`Error procesando fila ${index + 2}:`, error);
            return null;
        }
    }).filter(order => order !== null); // Filtrar órdenes nulas

    // Filtrar por fecha si se proporciona
    const { fecha } = req.query;
    let filteredOrders = orders;
    
    if (fecha) {
      // Convertir fecha del filtro (aaaa-mm-dd) a dd/mm/aaaa
      const filterDate = new Date(fecha);
      const targetDate = `${String(filterDate.getDate()).padStart(2, '0')}/${String(filterDate.getMonth() + 1).padStart(2, '0')}/${filterDate.getFullYear()}`;
      
      filteredOrders = orders.filter(order => {
        // Extraer solo la fecha de la orden (sin hora)
        const orderDateOnly = order.Fecha_Hora.split(' ')[0];
        return orderDateOnly === targetDate;
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