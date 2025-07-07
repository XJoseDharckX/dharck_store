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
    const earnings = [];
    let totalEarnings = 0;

    // Iterar sobre cada vendedor
    for (const [sellerName, sheetName] of Object.entries(SELLER_SHEET_MAPPING)) {
      try {
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) {
          console.warn(`Hoja no encontrada: ${sheetName}`);
          continue;
        }

        await sheet.loadCells();
        let sellerTotal = 0;
        let orderCount = 0;

        // Sumar valores de la columna E (índice 4)
        // Empezar desde la fila 2 (índice 1) para saltar encabezados
        for (let i = 1; i < sheet.rowCount; i++) {
          const earningCell = sheet.getCell(i, 4); // Columna E
          const idCell = sheet.getCell(i, 0); // Columna A para verificar si hay datos
          
          // Solo contar si hay un ID (fila no vacía)
          if (idCell.value && earningCell.value) {
            const earning = parseFloat(earningCell.value) || 0;
            sellerTotal += earning;
            orderCount++;
          }
        }

        earnings.push({
          seller: sellerName,
          total: sellerTotal,
          orderCount: orderCount,
          formatted: `$${sellerTotal.toFixed(2)}`
        });

        totalEarnings += sellerTotal;
      } catch (error) {
        console.error(`Error procesando vendedor ${sellerName}:`, error);
        earnings.push({
          seller: sellerName,
          total: 0,
          orderCount: 0,
          formatted: '$0.00',
          error: 'Error al cargar datos'
        });
      }
    }

    // Ordenar por ganancias (mayor a menor)
    earnings.sort((a, b) => b.total - a.total);

    res.status(200).json({
      success: true,
      earnings: earnings,
      totalEarnings: totalEarnings,
      formattedTotal: `$${totalEarnings.toFixed(2)}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error obteniendo ganancias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};