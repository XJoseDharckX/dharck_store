const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        const configPath = path.join(process.cwd(), 'config', 'games-config.json');
        
        if (req.method === 'GET') {
            // Obtener configuración actual de juegos
            try {
                const data = await fs.readFile(configPath, 'utf8');
                const config = JSON.parse(data);
                res.status(200).json(config);
            } catch (error) {
                // Si no existe el archivo, devolver configuración por defecto
                const defaultConfig = {
                    games: [
                        { name: 'LORDS MOBILE', enabled: true },
                        { name: 'BLOOD STRIKE', enabled: true },
                        { name: 'FREE FIRE', enabled: true },
                        { name: 'GENSHIN IMPACT', enabled: true },
                        { name: 'PUBG MOBILE', enabled: true },
                        { name: 'DELTA FORCE STEAM', enabled: true },
                        { name: 'CALL OF DUTY MOBILE', enabled: true }
                    ]
                };
                res.status(200).json(defaultConfig);
            }
        } else if (req.method === 'POST') {
            // Actualizar configuración de juegos
            const { games } = req.body;
            
            if (!games || !Array.isArray(games)) {
                res.status(400).json({ error: 'Datos de juegos inválidos' });
                return;
            }
            
            // Crear directorio config si no existe
            const configDir = path.dirname(configPath);
            try {
                await fs.mkdir(configDir, { recursive: true });
            } catch (error) {
                // Directorio ya existe
            }
            
            // Guardar configuración
            await fs.writeFile(configPath, JSON.stringify({ games }, null, 2));
            
            res.status(200).json({ message: 'Configuración de juegos actualizada' });
        }
    } catch (error) {
        console.error('Error en manage-games:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};