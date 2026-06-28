/**
 * Formulation Prediction & COGS Dashboard
 * Simplified: Only Formulation + Cost Analysis
 */

import React, { useState, useCallback, useMemo } from 'react';

// ===== INGREDIENT DATA (Simplified inline for standalone use) =====

interface IngredientDef {
  id: string;
  name: string;
  category: string;
  costPerKg: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  sugarPer100g: number;
  allergens: string[];
}

const INGREDIENTS: IngredientDef[] = [
  // Base
  { id: 'water', name: 'Purified Water', category: 'base', costPerKg: 0.15, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'coconut_water', name: 'Coconut Water', category: 'base', costPerKg: 4.80, caloriesPer100g: 18, proteinPer100g: 0.5, sugarPer100g: 4, allergens: [] },

  // Protein Sources
  { id: 'whey_isolate', name: 'Whey Protein Isolate', category: 'protein', costPerKg: 18.50, caloriesPer100g: 375, proteinPer100g: 90, sugarPer100g: 1, allergens: ['Milk'] },
  { id: 'soy_isolate', name: 'Soy Protein Isolate', category: 'protein', costPerKg: 8.50, caloriesPer100g: 338, proteinPer100g: 88, sugarPer100g: 0, allergens: ['Soy'] },
  { id: 'pea_isolate', name: 'Pea Protein Isolate', category: 'protein', costPerKg: 12.50, caloriesPer100g: 360, proteinPer100g: 85, sugarPer100g: 0, allergens: [] },

  // Sweeteners
  { id: 'erythritol', name: 'Erythritol', category: 'sweetener', costPerKg: 4.20, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'stevia', name: 'Stevia Reb-M', category: 'sweetener', costPerKg: 850, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'allulose', name: 'Allulose', category: 'sweetener', costPerKg: 12.50, caloriesPer100g: 4, proteinPer100g: 0, sugarPer100g: 90, allergens: [] },
  { id: 'sucrose', name: 'Sucrose', category: 'sweetener', costPerKg: 1.20, caloriesPer100g: 387, proteinPer100g: 0, sugarPer100g: 100, allergens: [] },

  // Functional
  { id: 'caffeine', name: 'Caffeine', category: 'functional', costPerKg: 45, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'l_theanine', name: 'L-Theanine', category: 'functional', costPerKg: 280, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'taurine', name: 'Taurine', category: 'functional', costPerKg: 8.50, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'b_complex', name: 'Vitamin B Complex', category: 'functional', costPerKg: 85, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'aloe_vera', name: 'Aloe Vera Juice', category: 'functional', costPerKg: 6.50, caloriesPer100g: 12, proteinPer100g: 0, sugarPer100g: 2.5, allergens: [] },

  // Stabilizers
  { id: 'xanthan', name: 'Xanthan Gum', category: 'stabilizer', costPerKg: 12.80, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'cmc', name: 'CMC (Cellulose Gum)', category: 'stabilizer', costPerKg: 8.50, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },

  // Acidulants
  { id: 'citric_acid', name: 'Citric Acid', category: 'acidulant', costPerKg: 0.95, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },

  // Flavors
  { id: 'green_tea_flavor', name: 'Green Tea Flavor', category: 'flavor', costPerKg: 85, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'yuzu_flavor', name: 'Yuzu Flavor', category: 'flavor', costPerKg: 150, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
  { id: 'mango_flavor', name: 'Mango Passion Flavor', category: 'flavor', costPerKg: 95, caloriesPer100g: 0, proteinPer100g: 0, sugarPer100g: 0, allergens: [] },
];

// ===== STYLES =====
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '24px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#e0e0e0',
  },
  header: { textAlign: 'center' as const, marginBottom: '32px' },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  cardTitle: { fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '20px' },
  inputGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px', fontWeight: 500 },
  slider: { width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', cursor: 'pointer' },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '14px',
  },
  button: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
    marginLeft: '12px',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: '12px' },
  th: { textAlign: 'left' as const, padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#9ca3af' },
  td: { padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' },
  tag: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    marginRight: '6px',
    marginBottom: '4px',
  },
};

