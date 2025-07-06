const { getGoogleSheet } = require('./sheets-config');
const moment = require('moment');

// Función para convertir el nombre del artículo al formato deseado
function formatArticleName(item) {
  // Mapeo de nombres actuales a formato "número+bonus"
  const articleMapping = {
    // LORDS MOBILE
    '209💎': '100+10',
    '524💎': '300+20', 
    '1048💎': '500+40',
    '2096💎': '1000+100',
    '3144💎': '2000+200',
    '5240💎': '5000+800',
    'PASE SEMANAL': 'PASE SEMANAL',
    'PASE MENSUAL': 'PASE MENSUAL',
    
    // BLOOD STRIKE
    '100+5🧈': '100+5',
    '300+20🧈': '300+20',
    '500+40🧈': '500+40',
    '1000+100🧈': '1000+100',
    '2000+200🧈': '2000+200',
    '5000+800🧈': '5000+800',
    'PASE ELITE🧈': 'PASE ELITE',
    'PASE PREMIUM🧈': 'PASE PREMIUM',
    'PASE DE NIVEL🧈': 'PASE DE NIVEL',
    
    // FREE FIRE
    '💎100+10': '100+10',
    '💎200+20': '200+20',
    '💎310+31': '310+31',
    '💎520+52': '520+52',
    '💎1069+106': '1069+106',
    '💎2180+218': '2180+218',
    '💎5600+560': '5600+560',
    '💎SEMANAL': 'PASE SEMANAL',
    '💎MENSUAL': 'PASE MENSUAL',
    
    // GENSHIN IMPACT
    '60': '60+0',
    '300+30': '300+30',
    '980+110': '980+110',
    '1980+260': '1980+260',
    '3280+600': '3280+600',
    '6480+1600': '6480+1600',
    'PASE LUNAR': 'PASE LUNAR',
    
    // PUBG MOBILE
    '60': '60+0',
    '300+25': '300+25',
    '600+60': '600+60',
    '1500+300': '1500+300',
    '3000+850': '3000+850',
    '6000+2100': '6000+2100',
    
    // DELTA FORCE STEAM
    '60 Coins': '60+0',
    '300+20 Coins': '300+20',
    '420+40 Coins': '420+40',
    '680+70 Coins': '680+70',
    '1280+200 Coins': '1280+200',
    '1680+300 Coins': '1680+300',
    '3280+670 Coins': '3280+670',
    '6480+1620 Coins': '6480+1620',
    '12960+3240 Coins': '12960+3240',
    '19440+4860 Coins': '19440+4860',
    
    // DELTA FORCE GARENA
    '300+36 Coins': '300+36',
    '420+62 Coins': '420+62',
    '680+105 Coins': '680+105',
    '1280+264 Coins': '1280+264',
    '1680+385 Coins': '1680+385',
    '3280+834 Coins': '3280+834',
    '6480+1944 Coins': '6480+1944',
    '12960+3888 Coins': '12960+3888',
    '19440+5832 Coins': '19440+5832',
    
    // CALL OF DUTY MOBILE
    '80 CP': '80+0',
    '420 CP': '420+0',
    '880 CP': '880+0',
    '2400 CP': '2400+0',
    '5000 CP': '5000+0',
    '10800 CP': '10800+0'
  };
  
  return articleMapping[item] || item; // Si no encuentra mapeo, devuelve original
}

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
      'Artículo': item, // ← CAMBIAR: quitar formatArticleName(item)
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