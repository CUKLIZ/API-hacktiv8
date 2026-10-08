import 'dotenv/config';

import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const app = express();
const upload = multer({
    limits: { fileSize: 10_000_000 }
});
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
});
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const PORT = process.env.PORT || 3000;

// iniliasi apikasi
app
.use(cors())
.use(express.json())

// inisialisasi route
// endpoint 1: POST /api/generate-text
.post("/api/generate-text", async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt
        });
        res.status(200).json({
            success: true,
            result: response.text
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
})

// endpoint 2: POST /api/prosess-media
.post("/api/prosess-media", upload.single("file"), async (req, res) => {
    const { prompt } = req.body;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: "File wajib diunggah"
        });
    }

    const file = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || '';

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
                { type, data: file, mime_type: mimeType }
            ]
        });

        return res.status(200).json({
            success: true,
            message: interaction.output_text
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: error.message || "Error Coyy"
        });
    }
})

// endpoint materi sesi 2
.post("/generate-text", async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
})

.post("/generate-from-image", upload.single("image"), async (req, res) => {
    const { prompt } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File gambar wajib diunggah" });
    }

    const base64Image = req.file.buffer.toString("base64");

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt || "Describe this image", type: "text" },
                { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
            ]
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
})

.post("/generate-from-document", upload.single("document"), async (req, res) => {
    const { prompt } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File dokumen wajib diunggah" });
    }

    const base64Document = req.file.buffer.toString("base64");

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.", type: "text" },
                { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
            ]
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
})

.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
    const { prompt } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File audio wajib diunggah" });
    }

    const base64Audio = req.file.buffer.toString("base64");

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { text: prompt ?? "Tolong buatkan transkrip dari rekaman berikut.", type: "text" },
                { inlineData: { data: base64Audio, mimeType: req.file.mimetype } }
            ]
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
})

// bungkus gan!
.listen(PORT, () => {
  console.log(`WOiii wkwkw keren ${PORT}`);
});
