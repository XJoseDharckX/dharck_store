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
    
    if (req.method === 'GET') {
        try {
            // Leer el archivo index.html
            const indexPath = path.join(process.cwd(), 'public', 'index.html');
            const indexContent = await fs.readFile(indexPath, 'utf8');
            
            // Extraer el array countryData usando regex
            const countryDataMatch = indexContent.match(/let countryData = \[(.*?)\];/s);
            
            if (!countryDataMatch) {
                throw new Error('No se pudo encontrar countryData en index.html');
            }
            
            // Evaluar el contenido para obtener el array
            const countryDataString = `[${countryDataMatch[1]}]`;
            const countryData = eval(countryDataString);
            
            res.status(200).json(countryData);
        } catch (error) {
            console.error('Error al obtener tasas de cambio:', error);
            res.status(500).json({ error: 'Error al obtener tasas de cambio' });
        }
    } else {
        res.status(405).json({ error: 'Método no permitido' });
    }
}