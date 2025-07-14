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
        const { rowNumber, status } = req.body;
        
        if (!rowNumber || !status) {
            res.status(400).json({ error: 'Datos incompletos' });
            return;
        }
        
        const result = await sheetsService.updateOrderStatus(rowNumber, status);
        
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Error en update-order:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};