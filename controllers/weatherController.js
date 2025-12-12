// controllers/weatherController.js  ← DEBUG VERSION (copy-paste fully)

import axios from "axios";
import { Groq } from "groq-sdk";
import 'dotenv/config';
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

// Startup validation
if (!OPENWEATHER_KEY) console.error("🚨 OPENWEATHER_API_KEY missing from .env");
if (!GROQ_KEY) console.error("🚨 GROQ_API_KEY missing from .env");
const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

// 1. Get Current + 5-Day Forecast (for risk heatmaps) – FIXED: severity scope + fallbacks
export const getForecast = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

    // Current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const currentRes = await axios.get(currentUrl);
    const current = currentRes.data;

    // 5-day forecast (3-hourly)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const forecastRes = await axios.get(forecastUrl);
    const forecastList = forecastRes.data.list.slice(0, 8); // Next ~1 day for demo speed

    // Simulate risk events (rules-based "ML": flood if rain>20mm, storm if wind>30kmh, etc.) – FIXED
    const risks = forecastList.map(day => {
      const rain = day.rain?.['3h'] || 0;
      const wind = (day.wind?.speed || 0) * 3.6; // m/s to km/h, fallback 0
      const temp = day.main?.temp || 20; // Fallback to mild
      const severity = Math.min(10, ((rain || 0) / 2 + wind / 3 + Math.max(0, (temp || 0) - 30)) / 3); // Explicit let implied, full fallbacks
      return {
        time: day.dt_txt,
        riskType: (rain || 0) > 20 ? 'flood' : wind > 30 ? 'storm' : (temp || 0) > 35 ? 'heatwave' : 'low',
        severity: severity || 0,
        claimSurgePct: Math.min(50, (severity || 0) * 5),
        estImpact: (severity || 0) * 10000 // $ per event, scale for demo
      };
    });

    res.json({ current, forecast: risks });
  } catch (error) {
    console.error("Forecast Error:", error.message);
    res.status(500).json({ error: "Forecast failed", details: error.message });
  }
};

// 2. Risk Analysis (Region + Timeframe → Heatmap Data + Claims) – Already solid, minor fallback tweak
export const getRiskAnalysis = async (req, res) => {
  try {
    const { lat, lon, days = 7 } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const forecastRes = await axios.get(forecastUrl);
    const list = forecastRes.data.list.slice(0, parseInt(days) * 8) || []; // Fallback empty

    const heatmap = list.map((item) => {
      const rain = item.rain?.['3h'] || 0;
      const wind = (item.wind?.speed || 0) * 3.6;
      return {
        lat: parseFloat(lat) + (Math.random() - 0.5) * 0.1,
        lon: parseFloat(lon) + (Math.random() - 0.5) * 0.1,
        time: item.dt_txt,
        risk: (rain || 0) > 15 || wind > 25 ? 'high' : 'medium',
        surgePct: Math.floor(Math.random() * 40) + 10, // 10-50%
        financialImpact: ((Math.random() * 5000000 + 1000000) || 1000000).toFixed(0) // $1M-$6M, fallback
      };
    });

    const totalSurge = heatmap.length > 0 ? heatmap.reduce((sum, h) => sum + h.surgePct, 0) / heatmap.length : 0;
    const totalImpact = heatmap.reduce((sum, h) => sum + parseInt(h.financialImpact || 0), 0);

    res.json({
      heatmap,
      summary: {
        avgClaimSurgePct: totalSurge.toFixed(1),
        estFinancialImpact: `$${ (totalImpact / 1000000).toFixed(1) }M`,
        highRiskEvents: heatmap.filter(h => h.risk === 'high').length
      }
    });
  } catch (error) {
    console.error("Risk Analysis Error:", error.message);
    res.status(500).json({ error: "Analysis failed" });
  }
};

// 3. Recommendations + Alerts (Groq-Powered) – FIXED: Model to llama-3.1-70b-versatile
export const getRecommendations = async (req, res) => {
  try {
    const { riskData, region } = req.body;
    if (!groq) return res.status(500).json({ error: "Groq client not initialized – check API key" });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are WeatherShield AI – an epic, confident advisor for insurance execs.
Risk data: ${JSON.stringify(riskData || {})}.
Region: ${region || 'global'}.
Respond with 3-5 bullet-point recommendations: pre-position teams, alert policyholders, mitigate claims. Epic tone: "This foresight saves empires." Include alert summary. Keep under 300 words.`
        },
        { role: "user", content: "Generate prep plan" }
      ],
      model: "llama-3.1-70b-versatile", // FIXED: Current stable model (no deprecation)
      temperature: 0.5,
      max_tokens: 500 // Bumped for fuller recs
    });

    const reply = completion.choices[0]?.message?.content || "Alert: System primed for action – no high risks detected.";
    res.json({ 
      recommendations: reply, 
      alerts: (riskData?.highRiskEvents || 0) > 0 ? "🚨 High alert active" : "All clear" 
    });
  } catch (error) {
    console.error("Recommendations Error:", error.message);
    if (error.response?.data) console.error("Full Groq Error:", error.response.data);
    res.status(500).json({ error: "AI recs failed", details: error.message });
  }
};

// Legacy endpoints (unchanged, but with fallbacks for completeness)
export const getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon" });
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const response = await axios.get(url);
    const data = response.data;
    const rainMm = data.rain?.["1h"] || data.rain?.["3h"] || 0;
    res.json({
      city: data.name,
      temp: data.main.temp,
      description: data.weather[0].description,
      rainMm,
      payoutTriggered: rainMm >= 10,
    });
  } catch (error) {
    console.error("Weather Error:", error.message);
    res.status(500).json({ error: "Weather fetch failed", details: error.message });
  }
};

export const checkParametricTrigger = async (req, res) => {
  try {
    const { lat, lon, coverageAmount = 5000, rainThresholdMm = 10 } = req.body;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    const response = await axios.get(url);
    const rainMm = response.data.rain?.["1h"] || 0;
    const triggered = rainMm >= rainThresholdMm;
    const payout = triggered ? coverageAmount : 0;
    res.json({
      rainMm,
      threshold: rainThresholdMm,
      triggered,
      payout,
      message: triggered ? `Payout of $${payout} triggered!` : `No payout — rain: ${rainMm}mm`,
    });
  } catch (error) {
    console.error("Trigger Error:", error.message);
    res.status(500).json({ error: "Trigger failed", details: error.message });
  }
};

export const getAgentResponse = async (req, res) => {
  try {
    const { message, weatherData, userPolicy } = req.body;
    if (!groq) return res.status(500).json({ error: "Groq client not initialized" });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are RainGuard – a fun, friendly parametric rain insurance agent.
Current weather: ${JSON.stringify(weatherData || "unknown")}.
User policy: ${JSON.stringify(userPolicy || "none")}.
Reply in 2-3 short sentences with emojis. Be helpful and clear.`
        },
        { role: "user", content: message || "Hello" }
      ],
      model: "llama-3.1-70b-versatile", // FIXED: Matching update
      temperature: 0.7,
      max_tokens: 200,
    });
    const reply = completion.choices[0]?.message?.content || "No reply";
    res.json({ reply });
  } catch (error) {
    console.error("Agent Error:", error.message);
    res.status(500).json({ error: "AI failed", details: error.message });
  }
};