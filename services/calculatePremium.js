import { premiumRules } from "../config/premiumRules.js";

export function calculatePremium(basePremium, riskScore) {
  const rule = premiumRules.find(r => riskScore <= r.maxRisk);
  return {
    finalPremium: Math.round(basePremium * rule.multiplier),
    multiplier: rule.multiplier
  };
}
