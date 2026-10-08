import 'dotenv/config';

import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const app = express();
const upload = multer({
    fileSize: 1_000_000
});
const ai = new GoogleGenAI();
const PORT = process.env.PORT || 3000;

// iniliasi apikasi
app
.use(upload.single("file"))
.use(cors())
.use(express.json())

// inisialisasi route
// endpoint 1: POST /api/generate-text
.post("/api/generate-text", async (req, res) => {
    const { prompt } = req.body;
})

// endpoint 2: POST /api/prosess-media
.post("/api/prosess-media", async (req, res) => {
    const { prompt } = req.body;

    const file = req.file?.buffer.toString('base64');
    const mimeType = req.file?.mimetype || '';

    let type = 'document';
    if (mimeType.startsWith('image/')) {
        type = 'image';
    } else if (mimeType.startsWith('audio/')) {
        type = 'audio';
    } else if (mimeType.startsWith('video/')) {
        type = 'video';
    }

    try {
        const interaction = await ai.interactions.create({
            model: 'gemini-3.5-flash-lite',
            input: [
                { type: 'text', text: prompt },
                { type, data: file, mime_type: req.file?.mimetype }
            ]
        });

        return res.status(200).json({
            success: true,
            message: interaction.output_text
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error Coyy"
         });
    }
})

// bungkus gan!
.listen(PORT, () => {
  console.log(`WOiii wkwkw keren ${PORT}`);
});
