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
        
        if (!orderId || !rowNumber) {
            res.status(400).json({ error: 'Datos incompletos: se requiere orderId y rowNumber' });
            return;
        }
        
        console.log(`Intentando eliminar pedido: ${orderId}, fila: ${rowNumber}`);
        
        // Buscar el pedido en todas las hojas para obtener el vendedor
        const allOrders = await sheetsService.getAllOrders();
        const orderToDelete = allOrders.find(order => 
            order.ID_Pedido === orderId && order.rowNumber === rowNumber
        );
        
        if (!orderToDelete) {
            res.status(404).json({ error: 'Pedido no encontrado' });
            return;
        }
        
        // Usar la función existente con el vendedor encontrado
        const result = await sheetsService.deleteOrder(rowNumber, orderToDelete.Vendedor);
        
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