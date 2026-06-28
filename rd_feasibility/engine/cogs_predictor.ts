/**
 * Module 4: Formulation-Aware COGS (Cost of Goods Sold) Predictor
 * Calculates cost based on ingredient list, percentage breakdown, and processing costs.
 * Includes cost sensitivity analysis and optimization suggestions.
 */

import type { FormulationInput, Ingredient } from './types';

export interface CostSensitivityAlert {
  ingredientId: string;
  ingredientName: string;
  currentCost: number;
  costPerBottle: number;
  percentOfTotalCost: number;
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface COGSResult {
  totalCostPerBottle: number;
  costBreakdown: {
    ingredientsCost: number;
    processingCost: number;
    packagingCost: number;
    overheadCost: number;
  };
  ingredientDetail: Array<{
    ingredientId: string;
    name: string;
    percentage: number;
    costPerKg: number;
    costPerBottle: number;
    percentOfTotal: number;
  }>;
  sensitivityAnalysis: CostSensitivityAlert[];
  marginProjection?: {
    suggestedMSRP: number;
    targetWholesale: number;
    grossMarginPercent: number;
  };
  costOptimizationSuggestions: string[];
}

// Cost constants (can be adjusted based on location and scale)
const COST_CONSTANTS = {
  processingCostPerLiter: 0.15, // USD per liter
  packagingCostPerBottle: {
    '250mL': 0.08,
    '330mL': 0.10,
    '500mL': 0.12,
    '1000mL': 0.18,
  },
  overheadMultiplier: 0.15, // 15% of direct costs
  targetGrossMargin: 0.55, // 55% target gross margin
  retailMultiplier: 3.5, // Suggested retail = COGS * 3.5
  wholesaleMultiplier: 2.2, // Wholesale = COGS * 2.2
};

/**
 * Calculate comprehensive COGS for a formulation
 */
export function calculateCOGS(
  formulation: FormulationInput,
  ingredients: Ingredient[]
): COGSResult {
  const ingredientDetail: COGSResult['ingredientDetail'] = [];
  let ingredientsCost = 0;

  // Calculate cost for each ingredient
  for (const formIng of formulation.ingredients) {
    const ingredient = ingredients.find(i => i.id === formIng.ingredientId);
    if (!ingredient) continue;

    // Get cheapest supplier
    const cheapestSupplier = ingredient.suppliers.sort((a, b) => a.costPerKg - b.costPerKg)[0];
    if (!cheapestSupplier) continue;

    const costPerKg = cheapestSupplier.costPerKg;
    const ingredientWeight = calculateIngredientWeight(formulation, formIng.percentage);
    const costPerBottle = ingredientWeight * costPerKg;

    ingredientDetail.push({
      ingredientId: ingredient.id,
      name: ingredient.name,
      percentage: formIng.percentage,
      costPerKg,
      costPerBottle: Math.round(costPerBottle * 1000) / 1000,
      percentOfTotal: 0, // Will be calculated after total
    });

    ingredientsCost += costPerBottle;
  }

  // Calculate percentages
  for (const ing of ingredientDetail) {
    ing.percentOfTotal = ingredientsCost > 0
      ? Math.round((ing.costPerBottle / ingredientsCost) * 1000) / 10
      : 0;
  }

  // Sort by cost contribution (highest first)
  ingredientDetail.sort((a, b) => b.costPerBottle - a.costPerBottle);

  // Calculate processing cost
  const processingCost = calculateProcessingCost(formulation);

  // Calculate packaging cost
  const packagingCost = calculatePackagingCost(formulation.targetServingSize);

  // Calculate overhead
  const directCosts = ingredientsCost + processingCost + packagingCost;
  const overheadCost = directCosts * COST_CONSTANTS.overheadMultiplier;

  // Total cost per bottle
  const totalCostPerBottle = Math.round((ingredientsCost + processingCost + packagingCost + overheadCost) * 1000) / 1000;

  // Perform sensitivity analysis
  const sensitivityAnalysis = performSensitivityAnalysis(
    ingredientDetail,
    totalCostPerBottle
  );

  // Generate optimization suggestions
  const costOptimizationSuggestions = generateOptimizationSuggestions(
    ingredientDetail,
    sensitivityAnalysis,
    ingredients
  );

  // Calculate margin projection
  const marginProjection = calculateMarginProjection(totalCostPerBottle);

  return {
    totalCostPerBottle,
    costBreakdown: {
      ingredientsCost: Math.round(ingredientsCost * 1000) / 1000,
      processingCost: Math.round(processingCost * 1000) / 1000,
      packagingCost: Math.round(packagingCost * 1000) / 1000,
      overheadCost: Math.round(overheadCost * 1000) / 1000,
    },
    ingredientDetail,
    sensitivityAnalysis,
    marginProjection,
    costOptimizationSuggestions,
  };
}

/**
 * Calculate ingredient weight in kg per bottle
 */
function calculateIngredientWeight(formulation: FormulationInput, percentage: number): number {
  // Convert mL to kg (assuming density close to water for dilute solutions)
  const bottleWeightKg = formulation.targetServingSize / 1000;
  // Ingredient weight = total weight * percentage
  return bottleWeightKg * (percentage / 100);
}

/**
 * Calculate processing cost based on method and scale
 */
function calculateProcessingCost(formulation: FormulationInput): number {
  const volumeLiters = formulation.targetServingSize / 1000;
  let baseCost = volumeLiters * COST_CONSTANTS.processingCostPerLiter;

  // Adjust based on processing complexity
  switch (formulation.processingMethod) {
    case 'RETORT':
      baseCost *= 1.5; // More expensive due to energy and equipment
      break;
    case 'ASEPTIC':
      baseCost *= 1.3;
      break;
    case 'UHT':
      baseCost *= 1.2;
      break;
    case 'HTST':
      baseCost *= 0.9;
      break;
    case 'COLD_FILL':
      baseCost *= 0.8;
      break;
  }

  return baseCost;
}

/**
 * Calculate packaging cost based on bottle size
 */
function calculatePackagingCost(servingSize: number): number {
  let sizeCategory: keyof typeof COST_CONSTANTS.packagingCostPerBottle;

  if (servingSize <= 250) {
    sizeCategory = '250mL';
  } else if (servingSize <= 330) {
    sizeCategory = '330mL';
  } else if (servingSize <= 500) {
    sizeCategory = '500mL';
  } else {
    sizeCategory = '1000mL';
  }

  return COST_CONSTANTS.packagingCostPerBottle[sizeCategory];
}

/**
 * Perform cost sensitivity analysis
 */
function performSensitivityAnalysis(
  ingredientDetail: COGSResult['ingredientDetail'],
  totalCostPerBottle: number
): CostSensitivityAlert[] {
  const alerts: CostSensitivityAlert[] = [];

  for (const ing of ingredientDetail) {
    const percentOfTotal = totalCostPerBottle > 0
      ? (ing.costPerBottle / totalCostPerBottle) * 100
      : 0;

    let sensitivityLevel: CostSensitivityAlert['sensitivityLevel'];
    if (percentOfTotal >= 30) {
      sensitivityLevel = 'critical';
    } else if (percentOfTotal >= 20) {
      sensitivityLevel = 'high';
    } else if (percentOfTotal >= 10) {
      sensitivityLevel = 'medium';
    } else {
      sensitivityLevel = 'low';
    }

    alerts.push({
      ingredientId: ing.ingredientId,
      ingredientName: ing.name,
      currentCost: ing.costPerKg,
      costPerBottle: ing.costPerBottle,
      percentOfTotalCost: Math.round(percentOfTotal * 10) / 10,
      sensitivityLevel,
      suggestion: generateIngredientSuggestion(ing, sensitivityLevel),
    });
  }

  // Sort by sensitivity (highest first)
  return alerts.sort((a, b) => b.percentOfTotalCost - a.percentOfTotalCost);
}

/**
 * Generate suggestion for individual ingredient optimization
 */
function generateIngredientSuggestion(
  ing: { name: string; costPerKg: number; percentage: number },
  sensitivityLevel: CostSensitivityAlert['sensitivityLevel']
): string {
  if (sensitivityLevel === 'critical') {
    return `Consider alternatives or supplier negotiation for ${ing.name} - major cost driver`;
  }
  if (sensitivityLevel === 'high') {
    return `Evaluate ${ing.name} for cost reduction opportunities`;
  }
  if (sensitivityLevel === 'medium') {
    return `Monitor ${ing.name} costs; currently moderate impact`;
  }
  return `Low cost impact - optimize only if needed`;
}

/**
 * Generate overall optimization suggestions
 */
function generateOptimizationSuggestions(
  ingredientDetail: COGSResult['ingredientDetail'],
  sensitivityAnalysis: CostSensitivityAlert[],
  ingredients: Ingredient[]
): string[] {
  const suggestions: string[] = [];

  // High-cost ingredient analysis
  const highCostIngredients = sensitivityAnalysis.filter(s => s.sensitivityLevel === 'critical');
  if (highCostIngredients.length > 0) {
    suggestions.push(
      `${highCostIngredients.length} critical cost driver(s) identified. Focus on supplier negotiations or formulation alternatives.`
    );
  }

  // Substitutes analysis
  for (const ing of ingredientDetail) {
    const ingredient = ingredients.find(i => i.id === ing.ingredientId);
    if (ingredient && ingredient.substitutes.length > 0) {
      suggestions.push(`${ingredient.name} has ${ingredient.substitutes.length} potential substitute(s) - explore for cost reduction`);
    }
  }

  // Processing optimization
  const avgCostPerBottle = ingredientDetail.reduce((sum, i) => sum + i.costPerBottle, 0);
  if (avgCostPerBottle > 0.5) {
    suggestions.push('Consider UHT or HTST processing to reduce energy costs vs Retort');
  }

  // Batch size optimization
  suggestions.push('Optimize batch size to reduce per-unit overhead and improve supplier MOQ efficiency');

  // Packaging optimization
  if (ingredientDetail.length > 10) {
    suggestions.push('Complex formulations increase quality control costs - consider simplification where possible');
  }

  // Minimum suggestions
  if (suggestions.length === 0) {
    suggestions.push('Cost structure is well-optimized. Continue monitoring raw material price fluctuations.');
  }

  return suggestions;
}

/**
 * Calculate margin projection
 */
function calculateMarginProjection(totalCostPerBottle: number): COGSResult['marginProjection'] {
  const suggestedMSRP = Math.ceil(totalCostPerBottle * COST_CONSTANTS.retailMultiplier * 100) / 100;
  const targetWholesale = Math.ceil(totalCostPerBottle * COST_CONSTANTS.wholesaleMultiplier * 100) / 100;
  const grossMarginPercent = Math.round((1 - (totalCostPerBottle / suggestedMSRP)) * 100);

  return {
    suggestedMSRP,
    targetWholesale,
    grossMarginPercent,
  };
}

/**
 * Calculate break-even volume for investment decisions
 */
export function calculateBreakEvenVolume(
  fixedCosts: number,
  contributionMargin: number
): number {
  // Break-even = Fixed Costs / Contribution Margin per unit
  return Math.ceil(fixedCosts / contributionMargin);
}

/**
 * Calculate target cost for desired margin
 */
export function calculateTargetCost(
  targetMSRP: number,
  targetMarginPercent: number
): number {
  // Target Cost = MSRP * (1 - Margin%)
  return Math.round(targetMSRP * (1 - targetMarginPercent) * 100) / 100;
}

/**
 * Perform what-if analysis for ingredient substitution
 */
export function analyzeSubstitutionImpact(
  originalIngredient: Ingredient,
  substituteIngredient: Ingredient,
  percentageInFormulation: number,
  bottleSize: number
): {
  costDifferencePerBottle: number;
  annualImpact100kBottles: number;
  recommendation: string;
} {
  const originalCost = Math.min(...originalIngredient.suppliers.map(s => s.costPerKg));
  const substituteCost = Math.min(...substituteIngredient.suppliers.map(s => s.costPerKg));

  const weight = (bottleSize / 1000) * (percentageInFormulation / 100);
  const costDiffPerBottle = (substituteCost - originalCost) * weight;
  const annualImpact = costDiffPerBottle * 100000; // 100k bottles annually

  let recommendation: string;
  if (costDiffPerBottle < -0.01) {
    recommendation = `Recommended: Save $${Math.abs(annualImpact).toFixed(2)}/year with substitution`;
  } else if (costDiffPerBottle > 0.01) {
    recommendation = `Not recommended: Additional cost of $${annualImpact.toFixed(2)}/year`;
  } else {
    recommendation = 'Neutral cost impact - evaluate functional properties before deciding';
  }

  return {
    costDifferencePerBottle: Math.round(costDiffPerBottle * 1000) / 1000,
    annualImpact100kBottles: Math.round(annualImpact * 100) / 100,
    recommendation,
  };
}
