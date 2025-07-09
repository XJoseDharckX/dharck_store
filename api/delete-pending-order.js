const sheetsService = require('./sheets-config');

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }
    
    try {
        const { orderId, rowNumber } = req.body;
        
        if (!orderId) {
            res.status(400).json({ error: 'Datos incompletos: se requiere orderId' });
            return;
        }
        
        console.log(`Intentando eliminar pedido: ${orderId}`);
        
        // Usar la nueva función para eliminar de Pedidos_Pendientes
        const result = await sheetsService.deletePendingOrder(orderId, rowNumber);
        
        if (result.success) {
            res.status(200).json({ 
                success: true,
                message: `Pedido ${orderId} eliminado correctamente` 
            });
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Error en delete-pending-order:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};