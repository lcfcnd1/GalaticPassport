// Intergalactic Passport - Backend (FINAL, COMPLETE, AND CORRECTED VERSION)
// index.js

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

dotenv.config();
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const generatedDir = path.join(__dirname, 'public', 'generated');
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

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
          "passport_image_prompt": "...", "tweet_text": "...",
          "labels": { "planet_label": "(Translate 'PLANETA' to '${language}')", "species_label": "(Translate 'ESPECIE' to '${language}')", "occupation_label": "(Translate 'OCUPACIÓN' to '${language}')", "reg_number_label": "(Translate 'NÚM. REGISTRO' to '${language}')", "tagline_label": "(Translate 'LEMA DEL PERFIL' to '${language}')", "restrictions_label": "(Translate 'RESTRICCIONES' to '${language}')" }
        }
        `;
        
        const textResult = await textModel.generateContent(prompt);
        const responseText = await textResult.response.text();
        const cleanedResponse = responseText.replace(/^```json\s*|```\s*$/g, '');
        const passportData = JSON.parse(cleanedResponse);

        res.json({ ...passportData, theme: selectedTheme });
    } catch (error) {
        console.error('Error generating passport data:', error);
        res.status(500).json({ error: 'Failed to generate passport data.', details: error.message });
    }
});

app.post('/api/save-image', async (req, res) => {
    try {
        const { imageData } = req.body;
        if (!imageData) return res.status(400).json({ error: 'No image data provided.' });

        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageName = `passport-${uuidv4()}.png`;
        const imagePath = path.join(generatedDir, imageName);

        await fs.promises.writeFile(imagePath, imageBuffer);
        const imageUrl = `/generated/${imageName}`;
        res.json({ url: imageUrl });
    } catch (error) {
        console.error('Error saving image:', error);
        res.status(500).json({ error: 'Failed to save passport image.' });
    }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));