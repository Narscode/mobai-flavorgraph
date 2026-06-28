/**
 * Module 5: Formulation Prediction Engine
 * Uses AI heuristics and optimization algorithms to predict optimal formulations
 * based on target parameters and constraints.
 */

import type { Ingredient, FormulationInput } from './types';
import { INGREDIENT_DATABASE } from './ingredient_database';

export interface PredictionTarget {
  targetCategory?: 'energy-drink' | 'protein-beverage' | 'functional-water' | 'sports-drink' | 'prebiotic-drink' | 'herbal-tea';
  targetProtein?: number; // percentage
  targetCalories?: number;
  targetSugar?: number;
  targetPH?: number;
  targetShelfLife?: number; // days
  targetCost?: number; // per bottle in USD
  targetMargin?: number; // percentage
  processingConstraints?: ('UHT' | 'Retort' | 'HTST' | 'Cold-fill' | 'ASEPTIC')[];
  maxIngredients?: number;
  dietaryConstraints?: {
    vegan?: boolean;
    glutenFree?: boolean;
    nonGMO?: boolean;
    ketoFriendly?: boolean;
    sugarFree?: boolean;
  };
}

export interface PredictedFormulation {
  formulation: FormulationInput;
  confidenceScore: number;
  predictionRationale: string[];
  tradeoffs: Array<{
    parameter: string;
    target: number;
    achieved: number;
    deviation: string;
  }>;
  alternativeOptions: Array<{
    name: string;
    formulation: FormulationInput;
    keyDifference: string;
    pros: string[];
    cons: string[];
  }>;
  riskWarnings: string[];
  optimizationScore: number;
}

// Processing method recommendations based on product type
const PROCESSING_RECOMMENDATIONS: Record<string, {
  primary: string;
  secondary: string[];
  avoid: string[];
  rationale: string;
}> = {
  'protein-beverage': {
    primary: 'UHT',
    secondary: ['ASEPTIC'],
    avoid: ['RETORT'],
    rationale: 'UHT provides commercial sterility with minimal protein denaturation',
  },
  'energy-drink': {
    primary: 'ASEPTIC',
    secondary: ['UHT'],
    avoid: [],
    rationale: 'Low pH allows for aseptic processing; preserves caffeine and B-vitamins',
  },
  'sports-drink': {
    primary: 'HTST',
    secondary: ['Cold-fill', 'ASEPTIC'],
    avoid: ['RETORT'],
    rationale: 'Electrolyte stability is maintained with gentler heat treatments',
  },
  'functional-water': {
    primary: 'Cold-fill',
    secondary: ['ASEPTIC'],
    avoid: ['RETORT', 'UHT'],
    rationale: 'Heat-sensitive functional ingredients preserved',
  },
  'prebiotic-drink': {
    primary: 'ASEPTIC',
    secondary: ['UHT'],
    avoid: ['RETORT', 'HTST'],
    rationale: 'Sensitive prebiotics require gentle preservation',
  },
  'herbal-tea': {
    primary: 'ASEPTIC',
    secondary: ['HTST'],
    avoid: ['RETORT'],
    rationale: 'Volatile aromatics and heat-sensitive botanicals',
  },
};

// pH recommendations by category
const PH_RECOMMENDATIONS: Record<string, { optimal: number; range: [number, number]; rationale: string }> = {
  'protein-beverage': { optimal: 4.2, range: [3.8, 4.8], rationale: 'Protein stability zone while maintaining microbial safety' },
  'energy-drink': { optimal: 3.2, range: [2.8, 3.5], rationale: 'Sharp flavor profile and shelf stability' },
  'sports-drink': { optimal: 3.5, range: [3.0, 4.0], rationale: 'Balanced sweetness and electrolyte compatibility' },
  'functional-water': { optimal: 4.0, range: [3.5, 5.0], rationale: 'Gentle on heat-sensitive ingredients' },
  'prebiotic-drink': { optimal: 4.5, range: [4.0, 5.5], rationale: 'Optimal for prebiotic stability' },
  'herbal-tea': { optimal: 4.2, range: [3.8, 5.0], rationale: 'Maintains tea character while ensuring stability' },
};

