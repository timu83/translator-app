import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";


dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";


// Basit güvenlik: boş metinleri reddet
function validatePayload(text, direction){
if (!text || typeof text !== "string" || !text.trim()) return "Boş metin";
if (!["tr2en","en2tr"].includes(direction)) return "direction hatalı";
return null;
}


app.post("/api/translate", async (req, res) => {
try {
const { text, direction } = req.body || {};
const err = validatePayload(text, direction);
if (err) return res.status(400).json({ error: err });


const source = direction === "tr2en" ? "Turkish" : "English";
const target = direction === "tr2en" ? "English" : "Turkish";


// Çeviri talimatı: biçimi koru, özel isimlere dokunma, uydurma yok
const system = `You are a professional ${source}<->${target} translator. Preserve numbers, code blocks, URLs, usernames, mentions, emojis, product names and formatting. Do not add or omit meaning. If the text is a list or has line breaks, keep them. If the input already contains both languages, translate only the parts in ${source}.`;


const user = `Translate from ${source} to ${target}.\n\nINPUT:\n${text}`;


const r = await fetch("https://api.openai.com/v1/responses", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${OPENAI_API_KEY}`
},
body: JSON.stringify({
model: OPENAI_MODEL,
input: [
{ role: "system", content: system },
{ role: "user", content: user }
]
})
});


if (!r.ok) {
const t = await r.text();
return res.status(500).json({ error: "OpenAI API hatası", detail: t });
}


const data = await r.json();
// Responses API tutarlı çıkış alanı (text) üzerinden okuyoruz
const output = data?.output?.[0]?.content?.[0]?.text
|| data?.content?.[0]?.text
|| data?.output_text
|| "";


res.json({ translation: output });
} catch (e) {
console.error(e);
res.status(500).json({ error: "Sunucu hatası" });
}
});


const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));