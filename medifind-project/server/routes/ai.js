const express = require('express');
const router = express.Router();
const axios = require('axios');

// --- AI PRESCRIPTION SCANNER ROUTE ---
// @route   POST /api/ai/scan
// @desc    Receives an image, calls Gemini AI, and returns the text
// @access  Public
router.post('/scan', async (req, res) => {
    const { imageData, mimeType } = req.body;
    if (!imageData || !mimeType) {
        return res.status(400).json({ msg: 'Image data and mime type are required.' });
    }
    
    // This line is now updated to correctly use your API key from the .env file
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const payload = {
        contents: [{
            parts: [
                { text: "Analyze this image of a medical prescription. List only the medicine names you can identify clearly, one per line. Do not add any extra text or headings. If you cannot identify any medicines, respond with 'No medicines found'." },
                { inlineData: { mimeType, data: imageData } }
            ]
        }]
    };
    try {
        const aiResponse = await axios.post(GEMINI_API_URL, payload);
        const text = aiResponse.data.candidates[0].content.parts[0].text;
        res.json({ detectedText: text });
    } catch (err) {
        console.error("Gemini API Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ msg: 'Failed to communicate with the AI service.' });
    }
});


// --- AI SYMPTOM CHECKER ROUTE ---
// @route   POST /api/ai/symptoms
// @desc    Receives symptoms, calls Gemini, and returns suggestions
// @access  Public
router.post('/symptoms', async (req, res) => {
    const { symptoms } = req.body;
    if (!symptoms) {
        return res.status(400).json({ msg: 'Symptom description is required.' });
    }

    // This line is also updated to use your API key
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const systemPrompt = "You are a helpful AI assistant for a medical information website. You are not a doctor. Your role is to provide general information about common, over-the-counter (OTC) remedies for mild symptoms. You must NEVER provide a medical diagnosis or prescribe medication. Your response must be formatted in markdown. At the end of your response, you MUST include the following disclaimer, formatted exactly like this: '**Disclaimer: This is not medical advice. Always consult a healthcare professional for any health concerns.**'";

    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: `A user has the following symptoms: "${symptoms}". Based on this, suggest some general, widely available over-the-counter remedies or comfort measures. Do not diagnose any condition.` }] }]
    };

    try {
        const aiResponse = await axios.post(GEMINI_API_URL, payload);
        const text = aiResponse.data.candidates[0].content.parts[0].text;
        res.json({ suggestionText: text });
    } catch (err) {
        console.error("Gemini API Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ msg: 'Failed to communicate with the AI service.' });
    }
});

module.exports = router;

