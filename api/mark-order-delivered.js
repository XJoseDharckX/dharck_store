const { getGoogleSheet, getSellerSheet } = require('./sheets-config');
const moment = require('moment');

// Configuración de ganancias por artículo
const ARTICLE_PROFIT_CONFIG = {
  'Lords Mobile': {
    '💎120': 2,
    '💎300': 5,
    '💎500': 8,
    '💎1000': 15,
    '💎2000': 30,
    '💎5000': 75,
    '💎499+CUPON': 8,
    '🎯Elite': 5,
    '🎯Premium': 8,
    '⚡Mejora': 3,
    '📅7 días': 2,
    '📅30 días': 8
  },
  'Blood Strike': {
    '💎60': 1,
    '💎300': 5,
    '💎980': 15,
    '💎1980': 30,
    '💎3280': 50,
    '💎6480': 95
  },
  'Free Fire': {
    '💎100': 2,
    '💎310': 5,
    '💎520': 8,
    '💎1080': 15,
    '💎2200': 30,
    '💎5600': 75
  },
  'Genshin Impact': {
    '💎60': 1,
    '💎300': 5,
    '💎980': 15,
    '💎1980': 30,
    '💎3280': 50,
    '💎6480': 95
  },
  'PUBG Mobile': {
    '💎60': 1,
    '💎325': 5,
    '💎660': 10,
    '💎1800': 25,
    '💎3850': 50,
    '💎8100': 100
  },
  'Delta Force': {
    '💎300': 5,
    '💎980': 15,
    '💎1980': 30,
    '💎3280': 50,
    '💎6480': 95
  },
  'Call of Duty Mobile': {
    '💎80': 1,
    '💎400': 6,
    '💎800': 12,
    '💎2000': 28,
    '💎5200': 70
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'ID de pedido requerido' });
    }

    const doc = await getGoogleSheet();
    const pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    
    if (!pendingOrdersSheet) {
      return res.status(404).json({ error: 'Hoja de pedidos pendientes no encontrada' });
    }

    const rows = await pendingOrdersSheet.getRows();
    const orderRow = rows.find(row => row.get('ID') === orderId);
    
    if (!orderRow) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Obtener datos del pedido
    const orderData = {
      juego: orderRow.get('Juego'),
      articulo: orderRow.get('Artículo'),
      cantidad: parseInt(orderRow.get('Cantidad')),
      montoTotal: parseFloat(orderRow.get('Monto Total')),
      vendedor: orderRow.get('Vendedor'),
      nombreJugador: orderRow.get('Nombre Jugador')
    };

    // Calcular ganancia
    const profitPerUnit = ARTICLE_PROFIT_CONFIG[orderData.juego]?.[orderData.articulo] || 0;
    const totalProfit = profitPerUnit * orderData.cantidad;

    // Registrar venta en la hoja del vendedor
    try {
      const sellerSheet = await getSellerSheet(orderData.vendedor);
      const currentDate = moment().format('DD/MM/YYYY HH:mm:ss');
      
      await sellerSheet.addRow({
        'Juego': orderData.juego,
        'Artículo': orderData.articulo,
        'Cantidad': orderData.cantidad,
        'Monto Total': orderData.montoTotal,
        'Ganancia': totalProfit,
        'Fecha': currentDate
      });
    } catch (sellerSheetError) {
      console.error('Error registrando en hoja del vendedor:', sellerSheetError);
    }

    // Actualizar estado del pedido
    orderRow.set('Estado', 'Entregado');
    orderRow.set('Fecha Entrega', moment().format('DD/MM/YYYY HH:mm:ss'));
    await orderRow.save();

    // Enviar notificación de entrega
    try {
      await fetch('http://localhost:3001/api/delivery-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          game: orderData.juego,
          item: orderData.articulo,
          quantity: orderData.cantidad,
          seller: orderData.vendedor,
          playerName: orderData.nombreJugador
        })
      });
    } catch (notificationError) {
      console.error('Error enviando notificación de entrega:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Pedido marcado como entregado exitosamente'
    });

  } catch (error) {
    console.error('Error marcando pedido como entregado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}