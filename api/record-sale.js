const { getSellerSheet } = require('./sheets-config');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      sellerName,
      gameName,
      itemLabel,
      amountUSD,
      totalPrice,
      currencySymbol,
      playerId,
      playerName,
      countryName
    } = req.body;

    // Validar datos requeridos
    if (!sellerName || !gameName || !itemLabel || !amountUSD) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Obtener la hoja del vendedor específico
    const sheet = await getSellerSheet(sellerName);
    
    // Calcular ganancia (ejemplo: 10% del total, ajusta según tu lógica)
    const ganancia = totalPrice * 0.10;
    
    // Preparar los datos para la fila con la nueva estructura
    const rowData = {
      '📦Juego': gameName,
      '📦Artículo': itemLabel,
      '📦Cantidad': 1, // Siempre 1 por ahora
      '📦Monto_total': totalPrice,
      '📦Ganancia': ganancia,
      '📦Fecha_hora': new Date().toLocaleString('es-ES', { 
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };

    // Agregar la fila a la hoja
    await sheet.addRow(rowData);
    
    console.log(`Venta registrada para ${sellerName}:`, rowData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Venta registrada exitosamente',
      seller: sellerName,
      data: rowData
    });
    
  } catch (error) {
    console.error('Error al registrar la venta:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
};