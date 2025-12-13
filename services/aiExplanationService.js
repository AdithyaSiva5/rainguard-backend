import Groq from "groq-sdk";
import 'dotenv/config';
const GROQ_KEY = process.env.GROQ_API_KEY;
if (!GROQ_KEY) console.error("🚨 GROQ_API_KEY missing from .env");

const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;
export async function generateAIExplanation(input) {
console.log("Here")
  const prompt = `
You are an insurance risk analyst.

Explain to the driver in simple, simple language:
- Why their insurance premium is high or low
- Which driving behaviors increased risk
- What actions they can take to reduce their premium

Data:
${JSON.stringify(input, null, 2)}
`;

  const response = await groq.chat.completions.create({
    model: "groq/compound",
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 300
  });

  return response.choices[0].message.content;
}
