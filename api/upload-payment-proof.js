import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // FUNCIÓN TEMPORALMENTE DESHABILITADA
  return res.status(503).json({ 
    error: 'Función de subida de comprobantes temporalmente deshabilitada',
    message: 'Esta función estará disponible próximamente'
  });

  /* CÓDIGO ORIGINAL COMENTADO
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const form = await req.formData();
    const file = form.get('paymentProof');
    
    if (!file) {
      return res.status(400).json({ error: 'No se encontró el archivo de comprobante' });
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 10MB.' });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido. Solo JPG, PNG, PDF.' });
    }

    // Subir a Vercel Blob
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `comprobante_${timestamp}.${extension}`;
    
    const blob = await put(fileName, file, {
      access: 'public',
    });

    res.status(200).json({
      success: true,
      fileName: fileName,
      filePath: blob.url,
      message: 'Comprobante subido exitosamente'
    });
    
  } catch (error) {
    console.error('Error subiendo comprobante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
  */
}