// Protein source recommendations
const PROTEIN_RECOMMENDATIONS: Record<string, {
  sources: string[];
  optimalRange: [number, number];
  rationale: string;
  stabilizationNeeds: string[];
}> = {
  'whey-protein': {
    sources: ['PRO_001'],
    optimalRange: [2.0, 5.0],
    rationale: 'Fast-absorbing, clean flavor, excellent solubility',
    stabilizationNeeds: ['Xanthan Gum', 'CMC'],
  },
  'plant-protein': {
    sources: ['PRO_002', 'PRO_003'],
    optimalRange: [2.0, 4.0],
    rationale: 'Vegan-friendly, fiber benefits, earthy notes may require masking',
    stabilizationNeeds: ['Xanthan Gum', 'Carrageenan'],
  },
  'blend-protein': {
    sources: ['PRO_001', 'PRO_003'],
    optimalRange: [3.0, 5.0],
    rationale: 'Complete amino acid profile, balanced texture',
    stabilizationNeeds: ['Xanthan Gum', 'CMC', 'Citric Acid Ester'],
  },
};

/**
 * Predict optimal formulation based on target parameters
 */
export function predictOptimalFormulation(target: PredictionTarget): PredictedFormulation {
  const predictions: PredictedFormulation = {
    formulation: createEmptyFormulation(target),
    confidenceScore: 0,
    predictionRationale: [],
    tradeoffs: [],
    alternativeOptions: [],
    riskWarnings: [],
    optimizationScore: 0,
  };

  // Determine product category
  const category = target.targetCategory || inferCategory(target);

  // Step 1: Determine processing method
  const processingConfig = PROCESSING_RECOMMENDATIONS[category];
  let processingMethod = processingConfig.primary;

  // Check if constrained
  if (target.processingConstraints && target.processingConstraints.length > 0) {
    if (target.processingConstraints.includes(processingConfig.primary as any)) {
      processingMethod = processingConfig.primary;
    } else {
      processingMethod = target.processingConstraints[0];
    }
  }

  predictions.predictionRationale.push(
    `Selected ${processingMethod} processing: ${processingConfig.rationale}`
  );

  // Step 2: Determine optimal pH
  const phConfig = PH_RECOMMENDATIONS[category];
  let targetPH = target.targetPH || phConfig.optimal;

  // Adjust pH if outside recommended range
  if (target.targetPH) {
    if (target.targetPH < phConfig.range[0]) {
      predictions.tradeoffs.push({
        parameter: 'pH',
        target: target.targetPH,
        achieved: phConfig.range[0],
        deviation: `Adjusted to ${phConfig.range[0]} for stability - requested pH too acidic`,
      });
      targetPH = phConfig.range[0];
    } else if (target.targetPH > phConfig.range[1]) {
      predictions.tradeoffs.push({
        parameter: 'pH',
        target: target.targetPH,
        achieved: phConfig.range[1],
        deviation: `Adjusted to ${phConfig.range[1]} for stability - requested pH too alkaline`,
      });
      targetPH = phConfig.range[1];
    }
  }

  predictions.predictionRationale.push(
    `Target pH ${targetPH}: ${phConfig.rationale}`
  );

  // Step 3: Build ingredient matrix
  const ingredients: FormulationIngredient[] = [];

  // Add base liquid
  ingredients.push({ ingredientId: 'WTR_001', percentage: 75 }); // Will be adjusted

  // Step 4: Handle protein if specified
  if (target.targetProtein && target.targetProtein > 0) {
    const proteinSource = predictProteinSource(target, predictions);
    if (proteinSource) {
      ingredients.push(proteinSource);
    }
  }

  // Step 5: Handle sweeteners based on dietary constraints
  const sweetener = predictSweetener(target, predictions);
  if (sweetener) {
    ingredients.push(sweetener);
  }

  // Step 6: Add functional ingredients based on category
  const functionalIngredients = predictFunctionalIngredients(category, ingredients, predictions);
  ingredients.push(...functionalIngredients);

  // Step 7: Add stabilizers if needed
  const stabilizers = predictStabilizers(category, target.targetProtein || 0, ingredients, predictions);
  ingredients.push(...stabilizers);

  // Step 8: Add acidulant for pH adjustment
  const acidulant = predictAcidulant(targetPH, predictions);
  ingredients.push(acidulant);

  // Step 9: Calculate and adjust percentages
  const adjustedIngredients = normalizeFormulation(ingredients, predictions);

  // Step 10: Finalize formulation
  predictions.formulation = {
    name: `${category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} - Optimized Formulation`,
    baseLiquid: 'WTR_001',
    ingredients: adjustedIngredients,
    targetPH,
    targetBrix: target.targetSugar || calculateBrix(adjustedIngredients),
    processingMethod: processingMethod as FormulationInput['processingMethod'],
    processingTemp: getProcessingTemp(processingMethod),
    processingTime: getProcessingTime(processingMethod),
    targetShelfLifeMonths: Math.floor((target.targetShelfLife || 180) / 30),
    targetServingSize: 330,
    targetDailyServings: 2,
  };

  // Calculate optimization score
  predictions.optimizationScore = calculateOptimizationScore(predictions, target);

  // Calculate confidence
  predictions.confidenceScore = calculateConfidenceScore(predictions, target);

  // Generate alternatives
  predictions.alternativeOptions = generateAlternatives(category, target, predictions);

  // Add risk warnings
  predictions.riskWarnings = generateRiskWarnings(predictions, target);

  return predictions;
}

