// Intergalactic Passport - Backend (Vercel Ready)
// index.js

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;

dotenv.config();

// --- CONFIGURACIÓN DE GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- CONFIGURACIÓN DE CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- TEMAS DE PASAPORTE ---
const themes = [
  { name: 'Cyberpunk Neon', colors: { accent1: '#00ffff', accent2: '#ff00ff', glow: 'rgba(0, 255, 255, 0.7)', bg1: 'rgba(75, 0, 130, 0.3)', bg2: 'rgba(0, 50, 100, 0.3)' } },
  { name: 'Solar Flare', colors: { accent1: '#ff8c00', accent2: '#ff4500', glow: 'rgba(255, 140, 0, 0.7)', bg1: 'rgba(139, 0, 0, 0.3)', bg2: 'rgba(100, 40, 0, 0.3)' } },
  { name: 'Matrix Code', colors: { accent1: '#32cd32', accent2: '#00ff7f', glow: 'rgba(50, 205, 50, 0.7)', bg1: 'rgba(0, 50, 0, 0.3)', bg2: 'rgba(10, 30, 10, 0.3)' } },
  { name: 'Void Runner', colors: { accent1: '#9370db', accent2: '#ffffff', glow: 'rgba(147, 112, 219, 0.7)', bg1: 'rgba(30, 0, 50, 0.3)', bg2: 'rgba(50, 50, 50, 0.3)' } }
];

// --- SERVIDOR EXPRESS ---
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/passport', async (req, res) => {
  try {
    const { name, likes, language } = req.body;
    if (!name || !likes || !language) {
      return res.status(400).json({ error: 'Name, likes, and language are required.' });
    }

    const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
    const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const imageModel = genAI.getGenerativeModel({ model: 'imagen-2.0' });

    const prompt = `
    **PRIMARY DIRECTIVE: The entire JSON output's text values MUST be in the target language: '${language}'.**
    The ONLY exception is 'passport_image_prompt', which must remain in English.
    Traveler's Name: ${name}
    Traveler's Likes: ${likes}
    Generate a JSON object following these rules:
    1. Use Likes: All creative content must be inspired by the traveler's 'Likes'.
    2. Sci-Fi Tone: The tone must be grounded in science fiction (NOT fantasy).
    3. Content Rules:
       - restrictions: Invent one travel restriction (one short sentence).
       - passport_stamp_svg: Generate a UNIQUE SVG emblem based on '${likes}'.
         - viewBox="0 0 100 100"
         - stroke: ${selectedTheme.colors.accent1} and ${selectedTheme.colors.accent2}
         - fill="none"
    JSON Structure (all text except image prompt in '${language}'):
    {
      "name": "${name}", "space_name": "...", "planet_of_origin": "...", "species": "...", "occupation": "...",
      "registration_number": "...", "profile_tagline": "...", "restrictions": "...",
      "passport_stamp_svg": "<svg>...</svg>",
      "passport_image_prompt": "A photorealistic sci-fi passport portrait reflecting ${likes}",
      "tweet_text": "A short, exciting tweet in '${language}'",
      "labels": { "planet_label": "(Translate PLANETA)", "species_label": "(Translate ESPECIE)", ... }
    }
    `;

    // --- TEXTO CON GEMINI ---
    const textResult = await textModel.generateContent(prompt);
    const responseText = await textResult.response.text();
    const cleanedResponse = responseText.replace(/^```json\s*|```\s*$/g, '');
    const passportData = JSON.parse(cleanedResponse);

    // --- IMAGEN CON GEMINI ---
    const imageResult = await imageModel.generateContent({
      prompt: passportData.passport_image_prompt,
      size: "1024x1024"
    });

    const imageBase64 = imageResult.response.candidates[0].content.parts[0].inlineData.data;

    // --- SUBIDA A CLOUDINARY ---
    const cloudinaryResponse = await cloudinary.uploader.upload(
      `data:image/png;base64,${imageBase64}`,
      { folder: 'intergalactic-passports', public_id: `passport-${uuidv4()}` }
    );

    const imageUrl = cloudinaryResponse.secure_url;

    res.json({ ...passportData, theme: selectedTheme, imageUrl });
  } catch (error) {
    console.error('Error in /api/passport endpoint:', error);
    res.status(500).json({
      error: 'Failed to generate Intergalactic Passport.',
      details: error.message
    });
  }
});


module.exports = app;
