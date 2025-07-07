const fs = require('fs').promises;
const path = require('path');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'POST') {
        try {
            const { countryName, exchangeRate } = req.body;
            
            if (!countryName || !exchangeRate) {
                return res.status(400).json({ error: 'País y tasa de cambio son requeridos' });
            }
            
            // Leer el archivo index.html
            const indexPath = path.join(process.cwd(), 'public', 'index.html');
            let indexContent = await fs.readFile(indexPath, 'utf8');
            
            // Buscar y reemplazar la tasa de cambio específica
            const regex = new RegExp(
                `(name: '${countryName}',[\\s\\S]*?exchangeRate: )(\\d+\\.?\\d*)`,
                'g'
            );
            
            const newContent = indexContent.replace(regex, `$1${exchangeRate}`);
            
            if (newContent === indexContent) {
                return res.status(404).json({ error: 'País no encontrado' });
            }
            
            // Guardar el archivo actualizado
            await fs.writeFile(indexPath, newContent, 'utf8');
            
            res.status(200).json({ 
                success: true, 
                message: `Tasa de cambio para ${countryName} actualizada a ${exchangeRate}` 
            });
            
        } catch (error) {
            console.error('Error al actualizar tasa de cambio:', error);
            res.status(500).json({ error: 'Error al actualizar tasa de cambio' });
        }
    } else {
        res.status(405).json({ error: 'Método no permitido' });
    }
}