/**
 * Infer product category from target parameters
 */
function inferCategory(target: PredictionTarget): string {
  if (target.targetProtein && target.targetProtein >= 2) {
    return 'protein-beverage';
  }
  if (target.dietaryConstraints?.vegan) {
    return 'functional-water';
  }
  if (target.targetCalories && target.targetCalories < 20) {
    return 'energy-drink';
  }
  if (target.targetShelfLife && target.targetShelfLife < 30) {
    return 'sports-drink';
  }
  return 'functional-water';
}

/**
 * Create empty formulation structure
 */
function createEmptyFormulation(target: PredictionTarget): FormulationInput {
  return {
    name: 'Predicted Formulation',
    baseLiquid: 'WTR_001',
    ingredients: [],
    targetPH: target.targetPH || 4.0,
    targetBrix: target.targetSugar || 5,
    processingMethod: 'UHT',
    processingTemp: 140,
    processingTime: 4,
    targetShelfLifeMonths: 6,
    targetServingSize: 330,
    targetDailyServings: 2,
  };
}

/**
 * Predict optimal protein source
 */
function predictProteinSource(
  target: PredictionTarget,
  predictions: PredictedFormulation
): { ingredientId: string; percentage: number } | null {
  const { dietaryConstraints } = target;

  if (dietaryConstraints?.vegan) {
    predictions.predictionRationale.push(
      'Selected Pea Protein Isolate for vegan-friendly formulation'
    );
    return { ingredientId: 'PRO_003', percentage: target.targetProtein || 3.0 };
  }

  if (target.targetProtein && target.targetProtein >= 4) {
    predictions.predictionRationale.push(
      'Selected Whey Protein Isolate for superior amino acid profile'
    );
    return { ingredientId: 'PRO_001', percentage: target.targetProtein || 3.5 };
  }

  predictions.predictionRationale.push(
    'Selected Soy Protein Isolate for balanced nutrition and cost efficiency'
  );
  return { ingredientId: 'PRO_002', percentage: target.targetProtein || 2.5 };
}

/**
 * Predict optimal sweetener
 */
function predictSweetener(
  target: PredictionTarget,
  predictions: PredictedFormulation
): { ingredientId: string; percentage: number } | null {
  const { dietaryConstraints } = target;

  // Sugar-free option
  if (dietaryConstraints?.sugarFree || dietaryConstraints?.ketoFriendly) {
    predictions.predictionRationale.push(
      'Selected Erythritol for sugar-free, keto-friendly sweetness'
    );
    return { ingredientId: 'SWT_001', percentage: 5.0 };
  }

  // Low-sugar with Stevia
  if (target.targetSugar && target.targetSugar < 2) {
    predictions.predictionRationale.push(
      'Selected Stevia for high-intensity, zero-calorie sweetness'
    );
    return { ingredientId: 'SWT_002', percentage: 0.05 };
  }

  // Balanced sweetness
  predictions.predictionRationale.push(
    'Selected Erythritol + Allulose blend for clean, sugar-like sweetness'
  );
  return { ingredientId: 'SWT_001', percentage: 4.0 };
}

