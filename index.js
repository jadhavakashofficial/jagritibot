require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// ✅ OpenAI Init
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Load & Parse PDF
let pdfText = "";
const pdfBuffer = fs.readFileSync("./sample.pdf");

pdfParse(pdfBuffer).then((data) => {
  pdfText = data.text;
  console.log("✅ PDF Loaded");
});

// ✅ GET: Home page check
app.get("/", (req, res) => {
  res.send("📡 Jagriti Bot is up and running!");
});

// ✅ GET: Webhook validation (Gupshup needs this)
app.get("/webhook", (req, res) => {
  res.send("✅ Gupshup webhook is live");
});

// ✅ POST: Webhook for incoming WhatsApp messages
app.post("/webhook", async (req, res) => {
  try {
    const incoming = req.body.payload?.payload?.text;
    const user = req.body.payload?.sender?.phone;

    console.log(`📨 Message from ${user}: ${incoming}`);

    const aiReply = await askOpenAI(incoming, pdfText);

    await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
      params: {
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE_NUMBER,
        destination: user,
        message: aiReply,
        "src.name": process.env.GUPSHUP_BOT_NAME,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: process.env.GUPSHUP_API_KEY,
      },
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    res.sendStatus(500);
  }
});

// ✅ Function: Ask OpenAI using trimmed PDF content
async function askOpenAI(question, context) {
  try {
    const trimmedContext = context.slice(0, 12000); // Prevent token overflow

    const prompt = `
You are a WhatsApp assistant helping users find Jagriti Yatra participants.

User's question:
"${question}"

From this data:
${trimmedContext}

Reply with a friendly, readable message listing matching participants (name, location, skills, email, phone, LinkedIn).
Only show matches. Add emojis & line breaks for clarity.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ OpenAI Error:", error.message);
    return "⚠️ Sorry, I couldn't process that right now.";
  }
}

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Jagriti Bot running at http://localhost:${PORT}`);
});
