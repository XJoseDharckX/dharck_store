const { deletePendingOrder } = require('./sheets-config');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { orderId, rowNumber } = req.body;
    
    if (!orderId || !rowNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de pedido y número de fila son requeridos' 
      });
    }

    const result = await deletePendingOrder(orderId, rowNumber);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error al eliminar pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
}