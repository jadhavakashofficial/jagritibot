require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const app = express();
app.use(bodyParser.json());

// ✅ Add GET routes for Gupshup validation
app.get("/", (req, res) => {
  res.send("Jagriti bot is running ✅");
});

app.get("/webhook", (req, res) => {
  res.send("Webhook is live ✅");
});

// ✅ Setup OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Load and parse the PDF
let pdfText = "";
const pdfBuffer = fs.readFileSync("./sample.pdf");

pdfParse(pdfBuffer).then((data) => {
  pdfText = data.text;
  console.log("✅ PDF Loaded");
});

// ✅ Main Webhook POST route
app.post("/webhook", async (req, res) => {
  try {
    const incoming = req.body.payload?.payload?.text;
    const user = req.body.payload?.sender?.phone;

    console.log(`📨 From ${user}: ${incoming}`);

    const aiReply = await askOpenAI(incoming, pdfText);

    await axios.post("https://api.gupshup.io/sm/api/v1/msg", null, {
      params: {
        channel: "whatsapp",
        source: "917834811114", // Sandbox source
        destination: user,
        message: aiReply,
        "src.name": "jagriti",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: "YOUR_GUPSHUP_API_KEY", // 🔁 Replace this
      },
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    res.sendStatus(500);
  }
});

// ✅ GPT function with full prompt
async function askOpenAI(question, context) {
  try {
    const prompt = `
You are a smart assistant helping users find Jagriti Yatra participants.

User is asking:
"${question}"

From the PDF content below, find ALL relevant participants matching the user's request.

For each match, return:
- Name
- City
- Role/Skills
- Email
- Phone
- LinkedIn (if available)
- About (short summary)

Format clearly for WhatsApp. Add line breaks and emojis if needed.

PDF Data:
${context}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ OpenAI Error:", err.message);
    return "Sorry, I couldn’t process that.";
  }
}

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot running on http://localhost:${PORT}`);
});
