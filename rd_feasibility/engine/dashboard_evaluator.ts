/**
 * Dashboard Evaluator - Combines all 4 R&D Feasibility modules
 * Provides a unified interface for evaluating formulations
 */

import type { FormulationInput, Ingredient } from './types';
import { evaluateIngredientFeasibility } from './ingredient_feasibility';
import { predictStabilityRisk } from './stability_predictor';
import { calculateThermalDegradation } from './thermal_degradation';
import { calculateCOGS } from './cogs_predictor';
import type { IngredientFeasibilityResult } from './ingredient_feasibility';
import type { StabilityRiskResult } from './stability_predictor';
import type { NutrientRetentionResult } from './thermal_degradation';
import type { COGSResult } from './cogs_predictor';

export interface FeasibilityDashboardResult {
  ingredientFeasibility: IngredientFeasibilityResult;
  stabilityRisk: StabilityRiskResult;
  nutrientRetention: NutrientRetentionResult;
  cogs: COGSResult;
  overallFeasibilityScore: number;
  criticalIssues: string[];
  recommendations: string[];
  lastUpdated: Date;
}

/**
 * Evaluate a complete formulation across all 4 feasibility modules
 */
export function evaluateFormulation(
  formulation: FormulationInput,
  ingredientDatabase: Map<string, Ingredient>
): FeasibilityDashboardResult {
  // Get ingredients from database
  const ingredients = formulation.ingredients
    .map(fi => ingredientDatabase.get(fi.ingredientId))
    .filter((ing): ing is Ingredient => ing !== undefined);

  // Run all 4 evaluation modules
  const ingredientFeasibility = evaluateIngredientFeasibility(ingredients, formulation, ingredientDatabase);
  const stabilityRisk = predictStabilityRisk(formulation, ingredients);
  const nutrientRetention = calculateThermalDegradation(formulation, ingredients);
  const cogs = calculateCOGS(formulation, ingredients);

  // Calculate overall feasibility score (weighted average)
  const overallFeasibilityScore = calculateOverallScore(
    ingredientFeasibility,
    stabilityRisk,
    nutrientRetention,
    cogs
  );

  // Collect critical issues from all modules
  const criticalIssues = collectCriticalIssues(ingredientFeasibility, stabilityRisk);

  // Generate overall recommendations
  const recommendations = generateOverallRecommendations(
    ingredientFeasibility,
    stabilityRisk,
    nutrientRetention,
    cogs
  );

  return {
    ingredientFeasibility,
    stabilityRisk,
    nutrientRetention,
    cogs,
    overallFeasibilityScore,
    criticalIssues,
    recommendations,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate weighted overall feasibility score
 */
function calculateOverallScore(
  ingredientFeasibility: IngredientFeasibilityResult,
  stabilityRisk: StabilityRiskResult,
  nutrientRetention: NutrientRetentionResult,
  cogs: COGSResult
): number {
  // Weight factors for each module
  const weights = {
    ingredient: 0.25,
    stability: 0.25,
    nutrition: 0.20,
    cost: 0.30,
  };

  // Normalize stability risk (invert: lower risk = higher score)
  const stabilityScore = 100 - stabilityRisk.overallRiskScore;

  // Ingredient feasibility score
  const ingredientScore = ingredientFeasibility.overallScore;

  // Nutrient retention score
  const nutritionScore = nutrientRetention.overallRetentionScore;

  // Cost feasibility (based on margin projection)
  const costScore = cogs.marginProjection?.grossMarginPercent || 50;

  // Calculate weighted average
  const overallScore = Math.round(
    ingredientScore * weights.ingredient +
    stabilityScore * weights.stability +
    nutritionScore * weights.nutrition +
    costScore * weights.cost
  );

  return Math.min(100, Math.max(0, overallScore));
}

/**
 * Collect critical issues from all modules
 */
function collectCriticalIssues(
  ingredientFeasibility: IngredientFeasibilityResult,
  stabilityRisk: StabilityRiskResult
): string[] {
  const issues: string[] = [];

  // Critical ingredient issues
  for (const problem of ingredientFeasibility.problematicIngredients) {
    if (problem.severity === 'critical') {
      issues.push(`[CRITICAL] ${problem.ingredientId}: ${problem.issue} - ${problem.recommendation}`);
    }
  }

  // Critical stability issues
  if (stabilityRisk.riskLevel === 'critical') {
    issues.push(`[CRITICAL] Stability Risk: ${stabilityRisk.overallRiskScore}/100 - Immediate formulation adjustment required`);
  }

  // Stability warnings
  for (const warning of stabilityRisk.warnings) {
    if (warning.toLowerCase().includes('critical') || warning.toLowerCase().includes('risk')) {
      issues.push(`[WARNING] ${warning}`);
    }
  }

  return [...new Set(issues)]; // Remove duplicates
}

/**
 * Generate prioritized recommendations
 */
function generateOverallRecommendations(
  ingredientFeasibility: IngredientFeasibilityResult,
  stabilityRisk: StabilityRiskResult,
  nutrientRetention: NutrientRetentionResult,
  cogs: COGSResult
): string[] {
  const recommendations: string[] = [];

  // Priority 1: Critical stability issues
  if (stabilityRisk.riskLevel === 'critical' || stabilityRisk.riskLevel === 'high') {
    if (stabilityRisk.suggestedPHAdjustment) {
      recommendations.push(
        `PRIORITY: Adjust pH to ${stabilityRisk.suggestedPHAdjustment.targetPH} using ${stabilityRisk.suggestedPHAdjustment.acidulant}`
      );
    }
    if (stabilityRisk.recommendedStabilizerCombinations.length > 0) {
      const bestCombo = stabilityRisk.recommendedStabilizerCombinations[0];
      recommendations.push(
        `PRIORITY: Implement stabilizer system: ${bestCombo.combination.join(' + ')} at ${bestCombo.recommendedConcentrationRange}`
      );
    }
  }

  // Priority 2: Critical ingredient issues
  const unavailableIngredients = ingredientFeasibility.problematicIngredients.filter(
    p => p.issue === 'unavailable' || p.issue === 'moq-issue'
  );
  if (unavailableIngredients.length > 0) {
    recommendations.push(
      `ACTION REQUIRED: Source alternatives for ${unavailableIngredients.length} unavailable/constrained ingredient(s)`
    );
  }

  // Priority 3: Substitutes
  if (ingredientFeasibility.recommendedSubstitutes.length > 0) {
    const costSavingSub = ingredientFeasibility.recommendedSubstitutes
      .filter(s => s.costDifferencePerKg < 0)
      .sort((a, b) => a.costDifferencePerKg - b.costDifferencePerKg)[0];
    if (costSavingSub) {
      recommendations.push(
        `COST OPPORTUNITY: ${costSavingSub.originalName} → ${costSavingSub.substituteName} saves $${Math.abs(costSavingSub.costDifferencePerKg).toFixed(2)}/kg`
      );
    }
  }

  // Priority 4: Nutrition optimization
  const criticalNutrients = Object.entries(nutrientRetention.nutrientRetention)
    .filter(([_, n]) => n.retainedPercent < 70)
    .map(([id, n]) => `${id}: ${n.retainedPercent}% retained`);
  if (criticalNutrients.length > 0) {
    recommendations.push(
      `NUTRITION: Heat-sensitive nutrients need overage: ${criticalNutrients.join(', ')}`
    );
  }

  // Priority 5: Cost optimization
  const highCostDrivers = cogs.sensitivityAnalysis.filter(s => s.sensitivityLevel === 'critical');
  if (highCostDrivers.length > 0) {
    recommendations.push(
      `COST: Focus on ${highCostDrivers.length} critical cost driver(s) for reduction`
    );
  }

  // Priority 6: Process optimization
  if (nutrientRetention.thermalProcessAssessment.nutritionalImpactRating === 'poor') {
    recommendations.push(
      `PROCESS: Consider gentler thermal treatment to improve nutrient retention`
    );
  }

  // Limit to top 8 most important recommendations
  return recommendations.slice(0, 8);
}

/**
 * Create a sample formulation for demonstration
 */
export function createSampleFormulation(): FormulationInput {
  return {
    name: 'High-Protein Functional Energy Drink',
    baseLiquid: 'WTR_001',
    ingredients: [
      { ingredientId: 'WTR_001', percentage: 85 },
      { ingredientId: 'PRO_001', percentage: 3.5 },
      { ingredientId: 'SWT_001', percentage: 5 },
      { ingredientId: 'ACD_001', percentage: 0.3 },
      { ingredientId: 'VIT_001', percentage: 0.5 },
      { ingredientId: 'STB_001', percentage: 0.15 },
      { ingredientId: 'CAFF_001', percentage: 0.03 },
    ],
    targetPH: 3.8,
    targetBrix: 6.5,
    processingMethod: 'UHT',
    processingTemp: 140,
    processingTime: 4,
    targetShelfLifeMonths: 9,
    targetServingSize: 330,
    targetDailyServings: 2,
  };
}
