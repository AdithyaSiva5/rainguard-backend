import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadTelematicsData() {
  const filePath = path.join(__dirname, "../telematicsData.json");
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
}

router.get("/aggregateCarData", async (req, res) => {
  const carData = await loadTelematicsData();

  const result = {};
  for (const carId of Object.keys(carData)) {
    result[carId] = aggregateCarData(carData[carId]);
  }

  res.json(result);
});

export default router;



function aggregateCarData(carDailyData) {
  const days = Object.keys(carDailyData).length;

  let totals = {
    avgSpeed: 0,
    maxSpeed: 0,
    distance: 0,
    harshBrakes: 0,
    harshAccel: 0,
    idleTime: 0
  };

  for (const day of Object.values(carDailyData)) {
    totals.avgSpeed += day.average_speed;
    totals.maxSpeed += day.max_speed;
    totals.distance += day.distance_traveled;
    totals.harshBrakes += day.harsh_braking_events;
    totals.harshAccel += day.harsh_acceleration_events;
    totals.idleTime += day.idle_time_minutes;
  }

  return {
    days,
    avgSpeed: Number((totals.avgSpeed / days).toFixed(1)),
    avgMaxSpeed: Number((totals.maxSpeed / days).toFixed(1)),
    totalDistance: totals.distance,
    harshBrakesPerDay: Number((totals.harshBrakes / days).toFixed(1)),
    harshAccelPerDay: Number((totals.harshAccel / days).toFixed(1)),
    avgIdleTime: Number((totals.idleTime / days).toFixed(1))
  };
}