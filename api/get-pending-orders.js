const { getGoogleSheet } = require('./sheets-config');

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
    const pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    
    if (!pendingOrdersSheet) {
      return res.status(200).json({ orders: [] });
    }

    const rows = await pendingOrdersSheet.getRows();
    const orders = rows.map(row => ({
      id: row.get('ID_Pedido'),
      dateTime: row.get('Fecha_Hora'),
      seller: row.get('Vendedor'),
      game: row.get('Juego'),
      item: row.get('Artículo'),
      amountUSD: row.get('Monto_USD'),
      totalPrice: row.get('Precio_Total'),
      currency: row.get('Moneda'),
      playerId: row.get('ID_Jugador'),
      playerName: row.get('Nombre_Jugador'),
      playerEmail: row.get('Email_Jugador'),
      country: row.get('País'),
      paymentProof: row.get('Comprobante_Pago'),
      status: row.get('Estado'),
      rowNumber: row.rowNumber
    }));

    res.status(200).json({ orders });
    
  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};