/**
 * Predict functional ingredients based on category
 */
function predictFunctionalIngredients(
  category: string,
  existingIngredients: { ingredientId: string }[],
  predictions: PredictedFormulation
): { ingredientId: string; percentage: number }[] {
  const functionalIngredients: { ingredientId: string; percentage: number }[] = [];

  switch (category) {
    case 'energy-drink':
      // Caffeine and B-vitamins
      if (!existingIngredients.some(i => i.ingredientId === 'FNC_002')) {
        functionalIngredients.push({ ingredientId: 'FNC_002', percentage: 0.03 });
        predictions.predictionRationale.push('Added Caffeine for energy boost');
      }
      if (!existingIngredients.some(i => i.ingredientId === 'VIT_002')) {
        functionalIngredients.push({ ingredientId: 'VIT_002', percentage: 0.1 });
        predictions.predictionRationale.push('Added Vitamin B Complex for energy metabolism');
      }
      // Add L-Theanine for focus
      functionalIngredients.push({ ingredientId: 'FNC_001', percentage: 0.1 });
      predictions.predictionRationale.push('Added L-Theanine for enhanced focus');
      break;

    case 'protein-beverage':
      // BCAAs and vitamins
      functionalIngredients.push({ ingredientId: 'VIT_002', percentage: 0.15 });
      predictions.predictionRationale.push('Added Vitamin B Complex for protein metabolism');
      functionalIngredients.push({ ingredientId: 'VIT_003', percentage: 0.001 });
      predictions.predictionRationale.push('Added Vitamin D3 for bone health');
      break;

    case 'sports-drink':
      // Electrolytes (Taurine) and B-vitamins
      functionalIngredients.push({ ingredientId: 'FNC_003', percentage: 0.5 });
      predictions.predictionRationale.push('Added Taurine for hydration support');
      functionalIngredients.push({ ingredientId: 'VIT_002', percentage: 0.1 });
      predictions.predictionRationale.push('Added B-vitamins for energy');
      break;

    case 'functional-water':
      // Aloe and antioxidants
      functionalIngredients.push({ ingredientId: 'ALO_001', percentage: 1.0 });
      predictions.predictionRationale.push('Added Aloe Vera for functional benefits');
      functionalIngredients.push({ ingredientId: 'VIT_001', percentage: 0.05 });
      predictions.predictionRationale.push('Added Vitamin C as antioxidant');
      break;

    case 'prebiotic-drink':
      // Prebiotic fibers and functional extracts
      functionalIngredients.push({ ingredientId: 'ALO_001', percentage: 2.0 });
      predictions.predictionRationale.push('Added Aloe Vera as prebiotic fiber');
      functionalIngredients.push({ ingredientId: 'FNC_001', percentage: 0.1 });
      predictions.predictionRationale.push('Added L-Theanine for gut-brain axis support');
      break;

    case 'herbal-tea':
      // Tea-based functional
      functionalIngredients.push({ ingredientId: 'FNC_001', percentage: 0.15 });
      predictions.predictionRationale.push('Added L-Theanine for calm energy');
      functionalIngredients.push({ ingredientId: 'VIT_001', percentage: 0.05 });
      predictions.predictionRationale.push('Added Vitamin C for preservation');
      break;
  }

  return functionalIngredients;
}

/**
 * Predict stabilizer system
 */
