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
        if (sheet) {
          const rows = await sheet.getRows();
          
          const sellerOrders = rows.map(row => ({
            id: row.rowNumber,
            vendedor: sellerName,
            juego: row.get('📦Juego') || '',
            articulo: row.get('📦Artículo') || '',
            cantidad: row.get('📦Cantidad') || 1,
            monto_total: row.get('📦Monto_total') || 0,
            ganancia: row.get('📦Ganancia') || 0,
            fecha_hora: row.get('📦Fecha_hora') || ''
          }));
          
          allOrders.push(...sellerOrders);
        }
      } catch (sheetError) {
        console.warn(`Error al obtener datos de la hoja ${sheetName}:`, sheetError.message);
      }
    }
    
    // Ordenar por fecha (más recientes primero)
    allOrders.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
    
    res.status(200).json({ 
      success: true, 
      orders: allOrders,
      total: allOrders.length
    });
    
  } catch (error) {
    console.error('Error al obtener las órdenes:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};