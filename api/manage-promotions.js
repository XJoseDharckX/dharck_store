const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        const configPath = path.join(process.cwd(), 'config', 'promotions-config.json');
        
        if (req.method === 'GET') {
            // Obtener promociones actuales
            try {
                const data = await fs.readFile(configPath, 'utf8');
                const config = JSON.parse(data);
                res.status(200).json(config);
            } catch (error) {
                // Si no existe el archivo, devolver configuración por defecto
                const defaultConfig = {
                    promotions: [
                        {
                            id: 'LORDS_MOBILE_SPECIAL',
                            name: 'Lords Mobile Especial',
                            game: 'LORDS MOBILE',
                            type: '+20%',
                            badge: '🔥 +20%',
                            articles: ['1200+240', '2500+500', '6000+1200'],
                            active: true
                        }
                    ]
                };
                res.status(200).json(defaultConfig);
            }
        } else if (req.method === 'POST') {
            // Crear nueva promoción
            const promotion = req.body;
            
            if (!promotion.name || !promotion.game) {
                res.status(400).json({ error: 'Datos de promoción incompletos' });
                return;
            }
            
            let config;
            try {
                const data = await fs.readFile(configPath, 'utf8');
                config = JSON.parse(data);
            } catch (error) {
                config = { promotions: [] };
            }
            
            promotion.id = `${promotion.game.replace(/\s+/g, '_')}_${Date.now()}`;
            config.promotions.push(promotion);
            
            // Crear directorio config si no existe
            const configDir = path.dirname(configPath);
            try {
                await fs.mkdir(configDir, { recursive: true });
            } catch (error) {
                // Directorio ya existe
            }
            
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            
            res.status(200).json({ message: 'Promoción creada', promotion });
        } else if (req.method === 'PUT') {
            // Actualizar promociones
            const { promotions } = req.body;
            
            if (!promotions || !Array.isArray(promotions)) {
                res.status(400).json({ error: 'Datos de promociones inválidos' });
                return;
            }
            
            // Crear directorio config si no existe
            const configDir = path.dirname(configPath);
            try {
                await fs.mkdir(configDir, { recursive: true });
            } catch (error) {
                // Directorio ya existe
            }
            
            await fs.writeFile(configPath, JSON.stringify({ promotions }, null, 2));
            
            res.status(200).json({ message: 'Promociones actualizadas' });
        }
    } catch (error) {
        console.error('Error en manage-promotions:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};