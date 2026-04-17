require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js'); // <--- Adăugat

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Conectarea la Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/oracle', async (req, res) => {
  const { sector, prob, systemPrompt, email } = req.body; // <--- Primim și email-ul acum
// SALVARE ÎN ARHIVĂ
await supabase
  .from('analyses')
  .insert([{ 
    user_email: email, 
    sector: sector, 
    problem: prob, 
    full_response: JSON.parse(resultText) 
  }]);
  try {
    // 1. Verificăm în baza de date dacă userul mai are credite
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('email', email)
      .single();

    // Dacă userul nu există în baza de date, îl creăm acum cu 2 credite
    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([{ email: email, credits: 2 }])
        .select()
        .single();
      profile = newProfile;
    }

    if (profile.credits <= 0) {
      return res.status(403).json({ error: "PAYWALL", message: "Nu mai ai credite gratuite." });
    }

    // 2. Rulăm AI-ul
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Industrie: ${sector}\nProblema: ${prob}` }
      ],
    });

    // 3. Dacă AI-ul a răspuns cu succes, scădem 1 credit din baza de date
    await supabase
      .from('profiles')
      .update({ credits: profile.credits - 1 })
      .eq('email', email);

    const resultText = completion.choices[0].message.content;
    res.json(JSON.parse(resultText));

  } catch (error) {
    console.error("Eroare:", error);
    res.status(500).json({ error: "Eroare la procesarea cererii" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serverul Oracle rulează pe portul ${PORT}`));