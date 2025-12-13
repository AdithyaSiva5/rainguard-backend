// DrivingPremiumCalc.js

const carData = await import('./telematicsData.json', { assert: { type: 'json' } });

// Extract the default export if needed (in case it's { default: { carA, carB } })
// But based on our earlier JSON, it's directly { carA, carB }
const data = carData.default || carData;

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

console.log("🚗 Car A - Good Driver:");
console.log(aggregateCarData(data.carA));

console.log("\n🚙 Car B - Harsh Driver:");
console.log(aggregateCarData(data.carB));