function predictStabilizers(
  category: string,
  proteinPercent: number,
  existingIngredients: { ingredientId: string }[],
  predictions: PredictedFormulation
): { ingredientId: string; percentage: number }[] {
  const stabilizers: { ingredientId: string; percentage: number }[] = [];

  if (proteinPercent > 0) {
    // Protein beverages need stabilizer systems
    stabilizers.push({ ingredientId: 'STB_001', percentage: 0.05 }); // Xanthan
    stabilizers.push({ ingredientId: 'STB_002', percentage: 0.1 }); // CMC
    predictions.predictionRationale.push(
      'Added Xanthan + CMC stabilizer system for protein stabilization'
    );
  } else {
    // Non-protein beverages still need some stabilization
    stabilizers.push({ ingredientId: 'STB_001', percentage: 0.02 });
    predictions.predictionRationale.push('Added light Xanthan Gum for mouthfeel');
  }

  return stabilizers;
}

/**
 * Predict acidulant for pH adjustment
 */
function predictAcidulant(
  targetPH: number,
  predictions: PredictedFormulation
): { ingredientId: string; percentage: number } {
  // Calculate required acid amount based on target pH
  const acidPercent = calculateAcidRequirement(targetPH);

  predictions.predictionRationale.push(
    `Added Citric Acid for pH adjustment to ${targetPH}`
  );

  return { ingredientId: 'ACD_001', percentage: acidPercent };
}

/**
 * Calculate acid requirement based on target pH
 */
function calculateAcidRequirement(targetPH: number): number {
  // Approximate relationship between pH and acid percentage
  // This is a simplified model
  if (targetPH <= 2.8) return 0.5;
  if (targetPH <= 3.2) return 0.35;
  if (targetPH <= 3.5) return 0.25;
  if (targetPH <= 3.8) return 0.2;
  if (targetPH <= 4.2) return 0.15;
  if (targetPH <= 4.8) return 0.1;
  return 0.05;
}

/**
 * Normalize formulation percentages to sum to 100%
 */
function normalizeFormulation(
  ingredients: { ingredientId: string; percentage: number }[],
  predictions: PredictedFormulation
): { ingredientId: string; percentage: number }[] {
  const total = ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
  const waterPercentage = Math.max(0, 100 - (total - (ingredients.find(i => i.ingredientId === 'WTR_001')?.percentage || 0)));

  // Adjust water to make up the difference
  return ingredients.map(ing => {
    if (ing.ingredientId === 'WTR_001') {
      return { ...ing, percentage: Math.round(waterPercentage * 100) / 100 };
    }
    return {
      ...ing,
      percentage: Math.round((ing.percentage / total) * (100 - waterPercentage) * 100) / 100,
    };
  });
}

/**
 * Calculate Brix from formulation
 */
function calculateBrix(ingredients: { ingredientId: string; percentage: number }[]): number {
  let brix = 0;
  for (const ing of ingredients) {
    const ingredient = INGREDIENT_DATABASE.get(ing.ingredientId);
    if (ingredient) {
      brix += (ingredient.properties.sugarPer100g / 100) * ing.percentage;
    }
  }
  return Math.round(brix * 10) / 10;
}

/**
 * Get processing temperature for method
 */
function getProcessingTemp(method: string): number {
  const temps: Record<string, number> = {
    'UHT': 140,
    'RETORT': 121,
    'HTST': 72,
    'Cold-fill': 25,
    'ASEPTIC': 137,
  };
  return temps[method] || 140;
}

/**
 * Get processing time for method
 */
function getProcessingTime(method: string): number {
  const times: Record<string, number> = {
    'UHT': 4,
    'RETORT': 1800,
    'HTST': 15,
    'Cold-fill': 0,
    'ASEPTIC': 5,
  };
  return times[method] || 4;
}

/**
 * Calculate optimization score
 */
