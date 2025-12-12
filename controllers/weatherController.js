// controllers/weatherController.js  ← DEBUG VERSION (copy-paste fully)

import axios from "axios";
import { Groq } from "groq-sdk";
import 'dotenv/config';

// === DEBUG: Hard-code keys here temporarily (REMOVE BEFORE FINAL SUBMISSION) ===
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;    // ← PASTE YOUR KEY
const GROQ_KEY = process.env.GROQ_API_KEY;               // ← PASTE YOUR KEY

const groq = new Groq({ apiKey: GROQ_KEY });

// 1. Get current weather
export const getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    console.log("getWeather called with lat:", lat, "lon:", lon);

    if (!lat || !lon) {
      return res.status(400).json({ error: "Missing lat/lon" });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    console.log("Fetching from OpenWeather URL:", url);

    const response = await axios.get(url);
    console.log("OpenWeather raw response status:", response.status);

    const data = response.data;
    const rainMm = data.rain?.["1h"] || data.rain?.["3h"] || 0;  // Try 1h or 3h rain

    console.log("Weather data received:", { city: data.name, rainMm, fullData: data.weather[0].description });

    res.json({
      city: data.name,
      temp: data.main.temp,
      description: data.weather[0].description,
      rainMm,
      payoutTriggered: rainMm >= 10,
    });
  } catch (error) {
    console.error("OPENWEATHER ERROR:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);

    res.status(500).json({
      error: "Weather fetch failed",
      details: error.response?.data || error.message,
    });
  }
};

// 2. Parametric trigger
export const checkParametricTrigger = async (req, res) => {
  try {
    const { lat, lon, coverageAmount = 5000, rainThresholdMm = 10 } = req.body;
    console.log("Trigger check:", { lat, lon, coverageAmount, rainThresholdMm });

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const response = await axios.get(url);
    const rainMm = response.data.rain?.["1h"] || 0;

    const triggered = rainMm >= rainThresholdMm;
    const payout = triggered ? coverageAmount : 0;

    console.log("Trigger result:", { rainMm, triggered, payout });

    res.json({
      rainMm,
      threshold: rainThresholdMm,
      triggered,
      payout,
      message: triggered ? `Payout of ₹${payout} triggered!` : `No payout — rain: ${rainMm}mm`,
    });
  } catch (error) {
    console.error("TRIGGER ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: "Trigger failed", details: error.response?.data });
  }
};

// 3. AI Agent
export const getAgentResponse = async (req, res) => {
  try {
    const { message, weatherData, userPolicy } = req.body;

    console.log("AI endpoint hit");
    console.log("Incoming message:", message);
    console.log("Weather data:", weatherData);
    console.log("User policy:", userPolicy);

    // Hard-code your Groq key here temporarily (remove before final submission)
    const GROQ_KEY = process.env.GROQ_API_KEY;   // ← PASTE YOUR KEY HERE

    if (!GROQ_KEY || GROQ_KEY.includes("your_real")) {
      console.error("GROQ KEY MISSING OR NOT REPLACED!");
      return res.status(500).json({ error: "Groq key not set" });
    }

    console.log("Calling Groq with key starting with:", GROQ_KEY.substring(0, 10) + "...");

    const groq = new Groq({ apiKey: GROQ_KEY });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are RainGuard — a fun, friendly parametric rain insurance agent.
Current weather: ${JSON.stringify(weatherData || "unknown")}.
User policy: ${JSON.stringify(userPolicy || "none")}.
Reply in 2-3 short sentences with emojis. Be helpful and clear.`
        },
        { role: "user", content: message || "Hello" }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 200,
    });

    const reply = completion.choices[0]?.message?.content || "No reply";
    console.log("AI replied successfully:", reply);

    res.json({ reply });

  } catch (error) {
    console.error("GROQ FULL ERROR:");
    console.error("Message:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Full error:", error);

    res.status(500).json({
      error: "AI failed",
      details: error.message,
      full: error.response?.data || "No response data"
    });
  }
};