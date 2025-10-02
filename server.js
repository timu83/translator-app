// server.js (ESM)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Varsayılan model .env’den ya da gpt-4.1-mini
const DEFAULT_MODEL  = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// İzinli modeller (istediğin gibi genişletebilirsin)
const ALLOWED_MODELS = new Set([
  "gpt-4.1-mini",  // ChatGPT mini
  "o4-mini",       // Mini o4 (OpenAI'nin hızlı-ucuz multimodal türevi)
  // "gpt-4o-mini"  // istersen bunu da ekleyebilirsin
]);

function validatePayload(text, direction){
  if (!text || typeof text !== "string" || !text.trim()) return "Boş metin";
  if (!["tr2en","en2tr"].includes(direction)) return "direction hatalı";
  return null;
}

app.post("/api/translate", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY eksik (Vercel env)" });

    const { text, direction, model } = req.body || {};
    const err = validatePayload(text, direction);
    if (err) return res.status(400).json({ error: err });

    // Model seçimi: body’den gelen izinliyse onu, yoksa DEFAULT
    const chosenModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    const source = direction === "tr2en" ? "Turkish" : "English";
    const target = direction === "tr2en" ? "English" : "Turkish";

    // kısa ve hızlı prompt
    const system = `Professional ${source}<->${target} translator. Keep formatting, no hallucinations.`;
    const user   = `Translate from ${source} to ${target}:\n\n${text}`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: chosenModel,
        input: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    const raw = await r.text();
    if (!r.ok) return res.status(500).json({ error: "OpenAI API hatası", detail: raw });

    let data = {};
    try { data = JSON.parse(raw); } catch {}
    const output =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.content?.[0]?.text ||
      data?.output_text || "";

    res.json({ translation: output, model: chosenModel });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Lokal geliştirme
const PORT = process.env.PORT || 8787;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Local: http://localhost:${PORT}`));
}

// Vercel serverless handler
export default app;
