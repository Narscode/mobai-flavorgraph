/**
 * Module 3: Thermal Degradation & Nutrient Retention Calculator
 * Estimates nutrient loss based on heat treatment severity (UHT/Retort/HTST).
 * Uses first-order reaction kinetics and Arrhenius equation for thermal degradation modeling.
 */

import type { FormulationInput, Ingredient } from './types';

export interface NutrientRetentionResult {
  nutrientRetention: Record<string, {
    initialAmount: number;
    retainedPercent: number;
    finalAmount: number;
    overageRequired: number;
    overageRecommendation: string;
  }>;
  thermalProcessAssessment: {
    processType: string;
    f0Value: number;
    sterilityAssuranceLevel: number;
    nutritionalImpactRating: 'excellent' | 'good' | 'moderate' | 'poor';
  };
  overallRetentionScore: number;
  recommendations: string[];
}

// Thermal degradation constants for key nutrients
const NUTRIENT_DEGRADATION_DATA: Record<string, {
  name: string;
  dValue121: number; // D-value at 121°C in minutes
  zValue: number;    // z-value in °C
  heatSensitivity: 'low' | 'medium' | 'high' | 'very-high';
  recommendedOveragePercent: number;
}> = {
  'VIT_C': {
    name: 'Vitamin C (Ascorbic Acid)',
    dValue121: 0.8,
    zValue: 7.5,
    heatSensitivity: 'high',
    recommendedOveragePercent: 35,
  },
  'VIT_B12': {
    name: 'Vitamin B12 (Cyanocobalamin)',
    dValue121: 0.5,
    zValue: 25.0,
    heatSensitivity: 'high',
    recommendedOveragePercent: 40,
  },
  'VIT_B6': {
    name: 'Vitamin B6 (Pyridoxine)',
    dValue121: 2.5,
    zValue: 21.0,
    heatSensitivity: 'medium',
    recommendedOveragePercent: 25,
  },
  'THIAMIN': {
    name: 'Thiamine (Vitamin B1)',
    dValue121: 0.15,
    zValue: 25.0,
    heatSensitivity: 'very-high',
    recommendedOveragePercent: 50,
  },
  'FOLIC': {
    name: 'Folic Acid',
    dValue121: 1.2,
    zValue: 22.0,
    heatSensitivity: 'high',
    recommendedOveragePercent: 30,
  },
  'NIACIN': {
    name: 'Niacin (Vitamin B3)',
    dValue121: 45.0,
    zValue: 28.0,
    heatSensitivity: 'low',
    recommendedOveragePercent: 10,
  },
  'BIOTIN': {
    name: 'Biotin (Vitamin B7)',
    dValue121: 8.0,
    zValue: 22.0,
    heatSensitivity: 'medium',
    recommendedOveragePercent: 15,
  },
  'PANTOTHENIC': {
    name: 'Pantothenic Acid (Vitamin B5)',
    dValue121: 5.0,
    zValue: 24.0,
    heatSensitivity: 'medium',
    recommendedOveragePercent: 20,
  },
  'CAFFEINE': {
    name: 'Caffeine',
    dValue121: 120.0,
    zValue: 30.0,
    heatSensitivity: 'low',
    recommendedOveragePercent: 5,
  },
  'TAURINE': {
    name: 'Taurine',
    dValue121: 85.0,
    zValue: 28.0,
    heatSensitivity: 'low',
    recommendedOveragePercent: 5,
  },
};

// Processing method parameters
const PROCESSING_METHODS: Record<string, {
  temp: number;
  time: number;
  f0Value: number;
  description: string;
}> = {
  'UHT': {
    temp: 140,
    time: 4,
    f0Value: 6,
    description: 'Ultra-High Temperature (135-145°C, 2-8 sec)',
  },
  'RETORT': {
    temp: 121,
    time: 30,
    f0Value: 12,
    description: 'Retort Sterilization (115-125°C, 20-45 min)',
  },
  'HTST': {
    temp: 72,
    time: 15,
    f0Value: 0.1,
    description: 'High-Temperature Short Time (72-85°C, 15-30 sec)',
  },
  'COLD_FILL': {
    temp: 25,
    time: 0,
    f0Value: 0,
    description: 'Cold Fill Aseptic (ambient filling)',
  },
  'ASEPTIC': {
    temp: 137,
    time: 5,
    f0Value: 8,
    description: 'Aseptic Processing (137-145°C, 3-6 sec)',
  },
};

