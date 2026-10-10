import 'dotenv/config';

import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const app = express();
const upload = multer({
    limits: { fileSize: 10_000_000 }
});

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("Tidak ada API key yang tersedia");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const PORT = process.env.PORT || 3000;

const SYSTEM_INSTRUCTION =
    process.env.SYSTEM_INSTRUCTION ||
    [
        'Kamu adalah "BotGweh"',
        "Jawab dengan ringkas dan jelas menggunakan Bahasa Indonesia.",
        "Jika kamu tidak mengetahui jawabannya, katakan dengan jujur."
    ].join(" ");

const GENERATION_CONFIG = {
    temperature: Number(process.env.TEMPERATURE ?? 0.9),
    topP: Number(process.env.TOP_P ?? 0.95),
    topK: Number(process.env.TOP_K ?? 40)
};

// Jumlah percobaan ulang otomatis saat model sibuk (503/429) atau jaringan gagal
const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 3);
const RETRYABLE_STATUS = new Set([429, 500, 503]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Panggil Gemini, coba ulang otomatis kalau server sibuk / koneksi timeout.
async function generateContentWithRetry(request) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await ai.models.generateContent(request);
        } catch (error) {
            lastError = error;

            // 503/429 dari Google, atau error jaringan (fetch failed / timeout)
            const status = error?.status ?? error?.code;
            const isNetworkError = error?.name === "TypeError";
            const canRetry = RETRYABLE_STATUS.has(status) || isNetworkError;

            if (!canRetry || attempt === MAX_RETRIES) break;

            const delay = 1000 * attempt; // 1s, 2s, 3s ...
            console.warn(
                `Percobaan ${attempt}/${MAX_RETRIES} gagal (${status || error.message}), coba lagi dalam ${delay}ms...`
            );
            await sleep(delay);
        }
    }

    throw lastError;
}

app
    .use(cors())
    .use(express.json())
    .use(express.static("public"));

app.post("/api/chat", async (req, res) => {
    const { conversation } = req.body ?? {};

    if (!Array.isArray(conversation) || conversation.length === 0) {
        return res.status(400).json({
            result: null,
            error: 'Field "conversation" wajib berupa array dan tidak boleh kosong.'
        });
    }

    const contents = conversation.map((message) => ({
        role: message.role === "model" ? "model" : "user",
        parts: [{ text: String(message.text ?? "") }]
    }));

    try {
        const response = await generateContentWithRetry({
            model: GEMINI_MODEL,
            contents,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                ...GENERATION_CONFIG
            }
        });

        return res.status(200).json({ result: response.text });
    } catch (error) {
        console.error(error);
        const status = error?.status ?? error?.code;
        const message =
            status === 503 || status === 429
                ? "Model sedang sibuk (high demand). Silakan coba lagi sebentar lagi."
                : error?.name === "TypeError"
                  ? "Koneksi ke Gemini gagal (timeout). Periksa jaringan lalu coba lagi."
                  : error.message || "Terjadi kesalahan saat menghubungi Gemini.";

        return res.status(status === 503 || status === 429 ? status : 500).json({
            result: null,
            error: message
        });
    }
});

// Teks
app.post("/generate-text", async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await generateContentWithRetry({
            model: GEMINI_MODEL,
            contents: prompt
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: e.message });
    }
});

// Gambar
app.post("/generate-from-image", upload.single("image"), async (req, res) => {
    const { prompt } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File gambar wajib diunggah" });
    }

    const base64Image = req.file.buffer.toString("base64");

    try {
        const response = await generateContentWithRetry({
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
});

// Dokumen
app.post("/generate-from-document", upload.single("document"), async (req, res) => {
    const { prompt } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File dokumen wajib diunggah" });
    }

    const base64Document = req.file.buffer.toString("base64");

    try {
        const response = await generateContentWithRetry({
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
});

// Audio
app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
    const { prompt } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "File audio wajib diunggah" });
    }

    const base64Audio = req.file.buffer.toString("base64");

    try {
        const response = await generateContentWithRetry({
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
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server chatbot berjalan di http://localhost:${PORT}`);
});
