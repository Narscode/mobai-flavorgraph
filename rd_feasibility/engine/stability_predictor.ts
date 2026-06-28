/**
 * Module 2: Shelf-Life & Stability Risk Predictor
 * Evaluates pH, protein concentration, stabilizer selection, and flavor system compatibility.
 * Uses colloidal chemistry principles and kinetic models for shelf-life prediction.
 */

import type { FormulationInput, Ingredient } from './types';

export interface StabilizerCombination {
  combination: string[];
  synergisticScore: number;
  mechanism: string;
  recommendedConcentrationRange: string;
  costImpact: number;
}

export interface StabilityRiskResult {
  overallRiskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskBreakdown: {
    pHRisk: number;
    proteinStabilityRisk: number;
    stabilizerAdequacyRisk: number;
    flavorCompatibilityRisk: number;
    phaseSeparationRisk: number;
  };
  shelfLifeEstimate: {
    minDays: number;
    maxDays: number;
    confidenceLevel: 'low' | 'medium' | 'high';
  };
  recommendedStabilizerCombinations: StabilizerCombination[];
  suggestedPHAdjustment?: {
    targetPH: number;
    acidulant: string;
    amount: string;
  };
  warnings: string[];
}

// Known stabilizer synergies for protein beverages
const STABILIZER_SYNERGIES: Record<string, { synergisticWith: string[]; mechanism: string }> = {
  'xanthan-gum': {
    synergisticWith: ['carrageenan', 'locust-bean-gum', 'cmc'],
    mechanism: 'Creates synergistic viscosity and prevents serum separation through entanglement',
  },
  'carrageenan': {
    synergisticWith: ['xanthan-gum', 'locust-bean-gum', 'konjac'],
    mechanism: 'Forms weak gels that stabilize protein particles and prevent aggregation',
  },
  'cmc': {
    synergisticWith: ['xanthan-gum', 'low-methoxyl-pectin'],
    mechanism: 'Electrostatic repulsion and steric hindrance for protein stabilization',
  },
  'locust-bean-gum': {
    synergisticWith: ['xanthan-gum', 'carrageenan'],
    mechanism: 'Synergistic gel formation providing long-term stability',
  },
};

// pH-protein stability zones for common proteins
const PROTEIN_PH_OPTIMA: Record<string, { optimalRange: [number, number]; stableRange: [number, number] }> = {
  'whey-protein': { optimalRange: [3.5, 5.5], stableRange: [3.0, 6.5] },
  'soy-protein': { optimalRange: [4.0, 6.0], stableRange: [3.5, 8.0] },
  'pea-protein': { optimalRange: [4.5, 6.5], stableRange: [4.0, 8.5] },
  'casein': { optimalRange: [5.5, 6.5], stableRange: [4.5, 7.0] },
};

/**
 * Predict stability risk for a formulation
 */
export function predictStabilityRisk(
  formulation: FormulationInput,
  ingredients: Ingredient[]
): StabilityRiskResult {
  const warnings: string[] = [];

  // Calculate individual risk factors
  const pHRisk = calculatePHRisk(formulation.targetPH, ingredients, warnings);
  const proteinStabilityRisk = calculateProteinStabilityRisk(formulation, ingredients, warnings);
  const stabilizerAdequacyRisk = calculateStabilizerAdequacyRisk(formulation, ingredients, warnings);
  const flavorCompatibilityRisk = calculateFlavorCompatibilityRisk(ingredients, warnings);
  const phaseSeparationRisk = calculatePhaseSeparationRisk(formulation, ingredients, warnings);

  // Weighted overall risk score (0-100, lower is better)
  const overallRiskScore = Math.round(
    pHRisk * 0.25 +
    proteinStabilityRisk * 0.30 +
    stabilizerAdequacyRisk * 0.20 +
    flavorCompatibilityRisk * 0.10 +
    phaseSeparationRisk * 0.15
  );

  // Determine risk level
  const riskLevel = getRiskLevel(overallRiskScore);

  // Estimate shelf life
  const shelfLifeEstimate = estimateShelfLife(
    formulation,
    pHRisk,
    proteinStabilityRisk,
    stabilizerAdequacyRisk,
    warnings
  );

  // Get recommended stabilizer combinations
  const recommendedStabilizerCombinations = getRecommendedStabilizerCombinations(
    formulation,
    ingredients
  );

  // Suggest pH adjustment if needed
  const suggestedPHAdjustment = getSuggestedPHAdjustment(formulation, ingredients);

  return {
    overallRiskScore,
    riskLevel,
    riskBreakdown: {
      pHRisk,
      proteinStabilityRisk,
      stabilizerAdequacyRisk,
      flavorCompatibilityRisk,
      phaseSeparationRisk,
    },
    shelfLifeEstimate,
    recommendedStabilizerCombinations,
    suggestedPHAdjustment,
    warnings,
  };
}