/**
 * Calculate thermal degradation and nutrient retention for a formulation
 */
export function calculateThermalDegradation(
  formulation: FormulationInput,
  ingredients: Ingredient[]
): NutrientRetentionResult {
  const recommendations: string[] = [];

  // Get processing parameters
  const processParams = getProcessingParams(formulation);

  // Calculate F0 value if not provided
  const f0Value = calculateF0(
    formulation.processingTemp || processParams.temp,
    formulation.processingTime || processParams.time
  );

  // Calculate nutrient retention for each vitamin/mineral in formulation
  const nutrientRetention: NutrientRetentionResult['nutrientRetention'] = {};

  // Find nutrients in the formulation
  const nutrientsInFormulation = ingredients.filter(i =>
    i.category === 'vitamin-mineral' || i.name.toLowerCase().includes('vitamin')
  );

  // Calculate retention for known nutrients
  for (const [nutrientId, nutrientData] of Object.entries(NUTRIENT_DEGRADATION_DATA)) {
    // Find if this nutrient is in the formulation
    const inFormulation = nutrientsInFormulation.some(n =>
      n.name.toLowerCase().includes(nutrientData.name.toLowerCase().split(' ')[0])
    ) || nutrientId === 'CAFFEINE' || nutrientId === 'TAURINE'; // These are commonly assumed

    if (inFormulation || nutrientId === 'VIT_C' || nutrientId === 'THIAMIN') {
      // Calculate retention using first-order kinetics
      const retentionPercent = calculateRetention(
        nutrientData.dValue121,
        nutrientData.zValue,
        formulation.processingTemp || processParams.temp,
        formulation.processingTime || processParams.time
      );

      const initialAmount = 100; // Reference amount (100%)
      const finalAmount = retentionPercent;
      const retainedPercent = Math.round(retentionPercent * 10) / 10;

      // Calculate overage required
      const overageRequired = (100 / retainedPercent) * nutrientData.recommendedOveragePercent;

      let overageRecommendation: string;
      if (retainedPercent >= 90) {
        overageRecommendation = 'Minimal overage needed - thermal treatment has minimal impact';
      } else if (retainedPercent >= 75) {
        overageRecommendation = `Consider ${Math.round(overageRequired)}% overage to compensate for losses`;
      } else if (retainedPercent >= 50) {
        overageRecommendation = `Recommend ${Math.round(overageRequired)}% overage or consider alternative processing`;
      } else {
        overageRecommendation = `Critical: ${Math.round(overageRequired)}% overage required, or explore gentler processing`;
      }

      nutrientRetention[nutrientId] = {
        initialAmount,
        retainedPercent,
        finalAmount: Math.round(finalAmount * 100) / 100,
        overageRequired: Math.round(overageRequired * 10) / 10,
        overageRecommendation,
      };

      // Add recommendations for sensitive nutrients
      if (nutrientData.heatSensitivity === 'very-high' && retainedPercent < 70) {
        recommendations.push(
          `${nutrientData.name} is highly heat-sensitive. Consider adding ${Math.round(overageRequired)}% overage or using a gentler processing method.`
        );
      }
    }
  }

  // Calculate overall retention score
  const retentionValues = Object.values(nutrientRetention).map(n => n.retainedPercent);
  const overallRetentionScore = retentionValues.length > 0
    ? Math.round(retentionValues.reduce((a, b) => a + b, 0) / retentionValues.length)
    : 100;

  // Determine nutritional impact rating
  let nutritionalImpactRating: NutrientRetentionResult['thermalProcessAssessment']['nutritionalImpactRating'];
  if (overallRetentionScore >= 90) {
    nutritionalImpactRating = 'excellent';
  } else if (overallRetentionScore >= 75) {
    nutritionalImpactRating = 'good';
    recommendations.push('Nutrient retention is good. Monitor heat-sensitive vitamins during production.');
  } else if (overallRetentionScore >= 50) {
    nutritionalImpactRating = 'moderate';
    recommendations.push('Significant nutrient losses expected. Recommend overages for heat-sensitive vitamins.');
  } else {
    nutritionalImpactRating = 'poor';
    recommendations.push('Critical nutrient losses. Consider gentler processing or post-processing fortification.');
  }

  // Calculate sterility assurance level
  const sterilityAssuranceLevel = calculateSterilityAssurance(f0Value);

  return {
    nutrientRetention,
    thermalProcessAssessment: {
      processType: formulation.processingMethod,
      f0Value: Math.round(f0Value * 100) / 100,
      sterilityAssuranceLevel,
      nutritionalImpactRating,
    },
    overallRetentionScore,
    recommendations,
  };
}

