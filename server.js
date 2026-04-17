require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // <--- Adăugat pentru a citi foldere
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Spunem serverului să afișeze fișierul index.html când cineva intră pe site
app.use(express.static(path.join(__dirname)));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/oracle', async (req, res) => {
  const { sector, prob, systemPrompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Industrie: ${sector}\nProblema: ${prob}\nGenereaza analiza completa cu evaluare comerciala realista.` }
      ],
      temperature: 0.7,
    });

    const resultText = completion.choices[0].message.content;
    res.json(JSON.parse(resultText));

  } catch (error) {
    console.error("Eroare OpenAI:", error);
    res.status(500).json({ error: "Eroare la procesarea AI" });
  }
});

const PORT = process.env.PORT || 3000; // <--- Modificat pentru a funcționa pe internet
app.listen(PORT, () => console.log(`Serverul Oracle rulează pe portul ${PORT}`));