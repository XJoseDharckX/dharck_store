module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        if (req.method === 'GET') {
            // Obtener configuración guardada
            // Aquí podrías leer desde una base de datos o archivo
            const config = {}; // Cargar configuración
            res.status(200).json(config);
        } else if (req.method === 'POST') {
            // Guardar nueva configuración
            const { gameArticlesConfig } = req.body;
            // Aquí podrías guardar en una base de datos o archivo
            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error('Error en articles-config:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};