/**
 * Get processing parameters based on method
 */
function getProcessingParams(formulation: FormulationInput) {
  const method = PROCESSING_METHODS[formulation.processingMethod] || PROCESSING_METHODS['UHT'];
  return {
    temp: formulation.processingTemp || method.temp,
    time: formulation.processingTime || method.time,
    f0Value: method.f0Value,
  };
}

/**
 * Calculate retention percentage using first-order kinetics and Arrhenius equation
 * L = 10^(-t/D)
 * Where:
 *   L = fraction retained
 *   t = processing time (minutes)
 *   D = D-value at reference temperature
 */
function calculateRetention(
  dValue121: number,
  zValue: number,
  processTemp: number,
  processTime: number
): number {
  // Calculate D-value at process temperature using z-value
  // D(T) = D(121°C) * 10^((121-T)/z)
  const dValueAtTemp = dValue121 * Math.pow(10, (121 - processTemp) / zValue);

  // Calculate retention using first-order kinetics
  // L = 10^(-t/D)
  const timeInMinutes = processTime / 60; // Convert seconds to minutes
  const logRetention = -timeInMinutes / dValueAtTemp;
  const retention = Math.pow(10, logRetention);

  // Convert to percentage and ensure between 0 and 100
  return Math.max(0, Math.min(100, retention * 100));
}

/**
 * Calculate F0 value (equivalent time at 121°C for sterilization)
 * F0 = t * 10^((T-121)/z)
 * Where z = 10°C for most microorganisms
 */
function calculateF0(processTemp: number, processTime: number): number {
  const z = 10; // z-value for most bacterial spores
  const timeInMinutes = processTime / 60;
  const f0 = timeInMinutes * Math.pow(10, (processTemp - 121) / z);
  return f0;
}

/**
 * Calculate sterility assurance level based on F0 value
 */
function calculateSterilityAssurance(f0Value: number): number {
  // SAL = 10^(-log₁₀(D*F₀))
  // Where D is the D-value of target organism (assumed 0.2 min for C. botulinum)
  const targetDValue = 0.2;
  const logReduction = f0Value / targetDValue;
  return Math.pow(10, -logReduction);
}

/**
 * Calculate recommended overage for a nutrient based on expected losses
 */
export function calculateRecommendedOverage(
  nutrientId: string,
  expectedRetentionPercent: number
): number {
  const nutrientData = NUTRIENT_DEGRADATION_DATA[nutrientId];
  if (!nutrientData) return 0;

  // Base overage from literature
  const baseOverage = nutrientData.recommendedOveragePercent;

  // Adjust based on actual expected retention
  const retentionFactor = 100 / expectedRetentionPercent;
  const adjustedOverage = baseOverage * retentionFactor;

  // Cap at reasonable maximum (100% overage)
  return Math.min(100, Math.round(adjustedOverage * 10) / 10);
}

/**
 * Get all nutrients with their thermal sensitivity classification
 */
export function getNutrientSensitivitySummary(): Record<string, {
  name: string;
  sensitivity: string;
  recommendedProcessing: string[];
  avoidProcessing: string[];
}> {
  const summary: Record<string, {
    name: string;
    sensitivity: string;
    recommendedProcessing: string[];
    avoidProcessing: string[];
  }> = {};

  for (const [id, data] of Object.entries(NUTRIENT_DEGRADATION_DATA)) {
    const recommended: string[] = [];
    const avoid: string[] = [];

    switch (data.heatSensitivity) {
      case 'very-high':
        recommended.push('Cold-fill', 'HTST (if acceptable shelf-life)');
        avoid.push('Retort', 'UHT (>150°C)');
        break;
      case 'high':
        recommended.push('UHT (short time)', 'ASEPTIC');
        avoid.push('Retort', 'Extended HTST');
        break;
      case 'medium':
        recommended.push('UHT', 'ASEPTIC', 'HTST');
        avoid.push('Retort (>30 min)');
        break;
      case 'low':
        recommended.push('Any standard processing');
        avoid.push('None specified');
        break;
    }

    summary[id] = {
      name: data.name,
      sensitivity: data.heatSensitivity,
      recommendedProcessing: recommended,
      avoidProcessing: avoid,
    };
  }

  return summary;
}
