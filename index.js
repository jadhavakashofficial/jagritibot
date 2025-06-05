require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai"); // ✅ Updated import for OpenAI v4

const app = express();
app.use(bodyParser.json());

// ✅ Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 📄 Load and parse PDF
let pdfText = "";
const pdfBuffer = fs.readFileSync("./sample.pdf");

pdfParse(pdfBuffer).then((data) => {
  pdfText = data.text;
  console.log("✅ PDF Loaded");
});

// 📩 Gupshup Webhook
app.post("/webhook", async (req, res) => {
  const incoming = req.body.payload.payload.text;
  const user = req.body.payload.sender.phone;

  console.log(`📨 Message from ${user}: ${incoming}`);

  const aiReply = await askOpenAI(incoming, pdfText);

  // ✅ Send reply via Gupshup API
  await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
    params: {
      channel: "whatsapp",
      source: "917834811114", // Gupshup sandbox number
      destination: user,
      message: aiReply,
      "src.name": "jagriti",
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: "sk_ecaf62d8fdc84a4789b49f01d99ea150", // ✅ Your Gupshup API key
    },
  });

  res.sendStatus(200);
});

// 🤖 Ask OpenAI with PDF context
async function askOpenAI(question, context) {
  try {
    const prompt = `
You are a smart assistant helping users find Jagriti Yatra participants.

Given the user's question, search the PDF data and return ALL relevant candidates.

Include the following details for each match:
- Name
- City
- Role / Skills
- Email
- Phone
- LinkedIn
- About

Format cleanly for WhatsApp with emojis and clear line breaks.

PDF Data:
${context}

User Query:
${question}

Response:
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ OpenAI Error:", err.message);
    return "Sorry, I couldn’t process your request.";
  }
}

app.listen(3000, () => console.log("🚀 Bot running on http://localhost:3000"));
