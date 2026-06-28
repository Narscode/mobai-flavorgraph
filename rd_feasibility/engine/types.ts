/**
 * TypeScript type definitions for the R&D Feasibility Intelligence Layer
 * MoBai - AI-assisted Functional RTD Beverage Platform
 */

// ===== INGREDIENT DATABASE TYPES =====

export interface IngredientProperties {
  molecularWeight?: number;
  solubility: 'water-soluble' | 'fat-soluble' | 'alcohol-soluble' | 'insoluble';
  pHStabilityMin: number;
  pHStabilityMax: number;
  heatSensitivity: 'low' | 'medium' | 'high' | 'very-high';
  maxProcessingTemp: number;
  storageTemp: string;
  shelfLifeMonths: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  sugarPer100g: number;
}

export interface SupplierInfo {
  name: string;
  location: string;
  country: 'China' | 'Japan' | 'Korea' | 'Taiwan' | 'Thailand' | 'Singapore' | 'India' | 'Indonesia';
  moqKg: number;
  leadTimeDays: number;
  costPerKg: number;
  certifications: string[];
  reliability: number;
  inStock: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  nameChinese?: string;
  category:
    | 'base-liquid'
    | 'sweetener'
    | 'acidulant'
    | 'protein-source'
    | 'stabilizer'
    | 'vitamin-mineral'
    | 'flavor-system'
    | 'preservative'
    | 'colorant'
    | 'functional-additive';
  function: string[];
  properties: IngredientProperties;
  suppliers: SupplierInfo[];
  substitutes: string[];
  regulatoryStatus: {
    fda: 'approved' | 'gras' | 'pending' | 'not-listed';
    efsa: 'approved' | 'pending' | 'not-listed';
    chinaGB: 'approved' | 'pending' | 'not-listed';
  };
  allergens: string[];
}

// ===== FORMULATION INPUT TYPES =====

export interface FormulationIngredient {
  ingredientId: string;
  percentage: number;
  overagePercent?: number;
}

export interface FormulationInput {
  name: string;
  baseLiquid: string;
  ingredients: FormulationIngredient[];
  targetPH: number;
  targetBrix: number;
  processingMethod: 'UHT' | 'Retort' | 'HTST' | 'Cold-fill' | 'ASEPTIC';
  processingTemp: number;
  processingTime: number;
  targetShelfLifeMonths: number;
  targetServingSize: number;
  targetDailyServings?: number;
}

// ===== MODULE OUTPUT TYPES =====

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

export interface NutrientRetentionResult {
  nutrientRetention: Record<string, {
    initialAmount: number;
    retainedPercent: number;
    finalAmount: number;
    overageRequired: number;
    overageRecommendation: string;
  }>;
  thermalProcessAssessment: {
    processType: 'UHT' | 'Retort' | 'HTST' | 'Cold-fill' | 'ASEPTIC';
    f0Value: number;
    sterilityAssuranceLevel: number;
    nutritionalImpactRating: 'excellent' | 'good' | 'moderate' | 'poor';
  };
  overallRetentionScore: number;
  recommendations: string[];
}

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

// ===== COMBINED DASHBOARD TYPES =====

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
