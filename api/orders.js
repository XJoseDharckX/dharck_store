const { getGoogleSheet, SELLER_SHEET_MAPPING } = require('./sheets-config');
const sheetsService = require('./sheets-config');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: Obtener órdenes
    if (req.method === 'GET') {
      const doc = await getGoogleSheet();
      const allOrders = [];
      
      for (const [sellerName, sheetName] of Object.entries(SELLER_SHEET_MAPPING)) {
        try {
          const sheet = doc.sheetsByTitle[sheetName];
          if (!sheet) {
            console.log(`Hoja no encontrada: ${sheetName}`);
            continue;
          }
          
          const rows = await sheet.getRows();
          
          const sellerOrders = rows.map(row => ({
            timestamp: row.get('📦Fecha_hora') || new Date().toISOString(),
            game: row.get('📦Juego') || 'N/A',
            amount: row.get('📦Articulo') || 'N/A',
            quantity: row.get('📦Cantidad') || 1,
            totalPrice: row.get('📦Monto_total') || 'N/A',
            seller: sellerName,
            playerName: 'N/A',
            email: 'N/A',
            status: 'pending'
          }));
          
          allOrders.push(...sellerOrders);
          
        } catch (error) {
          console.error(`Error procesando hoja ${sheetName}:`, error);
          continue;
        }
      }
      
      allOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.status(200).json(allOrders);
    }
    
    // DELETE: Eliminar orden
    else if (req.method === 'DELETE') {
      const { rowNumber, sellerName } = req.body;
      
      if (!rowNumber || !sellerName) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }
      
      const result = await sheetsService.deleteOrder(rowNumber, sellerName);
      
      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        res.status(500).json({ error: result.message });
      }
    }
    
    // PUT: Actualizar orden
    else if (req.method === 'PUT') {
      const { rowNumber, status } = req.body;
      
      if (!rowNumber || !status) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }
      
      const result = await sheetsService.updateOrderStatus(rowNumber, status);
      
      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        res.status(500).json({ error: result.message });
      }
    }
    
    else {
      return res.status(405).json({ error: 'Método no permitido' });
    }
    
  } catch (error) {
    console.error('Error en orders:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};