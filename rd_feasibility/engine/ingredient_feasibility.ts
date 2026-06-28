/**
 * Module 1: Ingredient Feasibility & Supplier Filter
 * Evaluates ingredient availability, MOQ constraints, cost per kg, and identifies viable commercial substitutes.
 */

import type { Ingredient, Supplier, FormulationInput } from './types';

export interface SubstituteRecommendation {
  originalId: string;
  originalName: string;
  substituteId: string;
  substituteName: string;
  costDifferencePerKg: number;
  compatibilityScore: number;
  reasoning: string;
}

export interface IngredientFeasibilityResult {
  overallScore: number;
  scoreBreakdown: {
    availabilityScore: number;
    moqScore: number;
    costScore: number;
    regulatoryScore: number;
  };
  viableIngredients: string[];
  problematicIngredients: Array<{
    ingredientId: string;
    issue: 'unavailable' | 'moq-issue' | 'cost-overrun' | 'regulatory';
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }>;
  recommendedSubstitutes: SubstituteRecommendation[];
  estimatedLeadTimeDays: number;
  estimatedIngredientCostPerBottle: number;
}

/**
 * Calculate the overall feasibility score for a formulation's ingredients
 */
export function evaluateIngredientFeasibility(
  ingredients: Ingredient[],
  formulation: FormulationInput,
  ingredientDatabase: Map<string, Ingredient>
): IngredientFeasibilityResult {
  const viabilityScores = ingredients.map(ing => calculateViabilityScore(ing));
  const overallScore = Math.round(viabilityScores.reduce((a, b) => a + b, 0) / viabilityScores.length);

  // Calculate individual scores
  const availabilityScore = calculateAvailabilityScore(ingredients);
  const moqScore = calculateMOQScore(ingredients, formulation);
  const costScore = calculateCostScore(ingredients);
  const regulatoryScore = calculateRegulatoryScore(ingredients);

  // Identify problematic ingredients
  const problematicIngredients = identifyProblems(ingredients, ingredientDatabase);

  // Generate substitute recommendations
  const recommendedSubstitutes = generateSubstitutes(ingredients, ingredientDatabase);

  // Estimate lead time (max of all suppliers)
  const estimatedLeadTimeDays = Math.max(
    ...ingredients.flatMap(ing => ing.suppliers.map(s => s.leadTimeDays))
  );

  // Calculate ingredient cost per bottle
  const estimatedIngredientCostPerBottle = calculateIngredientCostPerBottle(
    ingredients,
    formulation
  );

  return {
    overallScore,
    scoreBreakdown: {
      availabilityScore,
      moqScore,
      costScore,
      regulatoryScore,
    },
    viableIngredients: ingredients
      .filter(ing => calculateViabilityScore(ing) >= 70)
      .map(ing => ing.id),
    problematicIngredients,
    recommendedSubstitutes,
    estimatedLeadTimeDays,
    estimatedIngredientCostPerBottle,
  };
}

/**
 * Calculate individual ingredient viability score (0-100)
 */
function calculateViabilityScore(ingredient: Ingredient): number {
  const stockScore = ingredient.suppliers.some(s => s.inStock) ? 100 : 0;
  const reliabilityScore =
    ingredient.suppliers.reduce((sum, s) => sum + s.reliability, 0) /
    ingredient.suppliers.length *
    100;

  return Math.round((stockScore * 0.4 + reliabilityScore * 0.6) * 100) / 100;
}

/**
 * Score based on ingredient availability (in-stock suppliers)
 */
function calculateAvailabilityScore(ingredients: Ingredient[]): number {
  let totalScore = 0;
  for (const ing of ingredients) {
    const inStockSuppliers = ing.suppliers.filter(s => s.inStock).length;
    totalScore += (inStockSuppliers / ing.suppliers.length) * 100;
  }
  return Math.round(totalScore / ingredients.length);
}

/**
 * Score based on MOQ compatibility with production scale
 */
function calculateMOQScore(ingredients: Ingredient[], formulation: FormulationInput): number {
  // Assume production scale of 10,000 bottles per batch
  const productionBatch = 10000;
  const bottleSize = formulation.targetServingSize / 1000; // Convert to kg
  const batchKg = productionBatch * bottleSize;

  let score = 0;
  for (const ing of ingredients) {
    // Check if best supplier's MOQ is manageable for batch size
    const bestSupplier = ing.suppliers.sort((a, b) => a.costPerKg - b.costPerKg)[0];
    if (bestSupplier && bestSupplier.moqKg <= batchKg * 2) {
      score += 100;
    } else if (bestSupplier && bestSupplier.moqKg <= batchKg * 5) {
      score += 70;
    } else {
      score += 40;
    }
  }
  return Math.round(score / ingredients.length);
}

/**
 * Score based on ingredient cost efficiency
 */
function calculateCostScore(ingredients: Ingredient[]): number {
  const avgCostPerKg = ingredients.reduce((sum, ing) => {
    const minCost = Math.min(...ing.suppliers.map(s => s.costPerKg));
    return sum + minCost;
  }, 0) / ingredients.length;

  // Cost efficiency scoring (lower cost = higher score)
  if (avgCostPerKg < 5) return 95;
  if (avgCostPerKg < 15) return 85;
  if (avgCostPerKg < 30) return 75;
  if (avgCostPerKg < 50) return 60;
  return 45;
}

/**
 * Score based on regulatory compliance across regions
 */