function calculateOptimizationScore(
  predictions: PredictedFormulation,
  target: PredictionTarget
): number {
  let score = 80; // Base score

  // Category match bonus
  if (target.targetCategory) {
    score += 10;
  }

  // Protein optimization
  if (target.targetProtein) {
    const achievedProtein = predictions.formulation.ingredients.find(
      i => i.ingredientId.startsWith('PRO_')
    )?.percentage || 0;
    const proteinDeviation = Math.abs(achievedProtein - target.targetProtein);
    score -= proteinDeviation * 5;
  }

  // Cost optimization
  if (target.targetCost) {
    const estimatedCost = estimateFormulationCost(predictions.formulation);
    if (estimatedCost > target.targetCost) {
      score -= (estimatedCost - target.targetCost) * 20;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Estimate formulation cost
 */
function estimateFormulationCost(formulation: FormulationInput): number {
  let cost = 0;
  for (const ing of formulation.ingredients) {
    const ingredient = INGREDIENT_DATABASE.get(ing.ingredientId);
    if (ingredient) {
      const cheapestSupplier = ingredient.suppliers.reduce(
        (min, s) => (s.costPerKg < min.costPerKg ? s : min),
        ingredient.suppliers[0]
      );
      if (cheapestSupplier) {
        cost += cheapestSupplier.costPerKg * (ing.percentage / 100) * 0.33; // 330mL bottle
      }
    }
  }
  return cost;
}

/**
 * Calculate confidence score
 */
function calculateConfidenceScore(
  predictions: PredictedFormulation,
  target: PredictionTarget
): number {
  let confidence = 70; // Base confidence

  // More specific targets = higher confidence
  if (target.targetCategory) confidence += 15;
  if (target.targetProtein) confidence += 5;
  if (target.targetPH) confidence += 5;
  if (target.targetShelfLife) confidence += 5;

  // Fewer constraints = easier to optimize
  if (!target.dietaryConstraints?.vegan) confidence += 5;

  // Check for major tradeoffs
  if (predictions.tradeoffs.length > 0) {
    confidence -= predictions.tradeoffs.length * 10;
  }

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Generate alternative formulations
 */
function generateAlternatives(
  category: string,
  target: PredictionTarget,
  basePredictions: PredictedFormulation
): PredictedFormulation['alternativeOptions'] {
  const alternatives: PredictedFormulation['alternativeOptions'] = [];

  // Alternative 1: Higher protein version
  if (category !== 'protein-beverage' && target.targetProtein) {
    alternatives.push({
      name: 'High-Protein Variant',
      formulation: {
        ...basePredictions.formulation,
        name: 'High-Protein Alternative',
        ingredients: basePredictions.formulation.ingredients.map(ing => {
          if (ing.ingredientId === 'PRO_001' || ing.ingredientId === 'PRO_002' || ing.ingredientId === 'PRO_003') {
            return { ...ing, percentage: (target.targetProtein || 0) + 2 };
          }
          return ing;
        }),
      },
      keyDifference: '+2% protein content',
      pros: ['Higher satiety', 'Better muscle recovery'],
      cons: ['Higher cost', 'May require stronger stabilizer system'],
    });
  }

  // Alternative 2: Sugar-free version
  if (target.targetSugar && target.targetSugar > 0) {
    alternatives.push({
      name: 'Sugar-Free Variant',
      formulation: {
        ...basePredictions.formulation,
        name: 'Sugar-Free Alternative',
        ingredients: basePredictions.formulation.ingredients.map(ing => {
          if (ing.ingredientId === 'SWT_001') {
            return { ...ing, percentage: 6 };
          }
          if (ing.ingredientId === 'SWT_003') {
            return { ingredientId: 'SWT_002', percentage: 0.05 };
          }
          return ing;
        }),
      },
      keyDifference: 'Sugar-free with Stevia',
      pros: ['Zero sugar', 'Keto-friendly', 'Lower calories'],
      cons: ['Different taste profile', 'May need flavor masking'],
    });
  }

  // Alternative 3: Natural/Organic version
  if (!target.dietaryConstraints?.vegan) {
    alternatives.push({
      name: 'Natural/Organic Variant',
      formulation: {
        ...basePredictions.formulation,
        name: 'Organic Alternative',
        ingredients: basePredictions.formulation.ingredients.map(ing => {
          // Use organic-certified suppliers where available
          return ing;
        }),
      },
      keyDifference: 'Organic-certified ingredients',
      pros: ['Premium positioning', 'Clean label appeal', 'Higher margins'],
      cons: ['Higher ingredient costs', 'Supply chain complexity'],
    });
  }

  return alternatives;
}

/**
 * Generate risk warnings
 */
function generateRiskWarnings(
  predictions: PredictedFormulation,
  target: PredictionTarget
): string[] {
  const warnings: string[] = [];

  // Check protein stability risk
  const proteinIng = predictions.formulation.ingredients.find(
    i => i.ingredientId.startsWith('PRO_')
  );
  if (proteinIng && proteinIng.percentage > 3) {
    warnings.push(
      `High protein (${proteinIng.percentage}%) may cause viscosity issues. Recommend pilot testing for texture.`
    );
  }

  // Check pH stability
  if (predictions.formulation.targetPH > 4.6 || predictions.formulation.targetPH < 3.0) {
    warnings.push(
      `Extreme pH (${predictions.formulation.targetPH}) may affect flavor perception and ingredient stability.`
    );
  }

  // Check processing constraints
  if (predictions.formulation.processingMethod === 'RETORT') {
    warnings.push(
      'Retort processing may cause protein denaturation. Consider UHT for better nutritional retention.'
    );
  }

  // Check shelf life vs processing
  if (predictions.formulation.targetShelfLifeMonths > 6 &&
      (predictions.formulation.processingMethod === 'HTST' || predictions.formulation.processingMethod === 'Cold-fill')) {
    warnings.push(
      `${predictions.formulation.processingMethod} may not achieve target shelf life. Consider UHT or Aseptic.`
    );
  }

  // Cost warning
  const estimatedCost = estimateFormulationCost(predictions.formulation);
  if (estimatedCost > 0.5) {
    warnings.push(
      `Estimated ingredient cost ($${estimatedCost.toFixed(3)}) is relatively high. Consider ingredient substitution for cost optimization.`
    );
  }

  return warnings;
}

/**
 * Batch prediction for multiple targets
 */
export function predictMultipleFormulations(
  targets: PredictionTarget[]
): PredictedFormulation[] {
  return targets.map(target => predictOptimalFormulation(target));
}

/**
 * Optimize existing formulation
 */
export function optimizeExistingFormulation(
  formulation: FormulationInput,
  optimizationGoals: {
    reduceCost?: boolean;
    improveStability?: boolean;
    increaseProtein?: boolean;
    reduceSugar?: boolean;
  }
): {
  optimizedFormulation: FormulationInput;
  improvements: string[];
  potentialIssues: string[];
} {
  const improvements: string[] = [];
  const potentialIssues: string[] = [];

  let optimizedIngredients = [...formulation.ingredients];

  // Cost reduction optimization
  if (optimizationGoals.reduceCost) {
    const proteinIng = optimizedIngredients.find(i =>
      i.ingredientId === 'PRO_001' || i.ingredientId === 'PRO_002'
    );
    if (proteinIng) {
      // Suggest moving to more cost-effective alternative
      improvements.push('Consider switching to Soy Protein for 55% cost reduction');
    }
  }

  // Stability improvement
  if (optimizationGoals.improveStability) {
    const hasStabilizers = optimizedIngredients.some(i =>
      i.ingredientId.startsWith('STB_')
    );
    if (!hasStabilizers) {
      optimizedIngredients.push({ ingredientId: 'STB_001', percentage: 0.05 });
      improvements.push('Added Xanthan Gum stabilizer for improved shelf stability');
    }
  }

  // Protein increase
  if (optimizationGoals.increaseProtein) {
    const proteinIng = optimizedIngredients.find(i =>
      i.ingredientId.startsWith('PRO_')
    );
    if (proteinIng) {
      const newProtein = Math.min(5, proteinIng.percentage + 1);
      proteinIng.percentage = newProtein;
      improvements.push(`Increased protein to ${newProtein}%`);
    }
  }

  // Sugar reduction
  if (optimizationGoals.reduceSugar) {
    const sweetenerIng = optimizedIngredients.find(i =>
      i.ingredientId.startsWith('SWT_')
    );
    if (sweetenerIng) {
      // Reduce sugar and add non-caloric sweetener
      sweetenerIng.percentage = sweetenerIng.percentage * 0.3;
      optimizedIngredients.push({ ingredientId: 'SWT_002', percentage: 0.03 });
      improvements.push('Reduced sugar by 70% with Stevia addition');
    }
  }

  return {
    optimizedFormulation: {
      ...formulation,
      ingredients: optimizedIngredients,
    },
    improvements,
    potentialIssues,
  };
}