// ===== HELPER FUNCTIONS =====

function formatCurrency(value: number): string {
  return `$${value.toFixed(4)}`;
}

function getIngredientById(id: string): IngredientDef | undefined {
  return INGREDIENTS.find(i => i.id === id);
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

// ===== FORMULATION PREDICTION ENGINE =====

interface FormulationPrediction {
  ingredients: { id: string; percentage: number }[];
  nutritionFacts: { calories: number; protein: number; sugar: number };
  costBreakdown: { ingredientCost: number; packaging: number; processing: number; total: number };
  marginAnalysis: { suggestedMSRP: number; wholesale: number; margin: number };
  score: number;
  rationale: string[];
  warnings: string[];
}

function predictFormulation(
  targetProtein: number,
  targetSugar: number,
  dietaryVegan: boolean,
  sugarFree: boolean,
  ketoFriendly: boolean
): FormulationPrediction {
  const ingredients: { id: string; percentage: number }[] = [];
  const rationale: string[] = [];
  const warnings: string[] = [];

  // 1. Add base (water or coconut water)
  if (targetProtein > 0 || targetSugar > 5) {
    ingredients.push({ id: 'coconut_water', percentage: 20 });
    rationale.push('Added Coconut Water for natural sweetness and electrolytes');
  } else {
    ingredients.push({ id: 'water', percentage: 75 });
    rationale.push('Using purified water as base');
  }

  // 2. Add protein source
  if (targetProtein > 0) {
    if (dietaryVegan) {
      ingredients.push({ id: 'pea_isolate', percentage: Math.min(targetProtein + 1, 8) });
      rationale.push('Selected Pea Protein for vegan-friendly high protein');
    } else {
      ingredients.push({ id: 'whey_isolate', percentage: Math.min(targetProtein + 0.5, 6) });
      rationale.push('Selected Whey Protein Isolate for superior amino acid profile');
    }
    // Add stabilizer for protein
    ingredients.push({ id: 'xanthan', percentage: 0.05 });
    rationale.push('Added Xanthan Gum for protein stabilization');
  }

  // 3. Add sweetener
  if (sugarFree || ketoFriendly) {
    ingredients.push({ id: 'erythritol', percentage: 4 });
    rationale.push('Added Erythritol for sugar-free, keto-friendly sweetness');
    if (targetSugar > 0) {
      warnings.push('Sugar-free formulation may have different taste profile');
    }
  } else if (targetSugar > 0) {
    if (targetSugar < 3) {
      ingredients.push({ id: 'stevia', percentage: 0.03 });
      rationale.push('Added Stevia for low-sugar sweetness');
    } else {
      ingredients.push({ id: 'allulose', percentage: targetSugar / 2 });
      rationale.push('Added Allulose for reduced sugar with clean taste');
    }
  }

  // 4. Add functional ingredients based on targets
  if (targetProtein > 3) {
    ingredients.push({ id: 'b_complex', percentage: 0.1 });
    rationale.push('Added Vitamin B Complex for protein metabolism');
  }

  if (targetSugar > 5 || targetProtein > 2) {
    ingredients.push({ id: 'taurine', percentage: 0.3 });
    rationale.push('Added Taurine for energy and hydration support');
  }

  // 5. Add acidulant for taste
  ingredients.push({ id: 'citric_acid', percentage: 0.2 });
  rationale.push('Added Citric Acid for bright flavor');

  // 6. Add flavor
  const flavors = ['green_tea_flavor', 'yuzu_flavor', 'mango_flavor'];
  const randomFlavor = flavors[Math.floor(Math.random() * flavors.length)];
  ingredients.push({ id: randomFlavor, percentage: 0.1 });
  rationale.push(`Added ${getIngredientById(randomFlavor)?.name} for signature taste`);

  // 7. Calculate nutrition facts
  let calories = 0;
  let protein = 0;
  let sugar = 0;

  for (const ing of ingredients) {
    const def = getIngredientById(ing.id);
    if (def) {
      calories += (def.caloriesPer100g * ing.percentage) / 100 * 33; // per 330mL
      protein += (def.proteinPer100g * ing.percentage) / 100 * 33;
      sugar += (def.sugarPer100g * ing.percentage) / 100 * 33;
    }
  }

  // 8. Calculate costs
  let ingredientCost = 0;
  for (const ing of ingredients) {
    const def = getIngredientById(ing.id);
    if (def) {
      ingredientCost += (def.costPerKg * ing.percentage) / 100 * 0.33; // 330mL bottle
    }
  }

  const packaging = 0.10; // $0.10 per bottle
  const processing = ingredientCost * 0.15; // 15% processing overhead
  const totalCost = ingredientCost + packaging + processing;

  // 9. Calculate margins
  const suggestedMSRP = Math.max(2.99, totalCost * 4);
  const wholesale = totalCost * 2.5;
  const margin = ((suggestedMSRP - totalCost) / suggestedMSRP) * 100;

  // 10. Calculate score
  let score = 70;
  if (dietaryVegan) score += 5;
  if (sugarFree) score += 5;
  if (targetProtein >= 2 && targetProtein <= 5) score += 10;
  if (margin >= 60) score += 10;
  if (ingredientCost < 0.3) score += 5;

  return {
    ingredients,
    nutritionFacts: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      sugar: Math.round(sugar * 10) / 10,
    },
    costBreakdown: {
      ingredientCost: Math.round(ingredientCost * 10000) / 10000,
      packaging: Math.round(packaging * 10000) / 10000,
      processing: Math.round(processing * 10000) / 10000,
      total: Math.round(totalCost * 10000) / 10000,
    },
    marginAnalysis: {
      suggestedMSRP: Math.round(suggestedMSRP * 100) / 100,
      wholesale: Math.round(wholesale * 100) / 100,
      margin: Math.round(margin),
    },
    score: Math.min(100, score),
    rationale,
    warnings,
  };
}

