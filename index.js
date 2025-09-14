// Intergalactic Passport - Backend (FINAL, DEPLOYMENT-READY VERSION - CORRECT IMPORT)
// index.js

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;

// --- FIX: La forma correcta y robusta de importar la clase VertexAI ---
// 1. Importamos el módulo completo de la librería.
const aiplatform = require('@google-cloud/aiplatform');
// 2. Accedemos a la clase VertexAI como una propiedad del módulo importado.
const VertexAI = aiplatform.VertexAI; 
// ---------------------------------------------------------------------

dotenv.config();

// --- CONFIGURACIÓN DE SERVICIOS ---

// 1. Google AI para texto (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// 2. Cloudinary para almacenamiento de imágenes
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 3. Google Cloud Vertex AI para generación de imágenes
// Esta configuración ya es correcta y robusta.
const vertex_ai = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: process.env.GCP_LOCATION,
});

const imageModel = vertex_ai.preview.getGenerativeModel({
  model: 'imagegeneration@006',
});

// --- SERVIDOR EXPRESS ---
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const themes = [
    { name: 'Cyberpunk Neon', colors: { accent1: '#00ffff', accent2: '#ff00ff', glow: 'rgba(0, 255, 255, 0.7)', bg1: 'rgba(75, 0, 130, 0.3)', bg2: 'rgba(0, 50, 100, 0.3)' } },
    { name: 'Solar Flare', colors: { accent1: '#ff8c00', accent2: '#ff4500', glow: 'rgba(255, 140, 0, 0.7)', bg1: 'rgba(139, 0, 0, 0.3)', bg2: 'rgba(100, 40, 0, 0.3)' } },
    { name: 'Matrix Code', colors: { accent1: '#32cd32', accent2: '#00ff7f', glow: 'rgba(50, 205, 50, 0.7)', bg1: 'rgba(0, 50, 0, 0.3)', bg2: 'rgba(10, 30, 10, 0.3)' } },
    { name: 'Void Runner', colors: { accent1: '#9370db', accent2: '#ffffff', glow: 'rgba(147, 112, 219, 0.7)', bg1: 'rgba(30, 0, 50, 0.3)', bg2: 'rgba(50, 50, 50, 0.3)' } }
];

app.post('/api/passport', async (req, res) => {
    try {
        const { name, likes, language } = req.body;
        if (!name || !likes || !language) return res.status(400).json({ error: 'Name, likes, and language are required.' });
        
        const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
        const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const prompt = `
        **PRIMARY DIRECTIVE: The entire JSON output's text values MUST be in the target language: '${language}'.**
        The ONLY exception is 'passport_image_prompt', which must remain in English.
        Traveler's Name: ${name}
        Traveler's Likes: ${likes}
        Generate a JSON object following these rules:
        1.  **Use Likes:** All creative content must be inspired by the traveler's 'Likes'.
        2.  **Sci-Fi Tone:** The tone must be grounded in science fiction. AVOID fantasy.
        3.  **Content Rules:**
            - **restrictions:** Invent one travel restriction. IT MUST BE ONE SINGLE, SHORT SENTENCE.
            - **passport_stamp_svg:** This is a critical creative task. You MUST generate a completely UNIQUE and symbolic SVG emblem based on the Traveler's Likes ('${likes}'). First, brainstorm a simple visual concept from the likes. For 'coding, stars', you might imagine a constellation formed by code brackets. Then, translate that unique concept into a few simple SVG paths. DO NOT use a generic geometric shape. The design must be a bespoke representation of the traveler's identity. Technical requirements: The SVG MUST have 'viewBox="0 0 100 100"'. Use the stroke colors ${selectedTheme.colors.accent1} and ${selectedTheme.colors.accent2}. Fill must be 'none'. Do not repeat designs.
        **JSON Structure (ALL text content except image prompt in '${language}'):**
        {
          "name": "${name}", "space_name": "...", "planet_of_origin": "...", "species": "...", "occupation": "...",
          "registration_number": "...", "profile_tagline": "...", "restrictions": "...",
          "passport_stamp_svg": "<svg>... a unique design based on the likes ...</svg>",
          "passport_image_prompt": "A detailed, high-quality, photorealistic sci-fi passport portrait, reflecting the occupation and likes...",
          "tweet_text": "A short, exciting tweet about this new passport in '${language}'",
          "labels": { "planet_label": "(Translate 'PLANETA' to '${language}')", "species_label": "(Translate 'ESPECIE' to '${language}')", "occupation_label": "(Translate 'OCUPACIÓN' to '${language}')", "reg_number_label": "(Translate 'NÚM. REGISTRO' to '${language}')", "tagline_label": "(Translate 'LEMA DEL PERFIL' to '${language}')", "restrictions_label": "(Translate 'RESTRICCIONES' to '${language}')" }
        }
        `;
        
        const textResult = await textModel.generateContent(prompt);
        const responseText = await textResult.response.text();
        const cleanedResponse = responseText.replace(/^```json\s*|```\s*$/g, '');
        const passportData = JSON.parse(cleanedResponse);

        const imageResponse = await imageModel.generateContent({ prompt: passportData.passport_image_prompt, number_of_images: 1, });
        const imageBase64 = imageResponse.images[0].image_bytes.toString('base64');

        const cloudinaryResponse = await cloudinary.uploader.upload(`data:image/png;base64,${imageBase64}`, { folder: 'intergalactic-passports', public_id: `passport-${uuidv4()}`, });
        const imageUrl = cloudinaryResponse.secure_url;

        res.json({ ...passportData, theme: selectedTheme, imageUrl: imageUrl });
    } catch (error) {
        console.error('Error in /api/passport endpoint:', error);
        res.status(500).json({ error: 'Failed to generate Intergalactic Passport.', details: error.message });
    }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => { console.log(`Server running on port ${port}`); });

module.exports = app;