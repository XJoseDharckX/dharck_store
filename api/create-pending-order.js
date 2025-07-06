const { getGoogleSheet } = require('./sheets-config');
const moment = require('moment');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      country,
      game,
      item,
      quantity,
      totalAmount,
      playerName,
      playerId,
      playerEmail,
      playerPassword,
      seller,
      paymentProofPath
    } = req.body;

    // Validar campos requeridos (removemos paymentProofPath como requerido)
    if (!country || !game || !item || !quantity || !totalAmount || 
        !playerName || !playerId || !seller) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const doc = await getGoogleSheet();
    
    // Buscar o crear hoja "Pedidos_Pendientes"
    let pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    if (!pendingOrdersSheet) {
      pendingOrdersSheet = await doc.addSheet({
        title: 'Pedidos_Pendientes',
        headerValues: [
          'ID', 'Fecha', 'País', 'Juego', 'Artículo', 'Cantidad', 
          'Monto Total', 'Nombre Jugador', 'ID Jugador', 'Email', 
          'Contraseña', 'Vendedor', 'Comprobante', 'Estado', 'Fecha Entrega'
        ]
      });
    }

    // Generar ID único
    const orderId = `ORD-${Date.now()}`;
    const currentDate = moment().format('DD/MM/YYYY HH:mm:ss');
    
    // Agregar nueva fila
    await pendingOrdersSheet.addRow({
      'ID': orderId,
      'Fecha': currentDate,
      'País': country,
      'Juego': game,
      'Artículo': item,
      'Cantidad': quantity,
      'Monto Total': totalAmount,
      'Nombre Jugador': playerName,
      'ID Jugador': playerId,
      'Email': playerEmail || '',
      'Contraseña': playerPassword || '',
      'Vendedor': seller,
      'Comprobante': paymentProofPath || 'Sin comprobante',
      'Estado': 'Pendiente',
      'Fecha Entrega': ''
    });

    // FUNCIÓN DEL BOT DESHABILITADA TEMPORALMENTE
    // console.log('Notificación del bot deshabilitada temporalmente');

    res.status(200).json({
      success: true,
      orderId,
      message: 'Pedido creado exitosamente (sin notificación del bot)'
    });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}