/**
 * Calculate pH-related risk score
 */
function calculatePHRisk(targetPH: number, ingredients: Ingredient[], warnings: string[]): number {
  let risk = 30; // Base risk

  // Check if pH is in the "danger zone" for microbial growth (4.6 - 9.0)
  if (targetPH >= 4.6 && targetPH <= 9.0) {
    risk += 25;
    warnings.push('pH in intermediate range requires robust thermal treatment for microbial safety');
  }

  // Find protein ingredients and check their pH stability
  const proteinIngredients = ingredients.filter(i => i.category === 'protein-source');
  for (const protein of proteinIngredients) {
    const { pHStabilityMin, pHStabilityMax } = protein.properties;
    if (targetPH < pHStabilityMin || targetPH > pHStabilityMax) {
      risk += 30;
      warnings.push(`${protein.name} is outside optimal pH stability range (${pHStabilityMin}-${pHStabilityMax})`);
    } else if (targetPH < pHStabilityMin + 0.5 || targetPH > pHStabilityMax - 0.5) {
      risk += 10;
    }
  }

  // Check for acid/base compatibility
  if (targetPH < 3.5) {
    warnings.push('Very low pH may cause enamel erosion concerns and flavor issues');
    risk += 10;
  } else if (targetPH > 7.5) {
    warnings.push('High pH may affect vitamin stability (especially B vitamins and vitamin C)');
    risk += 15;
  }

  return Math.min(100, risk);
}

/**
 * Calculate protein stability risk based on concentration and processing
 */
function calculateProteinStabilityRisk(
  formulation: FormulationInput,
  ingredients: Ingredient[],
  warnings: string[]
): number {
  let risk = 20; // Base risk

  const proteinIngredients = ingredients.filter(i => i.category === 'protein-source');

  if (proteinIngredients.length === 0) {
    return 10; // No protein, low risk
  }

  // Calculate total protein percentage
  const totalProteinPercent = proteinIngredients.reduce((sum, ing) => {
    const formIng = formulation.ingredients.find(fi => fi.ingredientId === ing.id);
    return sum + (formIng?.percentage || 0);
  }, 0);

  // Higher protein concentration = higher stability risk
  if (totalProteinPercent > 5) {
    risk += 25;
    warnings.push('High protein concentration increases aggregation and sedimentation risk');
  } else if (totalProteinPercent > 3) {
    risk += 15;
  } else if (totalProteinPercent > 1) {
    risk += 5;
  }

  // Processing method impact
  if (formulation.processingMethod === 'Retort') {
    risk += 20;
    warnings.push('Retort processing may cause protein denaturation - ensure stabilizer system is robust');
  } else if (formulation.processingMethod === 'UHT') {
    risk += 10;
  } else if (formulation.processingMethod === 'HTST') {
    risk += 5;
  }

  // Check for protein-protein interactions
  if (proteinIngredients.length > 1) {
    risk += 10;
    warnings.push('Multiple protein sources may interact - test for compatibility');
  }

  return Math.min(100, risk);
}

/**
 * Calculate stabilizer adequacy risk
 */
