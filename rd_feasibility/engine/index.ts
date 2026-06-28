/**
 * R&D Feasibility Intelligence Layer
 * MoBai - AI-assisted Functional RTD Beverage Platform
 *
 * Main entry point that exports all 4 core modules
 */

// Types
export * from './types';

// Engine modules
export { evaluateIngredientFeasibility } from './ingredient_feasibility';
export { predictStabilityRisk } from './stability_predictor';
export { calculateThermalDegradation } from './thermal_degradation';
export { calculateCOGS } from './cogs_predictor';

// Combined dashboard evaluation
export { evaluateFormulation } from './dashboard_evaluator';

// Formulation prediction engine
export {
  predictOptimalFormulation,
  predictMultipleFormulations,
  optimizeExistingFormulation,
} from './formulation_predictor';

// Ingredient database
export {
  ASIAN_RTD_INGREDIENTS,
  INGREDIENT_DATABASE,
  getIngredientById,
  getIngredientsByCategory,
  getSubstitutes,
  searchIngredients,
} from './ingredient_database';

// Version info
export const VERSION = '1.0.0';
export const LAST_UPDATED = '2026-06-26';
