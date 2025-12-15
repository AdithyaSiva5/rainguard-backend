// routes/predictedDisasters.js
import express from "express";
import { Groq } from "groq-sdk";
import 'dotenv/config';

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/predicted-disasters", async (req, res) => {
  try {
    const today = new Date();
    const future30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Generate a JSON object {disasters: array} with 12 realistic predicted natural disasters for the next 30 days in Indian regions (Mumbai, Chennai, Kolkata, Delhi, Bangalore, Hyderabad, Ahmedabad, Pune). Each object: {id: 'pred-X', type: 'Flood|Earthquake|Cyclone|Drought|Landslide', region: string, date: 'YYYY-MM-DD' (future), probability: 60-100, severity: 'Low|Medium|High|Critical', expectedAffectedArea: 100-800, estimatedClaims: 1000-8000, projectedLoss: 2000000-15000000, recommendedAction: 'Increase Reserves|Adjust Premiums|Intensify Marketing|Review Coverage', rainfall: 0-300 (for flood/cyclone), magnitude: 3.0-8.0 (for earthquake/landslide)}."
        },
        { role: "user", content: `Generate for dates between ${today.toISOString().split('T')[0]} and ${future30.toISOString().split('T')[0]}.` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });
    const data = JSON.parse(completion.choices[0].message.content).disasters;
    res.json(data);
  } catch (error) {
    console.error("Predicted Disasters Error:", error.message);
    res.status(500).json({ error: "Failed to generate predictions" });
  }
});

export default router;