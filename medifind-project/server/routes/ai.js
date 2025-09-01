const express = require('express');
const router = express.Router();
const axios = require('axios');

// @route   POST /api/ai/scan
// @desc    Receives an image, calls Gemini AI, and returns the text
// @access  Public
router.post('/scan', async (req, res) => {
    const { imageData, mimeType } = req.body;

    if (!imageData || !mimeType) {
        return res.status(400).json({ msg: 'Image data and mime type are required.' });
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const payload = {
        contents: [{
            parts: [
                {
                    text: "Analyze this image of a medical prescription. List only the medicine names you can identify clearly, one per line. Do not add any extra text or headings. If you cannot identify any medicines, respond with 'No medicines found'."
                },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: imageData
                    }
                }
            ]
        }]
    };

    try {
        const aiResponse = await axios.post(GEMINI_API_URL, payload, {
            headers: { "Content-Type": "application/json" }
        });

        const text = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
        res.json({ detectedText: text });
    } catch (err) {
        console.error("Error calling Gemini API:", err.response?.data || err.message);
        res.status(500).json({ msg: 'Failed to communicate with the AI service.' });
    }
});

module.exports = router;
