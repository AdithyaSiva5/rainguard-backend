import { riskConfig } from "../config/riskConfig.js";

export function calculateDailyRisk(day) {
  const {
    average_speed,
    max_speed,
    distance_traveled,
    harsh_braking_events,
    harsh_acceleration_events,
    harsh_cornering_events,
    speeding_events,
    phone_usage_distraction_events,
    idle_time_minutes,
    speed_limit,
    traffic_condition,
    road_type,
    country,
    region,
    trip_start_time,
    trip_end_time,
    engine_rpm_average,
    fuel_consumption
  } = day;

  // Use country and region for config (fallback to country if region not specified)
  const configKey = `${country}_${region}` in riskConfig ? `${country}_${region}` : country;
  const config = riskConfig[configKey] || riskConfig.default;

  // 1️⃣ Speed Risk (overspeed + speeding events)
  const overSpeed = max_speed - speed_limit;
  let speedRisk = 0;
  if (overSpeed > 0) {
    if (overSpeed <= config.speedTolerance) speedRisk = 1;
    else if (overSpeed <= config.speedTolerance * 2) speedRisk = 3;
    else speedRisk = 5;
  }
  speedRisk += speeding_events * config.speedingEventPenalty; // Add penalty per event

  // 2️⃣ Aggressive Driving Risk (braking + acceleration + cornering, normalized per 100km)
  const totalHarshEvents = harsh_braking_events + harsh_acceleration_events + (harsh_cornering_events || 0);
  const eventsPer100Km = (totalHarshEvents / distance_traveled) * 100;
  let aggressiveRisk = 0;
  if (eventsPer100Km >= config.aggressiveLowThreshold && eventsPer100Km < config.aggressiveHighThreshold) aggressiveRisk = 2;
  else if (eventsPer100Km >= config.aggressiveHighThreshold) aggressiveRisk = 5;

  // 3️⃣ Idle Risk
  let idleRisk = idle_time_minutes > config.idleHighThreshold ? 2 : idle_time_minutes > config.idleLowThreshold ? 1 : 0;

  // 4️⃣ Distraction Risk (phone usage)
  const distractionPer100Km = (phone_usage_distraction_events / distance_traveled) * 100;
  let distractionRisk = 0;
  if (distractionPer100Km > 0 && distractionPer100Km <= 1) distractionRisk = 1;
  else if (distractionPer100Km > 1 && distractionPer100Km <= 3) distractionRisk = 3;
  else if (distractionPer100Km > 3) distractionRisk = 5;

  // 5️⃣ Night Driving Risk
  const startHour = parseInt(trip_start_time.split(':')[0], 10);
  const endHour = parseInt(trip_end_time.split(':')[0], 10);
  let nightRisk = 0;
  if ((startHour >= 22 || startHour < 6) || (endHour >= 22 || endHour < 6) || (endHour < startHour)) { // Overnight trip
    nightRisk = config.nightDrivingPenalty;
  }

  // 6️⃣ Efficiency Risk (high RPM or fuel consumption indicates aggression)
  let efficiencyRisk = 0;
  if (engine_rpm_average > config.highRpmThreshold) efficiencyRisk += 1;
  if (fuel_consumption > config.highFuelThreshold) efficiencyRisk += 1;

  // 7️⃣ Contextual Multipliers
  const trafficMultiplier = config.trafficMultiplier[traffic_condition] || 1;
  const roadMultiplier = config.roadMultiplier[road_type] || 1;

  // Total Daily Risk (capped at 10)
  let dailyRisk = (speedRisk + aggressiveRisk + idleRisk + distractionRisk + nightRisk + efficiencyRisk) * trafficMultiplier * roadMultiplier;
  dailyRisk = Math.min(10, Number(dailyRisk.toFixed(2)));

  return dailyRisk;
}