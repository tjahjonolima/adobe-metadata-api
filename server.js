import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Health check
app.get("/", (req, res) => {
  res.send("Adobe Metadata Vision API is running.");
});

// Image → Metadata
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;

    // Convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `
You are an Adobe Stock metadata generator.

RULES:
1. Output in ENGLISH.
2. Provide: filename, title, description, keywords (array).
3. Generate exactly 50 keywords.
4. First 10 keywords MUST be:
   - singular nouns
   - concrete
   - highly relevant to the image
5. After that:
   - add a few infinitive verbs
   - then conceptual terms
   - then keywords derived from the title
6. Keywords must be comma-safe and Adobe Stock reviewer friendly.
7. No brand names, no people identification, no sensitive topics.

Return JSON ONLY in this structure:
{
  "filename": "...",
  "title": "...",
  "description": "...",
  "keywords": ["...", "..."]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and generate Adobe Stock metadata." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    res.json(JSON.parse(content));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze image." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
