const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const sheetsService = require('./sheets-config');

// Configuración de autenticación
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: Obtener pedidos pendientes
    if (req.method === 'GET') {
      const serviceAccountAuth = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_SHEETS_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
      await doc.loadInfo();

      const pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
      if (!pendingOrdersSheet) {
        return res.status(200).json([]);
      }

      const rows = await pendingOrdersSheet.getRows();
      
      const orders = rows.map((row, index) => {
          try {
              return {
                  rowNumber: index + 2,
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
      }).filter(order => order !== null);

      const { fecha } = req.query;
      let filteredOrders = orders;
      
      if (fecha) {
        const filterDate = new Date(fecha);
        const targetDate = `${String(filterDate.getDate()).padStart(2, '0')}/${String(filterDate.getMonth() + 1).padStart(2, '0')}/${filterDate.getFullYear()}`;
        
        filteredOrders = orders.filter(order => {
          const orderDateOnly = order.Fecha_Hora.split(' ')[0];
          return orderDateOnly === targetDate;
        });
      }

      filteredOrders.sort((a, b) => new Date(b.Fecha_Hora) - new Date(a.Fecha_Hora));
      
      res.status(200).json(filteredOrders);
    }
    
    // POST: Crear pedido pendiente
    else if (req.method === 'POST') {
      const {
        sellerName, gameName, itemLabel, amountUSD, totalPrice,
        currencySymbol, playerId, playerName, playerEmail, countryName
      } = req.body;

      if (!sellerName || !gameName || !itemLabel || !amountUSD || !playerName) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      const serviceAccountAuth = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_SHEETS_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
      await doc.loadInfo();

      let pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
      if (!pendingOrdersSheet) {
        pendingOrdersSheet = await doc.addSheet({
          title: 'Pedidos_Pendientes',
          headerValues: [
            'ID_Pedido', 'Fecha_Hora', 'Vendedor', 'Juego', 'Artículo',
            'Monto_USD', 'Precio_Total', 'Moneda', 'ID_Jugador',
            'Nombre_Jugador', 'Email_Jugador', 'País', 'Estado'
          ]
        });
      }

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const now = new Date();
      const caracasTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Caracas"}));
      
      const day = String(caracasTime.getDate()).padStart(2, '0');
      const month = String(caracasTime.getMonth() + 1).padStart(2, '0');
      const year = caracasTime.getFullYear();
      const hours = String(caracasTime.getHours()).padStart(2, '0');
      const minutes = String(caracasTime.getMinutes()).padStart(2, '0');
      const seconds = String(caracasTime.getSeconds()).padStart(2, '0');
      
      const formattedDateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      
      const orderData = {
          'ID_Pedido': orderId,
          'Fecha_Hora': formattedDateTime,
          'Vendedor': sellerName,
          'Juego': gameName,
          'Artículo': itemLabel,
          'Monto_USD': parseFloat(amountUSD).toFixed(2),
          'Precio_Total': totalPrice,
          'Moneda': currencySymbol,
          'ID_Jugador': playerId || 'N/A',
          'Nombre_Jugador': playerName,
          'Email_Jugador': playerEmail || 'N/A',
          'País': countryName,
          'Estado': 'Pendiente'
      };

      await pendingOrdersSheet.addRow(orderData);
      
      res.status(200).json({ 
        success: true, 
        message: 'Pedido registrado exitosamente. Será procesado por el administrador.',
        orderId: orderId,
        data: orderData
      });
    }
    
    // DELETE: Eliminar pedido pendiente
    else if (req.method === 'DELETE') {
      const { orderId, rowNumber } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Datos incompletos: se requiere orderId' });
      }
      
      const result = await sheetsService.deletePendingOrder(orderId, rowNumber);
      
      if (result.success) {
        res.status(200).json({ 
          success: true,
          message: `Pedido ${orderId} eliminado correctamente` 
        });
      } else {
        res.status(500).json({ error: result.message });
      }
    }
    
    else {
      return res.status(405).json({ error: 'Método no permitido' });
    }
    
  } catch (error) {
    console.error('Error en pending-orders:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};