function calculateStabilizerAdequacyRisk(
  formulation: FormulationInput,
  ingredients: Ingredient[],
  warnings: string[]
): number {
  let risk = 15; // Base risk

  const stabilizerIngredients = ingredients.filter(i => i.category === 'stabilizer');

  if (stabilizerIngredients.length === 0) {
    risk += 40;
    warnings.push('No stabilizers detected - consider adding stabilizers for improved shelf-life');
    return Math.min(100, risk);
  }

  // Calculate total stabilizer percentage
  const totalStabilizerPercent = stabilizerIngredients.reduce((sum, ing) => {
    const formIng = formulation.ingredients.find(fi => fi.ingredientId === ing.id);
    return sum + (formIng?.percentage || 0);
  }, 0);

  // Protein content vs stabilizer balance
  const proteinPercent = ingredients
    .filter(i => i.category === 'protein-source')
    .reduce((sum, ing) => {
      const formIng = formulation.ingredients.find(fi => fi.ingredientId === ing.id);
      return sum + (formIng?.percentage || 0);
    }, 0);

  if (proteinPercent > 0 && totalStabilizerPercent < 0.1) {
    risk += 30;
    warnings.push('Protein beverages require adequate stabilizer system (recommend 0.1-0.3%)');
  } else if (proteinPercent > 2 && totalStabilizerPercent < 0.15) {
    risk += 20;
  }

  // Check stabilizer synergy
  if (stabilizerIngredients.length > 1) {
    const hasSynergy = checkStabilizerSynergy(stabilizerIngredients);
    if (!hasSynergy) {
      risk += 15;
      warnings.push('Stabilizer combination may not be synergistic - consider Xanthan + CMC or Carrageenan combinations');
    }
  }

  return Math.min(100, risk);
}

/**
 * Check if stabilizers have known synergistic combinations
 */
