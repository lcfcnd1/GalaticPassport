import cloudinary from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Cloudinary con las mismas variables de entorno
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Verificar que sea un data URL válido
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }

    // Generar un nombre único para la imagen
    const uniqueId = uuidv4();
    const publicId = `intergalactic-passport-${uniqueId}`;

    // Subir imagen a Cloudinary
    const uploadResult = await cloudinary.v2.uploader.upload(imageData, {
      public_id: publicId,
      folder: 'intergalactic-passports',
      resource_type: 'image',
      format: 'png',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    });

    // Devolver la URL de la imagen subida
    return res.status(200).json({
      success: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id
    });

  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    
    return res.status(500).json({ 
      error: 'Failed to save image',
      details: error.message 
    });
  }
} 