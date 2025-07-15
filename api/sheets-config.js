const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Configuración de autenticación
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Función para obtener el documento de Google Sheets
async function getGoogleSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error('Error al conectar con Google Sheets:', error);
    throw error;
  }
}

// Mapeo de nombres de vendedores a nombres de hojas
const SELLER_SHEET_MAPPING = {
  'XJoseDharckX': 'XJoseDharckX',
  'Miguel': 'Miguel',
  'Alfredo Favier': 'Alfredo',
  'Candy Candy': 'Candy',
  'Satoru': 'Satoru',
  'Ernesto': 'Ernesto',
  'OSCAR': 'Oscar',
  'SpartanoWolf98': 'SpartanoWolf98',
  'Jhack': 'Jhack',
  'Enmanuel': 'Enmanuel' // NUEVO VENDEDOR AGREGADO
};

// Función para obtener la hoja específica del vendedor
async function getSellerSheet(sellerName) {
  try {
    const doc = await getGoogleSheet();
    const sheetName = SELLER_SHEET_MAPPING[sellerName];
    
    if (!sheetName) {
      throw new Error(`Vendedor no encontrado: ${sellerName}`);
    }
    
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      throw new Error(`Hoja no encontrada para el vendedor: ${sheetName}`);
    }
    
    return sheet;
  } catch (error) {
    console.error('Error al obtener la hoja del vendedor:', error);
    throw error;
  }
}

// Función para actualizar el estado de un pedido
async function updateOrderStatus(rowNumber, status) {
  try {
    const doc = await getGoogleSheet();
    
    // Buscar en todas las hojas de vendedores
    for (const [sellerName, sheetName] of Object.entries(SELLER_SHEET_MAPPING)) {
      try {
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) continue;
        
        await sheet.loadCells();
        
        // Buscar la fila con el ID correspondiente
        for (let i = 1; i < sheet.rowCount; i++) {
          const idCell = sheet.getCell(i, 0); // Columna A (ID)
          if (idCell.value == rowNumber) {
            // Actualizar el estado en la columna correspondiente (asumiendo columna H)
            const statusCell = sheet.getCell(i, 7);
            statusCell.value = status;
            await sheet.saveUpdatedCells();
            
            return {
              success: true,
              message: `Estado actualizado a ${status}`
            };
          }
        }
      } catch (error) {
        console.error(`Error en hoja ${sheetName}:`, error);
        continue;
      }
    }
    
    return {
      success: false,
      message: 'Pedido no encontrado'
    };
  } catch (error) {
    console.error('Error actualizando estado:', error);
    return {
      success: false,
      message: 'Error interno del servidor'
    };
  }
}

// Función para eliminar un pedido
async function deleteOrder(rowNumber, sellerName) {
  try {
    const sheet = await getSellerSheet(sellerName);
    await sheet.loadCells();
    
    // Buscar la fila con el ID correspondiente
    for (let i = 1; i < sheet.rowCount; i++) {
      const idCell = sheet.getCell(i, 0); // Columna A (ID)
      if (idCell.value == rowNumber) {
        // Eliminar la fila
        await sheet.deleteRows(i + 1, 1); // +1 porque las filas empiezan en 1
        
        return {
          success: true,
          message: 'Pedido eliminado exitosamente'
        };
      }
    }
    
    return {
      success: false,
      message: 'Pedido no encontrado'
    };
  } catch (error) {
    console.error('Error eliminando pedido:', error);
    return {
      success: false,
      message: 'Error interno del servidor'
    };
  }
}

// Función para obtener todos los pedidos de la hoja Pedidos_Pendientes
async function getAllOrders() {
  try {
    const doc = await getGoogleSheet();
    const pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    
    if (!pendingOrdersSheet) {
      return [];
    }

    const rows = await pendingOrdersSheet.getRows();
    
    return rows.map((row, index) => ({
      rowNumber: index + 2, // +2 porque las filas empiezan en 2 (1 es header)
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
    }));
  } catch (error) {
    console.error('Error obteniendo todos los pedidos:', error);
    throw error;
  }
}

// Función mejorada para eliminar pedidos de Pedidos_Pendientes
async function deletePendingOrder(orderId, rowNumber) {
  try {
    const doc = await getGoogleSheet();
    const pendingOrdersSheet = doc.sheetsByTitle['Pedidos_Pendientes'];
    
    if (!pendingOrdersSheet) {
      return {
        success: false,
        message: 'Hoja de pedidos pendientes no encontrada'
      };
    }

    // Obtener todas las filas
    const rows = await pendingOrdersSheet.getRows();
    
    // Buscar la fila con el ID correspondiente
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.get('ID_Pedido') === orderId) {
        // Eliminar la fila
        await row.delete();
        
        return {
          success: true,
          message: 'Pedido eliminado exitosamente'
        };
      }
    }
    
    return {
      success: false,
      message: 'Pedido no encontrado'
    };
  } catch (error) {
    console.error('Error eliminando pedido pendiente:', error);
    return {
      success: false,
      message: `Error interno del servidor: ${error.message}`
    };
  }
}

// ✅ ASEGURAR QUE ESTÉ EN LA EXPORTACIÓN
module.exports = {
  getGoogleSheet,
  getSellerSheet,
  updateOrderStatus,
  deleteOrder,
  getAllOrders,
  deletePendingOrder,
  SELLER_SHEET_MAPPING  // ✅ Verificar que esté aquí
};