function checkStabilizerSynergy(stabilizers: Ingredient[]): boolean {
  const stabilizerIds = stabilizers.map(s => s.id.toLowerCase());

  for (const stab of stabilizers) {
    const stabKey = Object.keys(STABILIZER_SYNERGIES).find(key =>
      stab.id.toLowerCase().includes(key) || stab.name.toLowerCase().includes(key)
    );

    if (stabKey) {
      const synergy = STABILIZER_SYNERGIES[stabKey];
      for (const synergisticStab of synergy.synergisticWith) {
        if (stabilizerIds.some(id => id.includes(synergisticStab))) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Calculate flavor compatibility risk
 */
function calculateFlavorCompatibilityRisk(ingredients: Ingredient[], warnings: string[]): number {
  let risk = 20; // Base risk

  // Check for flavor ingredients
  const flavorIngredients = ingredients.filter(i => i.category === 'flavor-system');

  if (flavorIngredients.length > 3) {
    risk += 15;
    warnings.push('Complex flavor systems may have interaction effects - conduct stability testing');
  }

  // Check for pH-sensitive flavors
  const sensitiveFlavors = ['fruit-flavor', 'citrus', 'berry'];
  for (const flavor of flavorIngredients) {
    if (sensitiveFlavors.some(sf => flavor.name.toLowerCase().includes(sf))) {
      risk += 10;
      warnings.push(`${flavor.name} may degrade at extreme pH levels`);
    }
  }

  // Check for protein-flavor interactions
  const hasProtein = ingredients.some(i => i.category === 'protein-source');
  if (hasProtein && flavorIngredients.length > 0) {
    risk += 10;
    warnings.push('Protein-flavor binding may occur - consider encapsulation or adjusted flavor levels');
  }

  return Math.min(100, risk);
}

/**
 * Calculate phase separation risk
 */
function calculatePhaseSeparationRisk(
  formulation: FormulationInput,
  ingredients: Ingredient[],
  warnings: string[]
): number {
  let risk = 15; // Base risk

  const proteinPercent = ingredients
    .filter(i => i.category === 'protein-source')
    .reduce((sum, ing) => {
      const formIng = formulation.ingredients.find(fi => fi.ingredientId === ing.id);
      return sum + (formIng?.percentage || 0);
    }, 0);

  const stabilizerPercent = ingredients
    .filter(i => i.category === 'stabilizer')
    .reduce((sum, ing) => {
      const formIng = formulation.ingredients.find(fi => fi.ingredientId === ing.id);
      return sum + (formIng?.percentage || 0);
    }, 0);

  // High protein + low stabilizer = high separation risk
  if (proteinPercent > 2 && stabilizerPercent < 0.1) {
    risk += 40;
    warnings.push('High risk of serum separation without adequate stabilizer');
  } else if (proteinPercent > 1 && stabilizerPercent < 0.05) {
    risk += 20;
    warnings.push('Moderate risk of phase separation - recommend increasing stabilizer');
  }

  // Fat content impact
  const fatIngredients = ingredients.filter(i => i.name.toLowerCase().includes('oil') || i.name.toLowerCase().includes('fat'));
  if (fatIngredients.length > 0) {
    risk += 15;
    warnings.push('Emulsification system required for fat-containing formulation');
  }

  return Math.min(100, risk);
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): StabilityRiskResult['riskLevel'] {
  if (score <= 25) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

/**
 * Estimate shelf life based on formulation characteristics
 */
function estimateShelfLife(
  formulation: FormulationInput,
  pHRisk: number,
  proteinRisk: number,
  stabilizerRisk: number,
  warnings: string[]
): StabilityRiskResult['shelfLifeEstimate'] {
  // Base shelf life from processing method
  let baseDays: number;
  switch (formulation.processingMethod) {
    case 'ASEPTIC':
    case 'UHT':
      baseDays = 180;
      break;
    case 'Retort':
      baseDays = 365;
      break;
    case 'HTST':
      baseDays = 30;
      break;
    case 'Cold-fill':
      baseDays = 60;
      break;
    default:
      baseDays = 90;
  }

  // Adjust based on risk factors
  let adjustmentFactor = 1;
  if (pHRisk > 50) adjustmentFactor *= 0.7;
  if (proteinRisk > 50) adjustmentFactor *= 0.8;
  if (stabilizerRisk > 50) adjustmentFactor *= 0.85;

  const estimatedDays = Math.round(baseDays * adjustmentFactor);

  // Calculate confidence level based on available data
  let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
  if (warnings.length > 3) {
    confidenceLevel = 'low';
  } else if (warnings.length <= 2 && pHRisk + proteinRisk + stabilizerRisk < 50) {
    confidenceLevel = 'high';
  }

  return {
    minDays: Math.round(estimatedDays * 0.8),
    maxDays: Math.round(estimatedDays * 1.2),
    confidenceLevel,
  };
}

/**
 * Get recommended stabilizer combinations
 */
function getRecommendedStabilizerCombinations(
  formulation: FormulationInput,
  ingredients: Ingredient[]
): StabilizerCombination[] {
  const combinations: StabilizerCombination[] = [];
  const hasProtein = ingredients.some(i => i.category === 'protein-source');
  const hasWheyProtein = ingredients.some(i => i.name.toLowerCase().includes('whey'));

  if (hasProtein) {
    // Standard protein beverage combinations
    combinations.push({
      combination: ['Xanthan Gum', 'CMC (Low substitution)'],
      synergisticScore: 88,
      mechanism: 'Combines viscosity control with protein stabilization through electrostatic repulsion',
      recommendedConcentrationRange: 'Xanthan: 0.02-0.05%, CMC: 0.1-0.2%',
      costImpact: 0.08,
    });

    combinations.push({
      combination: ['Kappa Carrageenan', 'Locust Bean Gum'],
      synergisticScore: 82,
      mechanism: 'Forms synergistic weak gels that trap water and prevent serum separation',
      recommendedConcentrationRange: 'Kappa: 0.02-0.05%, LBG: 0.05-0.1%',
      costImpact: 0.12,
    });
  }

  if (hasWheyProtein) {
    // Whey-specific combinations
    combinations.push({
      combination: ['Sodium Carboxymethyl Cellulose', 'Xanthan Gum', 'Citric Acid Ester'],
      synergisticScore: 92,
      mechanism: 'Triple-action system: viscosity, protein protection, and emulsion stabilization',
      recommendedConcentrationRange: 'CMC: 0.15%, Xanthan: 0.03%, CITREM: 0.05%',
      costImpact: 0.15,
    });
  }

  return combinations;
}

/**
 * Get suggested pH adjustment if current pH is suboptimal
 */
function getSuggestedPHAdjustment(
  formulation: FormulationInput,
  ingredients: Ingredient[]
): StabilityRiskResult['suggestedPHAdjustment'] | undefined {
  const proteinIngredients = ingredients.filter(i => i.category === 'protein-source');

  if (proteinIngredients.length === 0) {
    return undefined;
  }

  // Find optimal pH for protein stability
  const targetPH = formulation.targetPH;

  for (const protein of proteinIngredients) {
    const { pHStabilityMin, pHStabilityMax } = protein.properties;
    const midpoint = (pHStabilityMin + pHStabilityMax) / 2;

    if (targetPH < pHStabilityMin || targetPH > pHStabilityMax) {
      // Suggest adjustment to midpoint of stable range
      return {
        targetPH: Math.round(midpoint * 10) / 10,
        acidulant: targetPH > midpoint ? 'Citric Acid' : 'Sodium Hydroxide',
        amount: `${Math.abs(targetPH - midpoint).toFixed(1)} pH units adjustment required`,
      };
    }
  }

  return undefined;
}
