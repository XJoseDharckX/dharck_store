const { getGoogleSheet, SELLER_SHEET_MAPPING } = require('./sheets-config');

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
    const doc = await getGoogleSheet();
    const allOrders = [];
    
    // Obtener datos de todas las hojas de vendedores
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
          amount: row.get('📦Artículo') || 'N/A',
          quantity: row.get('📦Cantidad') || 1,
          totalPrice: row.get('📦Monto_total') || 'N/A',
          seller: sellerName,
          playerName: 'N/A', // No disponible en la estructura actual
          email: 'N/A', // No disponible en la estructura actual
          status: 'pending' // Estado por defecto
        }));
        
        allOrders.push(...sellerOrders);
        
      } catch (error) {
        console.error(`Error procesando hoja ${sheetName}:`, error);
        continue;
      }
    }
    
    // Ordenar por fecha (más recientes primero)
    allOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.status(200).json(allOrders);
    
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};