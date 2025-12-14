import express from "express";
import axios from "axios";
import NodeCache from "node-cache"; // Fixed import (commonjs default vs esm)
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const myCache = new NodeCache({ stdTTL: 3600 }); // Create instance with name 'myCache' or 'cache'

const regions = [
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
];

const disasterTypes = ['Flood', 'Earthquake', 'Cyclone', 'Drought', 'Landslide'];

router.get('/predicted-disasters', async (req, res) => {
  const predicted = [];
  const today = new Date();

  for (const region of regions) {
    const cacheKey = `openmeteo_${region.name}`;
    let data = myCache.get(cacheKey); // Use the instance

    if (!data) {
      try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: region.lat,
            longitude: region.lng,
            daily: [
              'temperature_2m_max',
              'temperature_2m_min',
              'precipitation_sum',
              'precipitation_probability_max',
              'wind_speed_10m_max',
              'wind_gusts_10m_max'
            ].join(','), // Pass as comma-separated string
            forecast_days: 16,
            timezone: 'Asia/Kolkata',
          },
        });
        data = response.data;
        console.log(data);
        myCache.set(cacheKey, data); // Use the instance
      } catch (error) {
        console.error(`Open-Meteo Error for ${region.name}:`, error.response?.data || error.message);
        continue;
      }
    }

    const daily = data.daily || {};
    const dates = daily.time || [];
    const precipSum = daily.precipitation_sum || [];
    const precipProb = daily.precipitation_probability_max || [];
    const windMax = daily.wind_speed_10m_max || [];
    const windGusts = daily.wind_gusts_10m_max || [];

    dates.forEach((dateStr, index) => {
      if (index === 0) return; // Skip today (index 0 is current day)

      const rain = precipSum[index] ?? 0;
      const rainProb = precipProb[index] ?? 0;
      const windKmH = windMax[index] ?? 0;
      const gustKmH = windGusts[index] ?? 0;

      if (rain > 40 || rainProb > 60 || windKmH > 60) {
        let type = 'Flood';
        if (windKmH > 80 || gustKmH > 100) type = 'Cyclone';
        if (rain < 5 && rainProb < 20) type = 'Drought';

        const probability = Math.min(99, 60 + rain / 2 + rainProb / 2 + windKmH / 4);

        predicted.push({
          id: `pred-${region.name}-${dateStr}`,
          type,
          region: region.name,
          date: dateStr,
          probability: Math.floor(probability),
          severity: probability > 90 ? 'Critical' : probability > 80 ? 'High' : probability > 65 ? 'Medium' : 'Low',
          expectedAffectedArea: Math.floor(rain * 15) + 100,
          estimatedClaims: Math.floor(probability * 100) + 1000,
          projectedLoss: Math.floor(probability * 200000) + 2000000,
          recommendedAction: probability > 80 ? 'Increase Reserves' : 'Adjust Premiums',
          rainfall: Math.round(rain),
          magnitude: type === 'Earthquake' ? undefined : (windKmH / 10).toFixed(1),
        });
      }
    });
  }

  // ... (existing imports and regions/disasterTypes)

// Inside router.get('/predicted-disasters', async (req, res) => { ... }

// After processing all regions' real forecasts...

// Extend to full 30 days with simulated low-risk if real risks are sparse
while (predicted.length < 12 || !predicted.some(p => new Date(p.date) > new Date('2025-12-29'))) {
  const randomRegion = regions[Math.floor(Math.random() * regions.length)];
  const simDate = new Date(today);
  simDate.setDate(today.getDate() + Math.floor(Math.random() * 15) + 16); // Days 17-30

  const simDateStr = simDate.toISOString().split('T')[0];
  const simType = disasterTypes[Math.floor(Math.random() * disasterTypes.length)];
  const simProb = Math.floor(Math.random() * 30) + 50; // Low prob

  predicted.push({
    id: `sim-${predicted.length}`,
    type: simType,
    region: randomRegion.name,
    date: simDateStr,
    probability: simProb,
    severity: 'Low',
    expectedAffectedArea: Math.floor(Math.random() * 300) + 50,
    estimatedClaims: Math.floor(simProb * 50) + 500,
    projectedLoss: Math.floor(simProb * 100000) + 1000000,
    recommendedAction: 'Review Coverage',
    rainfall: Math.floor(Math.random() * 50), // Low rain
    magnitude: simType === 'Earthquake' ? (Math.random() * 5 + 3).toFixed(1) : undefined,
  });
}

// Sort and limit
predicted.sort((a, b) => new Date(a.date) - new Date(b.date));
res.json(predicted.slice(0, 20)); // Up to 20 for 30-day coverage
});

export default router;