export const riskConfig = {
  default: {
    speedTolerance: 10, // km/h over limit
    speedingEventPenalty: 0.5, // per event
    aggressiveLowThreshold: 2, // events per 100km
    aggressiveHighThreshold: 5,
    idleLowThreshold: 5, // minutes
    idleHighThreshold: 15,
    nightDrivingPenalty: 2, // flat penalty if night driving
    highRpmThreshold: 2500, // average RPM
    highFuelThreshold: 10, // L/100km or similar
    trafficMultiplier: {
      light: 0.8,
      moderate: 1.0,
      heavy: 1.5
    },
    roadMultiplier: {
      highway: 0.9,
      city: 1.2
    }
  },
  India_Karnataka: {
    // Region-specific: e.g., more lenient on highways
    speedTolerance: 15,
    speedingEventPenalty: 0.4,
    aggressiveLowThreshold: 2.5,
    aggressiveHighThreshold: 6,
    idleLowThreshold: 6,
    idleHighThreshold: 18,
    nightDrivingPenalty: 2.5,
    highRpmThreshold: 2600,
    highFuelThreshold: 9,
    trafficMultiplier: {
      light: 0.7,
      moderate: 1.0,
      heavy: 1.6
    },
    roadMultiplier: {
      highway: 0.85,
      city: 1.3
    }
  },
  India_Maharashtra: {
    // Region-specific: e.g., stricter in urban areas like Mumbai
    speedTolerance: 10,
    speedingEventPenalty: 0.6,
    aggressiveLowThreshold: 1.5,
    aggressiveHighThreshold: 4,
    idleLowThreshold: 4,
    idleHighThreshold: 12,
    nightDrivingPenalty: 3,
    highRpmThreshold: 2400,
    highFuelThreshold: 11,
    trafficMultiplier: {
      light: 0.9,
      moderate: 1.1,
      heavy: 1.7
    },
    roadMultiplier: {
      highway: 0.95,
      city: 1.4
    }
  }
};