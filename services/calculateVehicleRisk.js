import { calculateDailyRisk } from "./calculateDailyRisk.js";

export function calculateVehicleRisk(carDailyData) {
  const dailyScores = Object.values(carDailyData).map(day =>
    calculateDailyRisk(day)
  );

  const avgDailyRisk =
    dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length;

  return {
    avgDailyRisk: Number(avgDailyRisk.toFixed(2)),
    vehicleRiskScore: Number((avgDailyRisk * 10).toFixed(1)) // 0–100
  };
}