function calculateRegulatoryScore(ingredients: Ingredient[]): number {
  let totalScore = 0;
  for (const ing of ingredients) {
    const { regulatoryStatus } = ing;
    let score = 0;
    if (regulatoryStatus.fda === 'approved' || regulatoryStatus.fda === 'gras') score += 35;
    if (regulatoryStatus.efsa === 'approved') score += 35;
    if (regulatoryStatus.chinaGB === 'approved') score += 30;
    totalScore += score;
  }
  return Math.round(totalScore / ingredients.length);
}

/**
 * Identify problematic ingredients and their issues
 */
function identifyProblems(
  ingredients: Ingredient[],
  database: Map<string, Ingredient>
): IngredientFeasibilityResult['problematicIngredients'] {
  const problems: IngredientFeasibilityResult['problematicIngredients'] = [];

  for (const ing of ingredients) {
    // Check availability
    if (!ing.suppliers.some(s => s.inStock)) {
      problems.push({
        ingredientId: ing.id,
        issue: 'unavailable',
        severity: 'critical',
        recommendation: `Find alternative supplier for ${ing.name} or substitute with similar ingredient`,
      });
      continue;
    }

    // Check MOQ
    const bestSupplier = ing.suppliers.sort((a, b) => a.costPerKg - b.costPerKg)[0];
    if (bestSupplier && bestSupplier.moqKg > 1000) {
      problems.push({
        ingredientId: ing.id,
        issue: 'moq-issue',
        severity: 'medium',
        recommendation: `Consider consolidating orders or finding suppliers with lower MOQ for ${ing.name}`,
      });
    }

    // Check regulatory status
    const { regulatoryStatus } = ing;
    if (
      regulatoryStatus.fda !== 'approved' &&
      regulatoryStatus.fda !== 'gras' &&
      regulatoryStatus.efsa !== 'approved'
    ) {
      problems.push({
        ingredientId: ing.id,
        issue: 'regulatory',
        severity: 'high',
        recommendation: `${ing.name} may have regulatory restrictions. Verify compliance for target markets.`,
      });
    }
  }

  return problems;
}

/**
 * Generate substitute recommendations for problematic or expensive ingredients
 */
function generateSubstitutes(
  ingredients: Ingredient[],
  database: Map<string, Ingredient>
): SubstituteRecommendation[] {
  const substitutes: SubstituteRecommendation[] = [];

  for (const ing of ingredients) {
    // Find potential substitutes from the ingredient's substitute list
    for (const subId of ing.substitutes) {
      const subIng = database.get(subId);
      if (!subIng) continue;

      const originalCost = Math.min(...ing.suppliers.map(s => s.costPerKg));
      const subCost = Math.min(...subIng.suppliers.map(s => s.costPerKg));

      substitutes.push({
        originalId: ing.id,
        originalName: ing.name,
        substituteId: subIng.id,
        substituteName: subIng.name,
        costDifferencePerKg: subCost - originalCost,
        compatibilityScore: calculateCompatibilityScore(ing, subIng),
        reasoning: generateSubstitutionReasoning(ing, subIng, originalCost, subCost),
      });
    }
  }

  return substitutes;
}

/**
 * Calculate compatibility score between original and substitute ingredient
 */
function calculateCompatibilityScore(original: Ingredient, substitute: Ingredient): number {
  let score = 50; // Base score

  // Category match bonus
  if (original.category === substitute.category) score += 25;

  // Function overlap bonus
  const sharedFunctions = original.function.filter(f => substitute.function.includes(f));
  score += sharedFunctions.length * 10;

  // Solubility match bonus
  if (original.properties.solubility === substitute.properties.solubility) score += 10;

  // Allergen consideration (penalty if new allergens introduced)
  const newAllergens = substitute.allergens.filter(a => !original.allergens.includes(a));
  score -= newAllergens.length * 15;

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate reasoning text for substitution
 */
function generateSubstitutionReasoning(
  original: Ingredient,
  substitute: Ingredient,
  originalCost: number,
  substituteCost: number
): string {
  const lines: string[] = [];

  if (substituteCost < originalCost) {
    lines.push(`Cost savings of $${(originalCost - substituteCost).toFixed(2)}/kg`);
  } else {
    lines.push(`Additional cost of $${(substituteCost - originalCost).toFixed(2)}/kg`);
  }

  if (substitute.properties.heatSensitivity !== original.properties.heatSensitivity) {
    lines.push(`Heat sensitivity: ${substitute.properties.heatSensitivity} vs ${original.properties.heatSensitivity}`);
  }

  return lines.join('. ');
}

/**
 * Calculate estimated ingredient cost per bottle
 */
function calculateIngredientCostPerBottle(
  ingredients: Ingredient[],
  formulation: FormulationInput
): number {
  let totalCost = 0;

  for (const ing of ingredients) {
    // Find cheapest supplier
    const cheapestSupplier = ing.suppliers.sort((a, b) => a.costPerKg - b.costPerKg)[0];
    if (!cheapestSupplier) continue;

    // Calculate cost based on percentage in formulation
    // Assuming 1000mL bottle size for calculation
    const ingredientWeightKg = (formulation.targetServingSize / 1000) * (formulation.ingredients.find(i => i.ingredientId === ing.id)?.percentage || 0) / 100;
    totalCost += ingredientWeightKg * cheapestSupplier.costPerKg;
  }

  return Math.round(totalCost * 1000) / 1000; // Round to 3 decimal places
}