// ===== COMPONENTS =====

const ProgressBar: React.FC<{ value: number; label?: string; color?: string }> = ({ value, label, color }) => (
  <div style={{ marginBottom: '12px' }}>
    {label && (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>{value.toFixed(0)}%</span>
      </div>
    )}
    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          borderRadius: '3px',
          background: color || getScoreColor(value),
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  </div>
);

// ===== MAIN DASHBOARD =====

export const PredictionDashboard: React.FC = () => {
  // State
  const [targetProtein, setTargetProtein] = useState(3);
  const [targetSugar, setTargetSugar] = useState(2);
  const [dietaryVegan, setDietaryVegan] = useState(false);
  const [sugarFree, setSugarFree] = useState(true);
  const [ketoFriendly, setKetoFriendly] = useState(false);
  const [prediction, setPrediction] = useState<FormulationPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle prediction
  const handlePredict = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const result = predictFormulation(targetProtein, targetSugar, dietaryVegan, sugarFree, ketoFriendly);
      setPrediction(result);
      setIsLoading(false);
    }, 500);
  }, [targetProtein, targetSugar, dietaryVegan, sugarFree, ketoFriendly]);

  // Auto-predict on load
  React.useEffect(() => {
    handlePredict();
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Formulation & COGS Predictor</h1>
        <p style={{ color: '#9ca3af', fontSize: '16px' }}>
          AI-powered formulation builder with instant cost analysis
        </p>
      </div>

      <div style={styles.grid}>
        {/* Left: Targets */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🎯 Define Your Targets</h3>

          {/* Protein */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Target Protein: {targetProtein.toFixed(1)}g per serving</label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={targetProtein}
              onChange={(e) => setTargetProtein(parseFloat(e.target.value))}
              style={styles.slider}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
              <span>0g</span>
              <span>10g</span>
            </div>
          </div>

          {/* Sugar */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Target Sugar: {targetSugar.toFixed(1)}g per serving</label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={targetSugar}
              onChange={(e) => setTargetSugar(parseFloat(e.target.value))}
              style={styles.slider}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
              <span>0g</span>
              <span>20g</span>
            </div>
          </div>

          {/* Dietary Options */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Dietary Options</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { checked: dietaryVegan, setChecked: setDietaryVegan, label: '🌱 Vegan' },
                { checked: sugarFree, setChecked: setSugarFree, label: '🍬 Sugar-Free' },
                { checked: ketoFriendly, setChecked: setKetoFriendly, label: '🥑 Keto-Friendly' },
              ].map((opt, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={opt.checked}
                    onChange={(e) => opt.setChecked(e.target.checked)}
                    style={{ accentColor: '#667eea', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '14px' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button style={styles.button} onClick={handlePredict} disabled={isLoading}>
            {isLoading ? '🔮 Generating...' : '✨ Generate Formulation'}
          </button>
        </div>

        {/* Right: Results */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            📋 Predicted Formulation
            {prediction && (
              <span style={{ ...styles.scoreBadge, background: getScoreColor(prediction.score), color: '#fff' }}>
                {prediction.score}% Score
              </span>
            )}
          </h3>

          {!prediction ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥤</div>
              <p>Click "Generate Formulation" to start</p>
            </div>
          ) : (
            <>
              {/* Nutrition Facts */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#9ca3af' }}>Nutrition Facts (per 330mL)</h4>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{prediction.nutritionFacts.calories}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Calories</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>{prediction.nutritionFacts.protein}g</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Protein</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#f472b6' }}>{prediction.nutritionFacts.sugar}g</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Sugar</div>
                  </div>
                </div>
              </div>

              {/* Ingredients Table */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#9ca3af' }}>Formulation</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Ingredient</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>%</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prediction.ingredients.map((ing, i) => {
                      const def = getIngredientById(ing.id);
                      const cost = def ? (def.costPerKg * ing.percentage) / 100 * 0.33 : 0;
                      return (
                        <tr key={i}>
                          <td style={styles.td}>
                            {def?.name || ing.id}
                            {def?.allergens.length > 0 && (
                              <span style={{ ...styles.tag, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                {def.allergens[0]}
                              </span>
                            )}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: 500 }}>
                            {ing.percentage.toFixed(2)}%
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right', color: '#9ca3af' }}>
                            {formatCurrency(cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cost Breakdown */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#9ca3af' }}>Cost Breakdown (per bottle)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>Ingredients</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(prediction.costBreakdown.ingredientCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>Packaging</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(prediction.costBreakdown.packaging)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>Processing (15%)</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(prediction.costBreakdown.processing)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Total COGS</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#667eea' }}>{formatCurrency(prediction.costBreakdown.total)}</span>
                  </div>
                </div>
              </div>

              {/* Margin Analysis */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#9ca3af' }}>Margin Analysis</h4>
                <ProgressBar value={prediction.marginAnalysis.margin} label="Gross Margin" color="#22c55e" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>${prediction.marginAnalysis.suggestedMSRP}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Suggested Retail</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#84cc16' }}>${prediction.marginAnalysis.wholesale}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Wholesale</div>
                  </div>
                </div>
              </div>

              {/* Rationale */}
              {prediction.rationale.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e', marginBottom: '8px' }}>✨ AI Rationale</h4>
                  {prediction.rationale.map((r, i) => (
                    <p key={i} style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '4px' }}>• {r}</p>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {prediction.warnings.length > 0 && (
                <div style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', marginBottom: '8px' }}>⚠️ Warnings</h4>
                  {prediction.warnings.map((w, i) => (
                    <p key={i} style={{ fontSize: '12px', color: '#d1d5db' }}>• {w}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ingredient Reference */}
      <div style={{ ...styles.card, marginTop: '24px', maxWidth: '1200px', margin: '24px auto 0' }}>
        <h3 style={styles.cardTitle}>📚 Available Ingredients Reference</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {INGREDIENTS.map((ing) => (
            <div key={ing.id} style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{ing.name}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>${ing.costPerKg}/kg</div>
              {ing.allergens.length > 0 && (
                <span style={{ ...styles.tag, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  {ing.allergens[0]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        color: '#6b7280',
        fontSize: '12px',
      }}>
        MoBai Formulation & COGS Predictor v1.0 | Simple & Focused
      </div>
    </div>
  );
};

export default PredictionDashboard;
