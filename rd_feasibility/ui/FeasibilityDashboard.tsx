/**
 * R&D Feasibility Dashboard Component
 * MoBai - AI-assisted Functional RTD Beverage Platform
 *
 * A premium dark-glassmorphism UI for visualizing the 4 core feasibility modules:
 * 1. Ingredient Feasibility & Supplier Filter
 * 2. Shelf-Life & Stability Risk Predictor
 * 3. Thermal Degradation & Nutrient Retention
 * 4. Formulation-Aware COGS Predictor
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  evaluateIngredientFeasibility,
  predictStabilityRisk,
  calculateThermalDegradation,
  calculateCOGS,
  ASIAN_RTD_INGREDIENTS,
  INGREDIENT_DATABASE,
  type Ingredient,
  type FormulationInput,
  type IngredientFeasibilityResult,
  type StabilityRiskResult,
  type NutrientRetentionResult,
  type COGSResult,
} from '../engine';

// Type definitions for the dashboard
interface DashboardState {
  formulation: FormulationInput;
  results: {
    ingredientFeasibility: IngredientFeasibilityResult | null;
    stabilityRisk: StabilityRiskResult | null;
    nutrientRetention: NutrientRetentionResult | null;
    cogs: COGSResult | null;
  };
  overallScore: number;
}

// CSS-in-JS styles for dark glassmorphism
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '24px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: '#e0e0e0',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#9ca3af',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '24px',
    maxWidth: '1600px',
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
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
  },
  scoreBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '6px',
    fontWeight: 500,
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  progressBar: {
    height: '8px',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  text: {
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: 1.6,
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  warningBox: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  successBox: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  chartContainer: {
    height: '200px',
    marginTop: '16px',
  },
  doughnutContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '180px',
  },
};

// Helper functions
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

const getRiskColor = (score: number): string => {
  if (score <= 25) return '#22c55e';
  if (score <= 50) return '#84cc16';
  if (score <= 75) return '#eab308';
  return '#ef4444';
};

const formatCurrency = (value: number): string => {
  return `$${value.toFixed(4)}`;
};

// Progress Bar Component
const ProgressBar: React.FC<{
  value: number;
  max?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
}> = ({ value, max = 100, color, label, showValue = true }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color || getScoreColor(value);

  return (
    <div style={{ marginBottom: '12px' }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          {label && <span style={styles.label}>{label}</span>}
          {showValue && <span style={{ ...styles.label, fontWeight: 600 }}>{value.toFixed(1)}</span>}
        </div>
      )}
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${percentage}%`,
            background: barColor,
          }}
        />
      </div>
    </div>
  );
};

// Radar Chart Component (Simplified SVG)
const RadarChart: React.FC<{
  data: { label: string; value: number }[];
  maxValue?: number;
}> = ({ data, maxValue = 100 }) => {
  const size = 180;
  const center = size / 2;
  const radius = 70;
  const angleStep = (2 * Math.PI) / data.length;

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / maxValue) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = data.map((d, i) => {
    const point = getPoint(i, d.value);
    return `${point.x},${point.y}`;
  }).join(' ');

  const gridLevels = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Grid circles */}
      {gridLevels.map(level => (
        <circle
          key={level}
          cx={center}
          cy={center}
          r={(level / maxValue) * radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {data.map((_, i) => {
        const point = getPoint(i, maxValue);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(102, 126, 234, 0.3)"
        stroke="#667eea"
        strokeWidth="2"
      />

      {/* Data points */}
      {data.map((d, i) => {
        const point = getPoint(i, d.value);
        return (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#667eea"
            stroke="#fff"
            strokeWidth="2"
          />
        );
      })}

      {/* Labels */}
      {data.map((d, i) => {
        const point = getPoint(i, maxValue + 20);
        return (
          <text
            key={i}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="10"
          >
            {d.label.split(' ')[0]}
          </text>
        );
      })}
    </svg>
  );
};

// Doughnut Chart Component
const DoughnutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
}> = ({ data, centerLabel, centerValue }) => {
  const size = 180;
  const strokeWidth = 25;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const segments = data.map((d, i) => {
    const percentage = d.value / data.reduce((sum, item) => sum + item.value, 0);
    const dashLength = percentage * circumference;
    const dashOffset = -currentOffset;
    currentOffset += dashLength;

    return (
      <circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'all 0.5s ease' }}
      />
    );
  });

  return (
    <div style={styles.doughnutContainer}>
      <div style={{ position: 'relative' }}>
        <svg width={size} height={size}>
          {segments}
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          {centerValue && (
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
              {centerLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export const FeasibilityDashboard: React.FC = () => {
  // State
  const [formulation, setFormulation] = useState<FormulationInput>({
    name: 'High-Protein Functional Energy Drink',
    baseLiquid: 'WTR_001',
    ingredients: [
      { ingredientId: 'WTR_001', percentage: 85 },
      { ingredientId: 'PRO_001', percentage: 3.5 },
      { ingredientId: 'SWT_001', percentage: 5 },
      { ingredientId: 'ACD_001', percentage: 0.3 },
      { ingredientId: 'VIT_001', percentage: 0.05 },
      { ingredientId: 'STB_001', percentage: 0.15 },
      { ingredientId: 'FNC_002', percentage: 0.03 },
    ],
    targetPH: 3.8,
    targetBrix: 6.5,
    processingMethod: 'UHT',
    processingTemp: 140,
    processingTime: 4,
    targetShelfLifeMonths: 9,
    targetServingSize: 330,
    targetDailyServings: 2,
  });

  // Calculate results when formulation changes
  const results = useMemo(() => {
    const ingredients = formulation.ingredients
      .map(fi => INGREDIENT_DATABASE.get(fi.ingredientId))
      .filter((ing): ing is Ingredient => ing !== undefined);

    const ingredientFeasibility = evaluateIngredientFeasibility(
      ingredients,
      formulation,
      INGREDIENT_DATABASE
    );
    const stabilityRisk = predictStabilityRisk(formulation, ingredients);
    const nutrientRetention = calculateThermalDegradation(formulation, ingredients);
    const cogs = calculateCOGS(formulation, ingredients);

    // Calculate overall score
    const stabilityScore = 100 - stabilityRisk.overallRiskScore;
    const overallScore = Math.round(
      ingredientFeasibility.overallScore * 0.25 +
      stabilityScore * 0.25 +
      nutrientRetention.overallRetentionScore * 0.20 +
      (cogs.marginProjection?.grossMarginPercent || 50) * 0.30
    );

    return {
      ingredientFeasibility,
      stabilityRisk,
      nutrientRetention,
      cogs,
      overallScore,
    };
  }, [formulation]);

  // Event handlers
  const handlePHChange = useCallback((value: number) => {
    setFormulation(prev => ({ ...prev, targetPH: value }));
  }, []);

  const handleProteinChange = useCallback((value: number) => {
    setFormulation(prev => {
      const proteinIdx = prev.ingredients.findIndex(i => i.ingredientId === 'PRO_001');
      const newIngredients = [...prev.ingredients];
      if (proteinIdx >= 0) {
        newIngredients[proteinIdx] = { ...newIngredients[proteinIdx], percentage: value };
      }
      return { ...prev, ingredients: newIngredients };
    });
  }, []);

  const handleProcessChange = useCallback((method: FormulationInput['processingMethod']) => {
    const params: Record<string, { temp: number; time: number }> = {
      'UHT': { temp: 140, time: 4 },
      'RETORT': { temp: 121, time: 1800 },
      'HTST': { temp: 72, time: 15 },
      'COLD_FILL': { temp: 25, time: 0 },
      'ASEPTIC': { temp: 137, time: 5 },
    };
    setFormulation(prev => ({
      ...prev,
      processingMethod: method,
      processingTemp: params[method].temp,
      processingTime: params[method].time,
    }));
  }, []);

  // Extract ingredient details for COGS chart
  const cogsChartData = useMemo(() => {
    if (!results.cogs) return [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    return results.cogs.ingredientDetail.slice(0, 6).map((ing, i) => ({
      label: ing.name.length > 15 ? ing.name.substring(0, 12) + '...' : ing.name,
      value: ing.costPerBottle,
      color: colors[i % colors.length],
    }));
  }, [results.cogs]);

  // Risk factors for radar chart
  const riskFactors = useMemo(() => {
    if (!results.stabilityRisk) return [];
    const { riskBreakdown } = results.stabilityRisk;
    return [
      { label: 'pH Risk', value: riskBreakdown.pHRisk },
      { label: 'Protein Risk', value: riskBreakdown.proteinStabilityRisk },
      { label: 'Stabilizer', value: riskBreakdown.stabilizerAdequacyRisk },
      { label: 'Flavor', value: riskBreakdown.flavorCompatibilityRisk },
      { label: 'Phase Sep', value: riskBreakdown.phaseSeparationRisk },
    ];
  }, [results.stabilityRisk]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>R&D Feasibility Intelligence Layer</h1>
        <p style={styles.subtitle}>MoBai AI-assisted Functional RTD Beverage Platform</p>
      </div>

      {/* Interactive Controls */}
      <div style={{ ...styles.card, marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
        <h3 style={{ ...styles.cardTitle, marginBottom: '20px' }}>Adjust Formulation Parameters</h3>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Target pH Level: {formulation.targetPH.toFixed(1)}</label>
          <input
            type="range"
            min="2.5"
            max="7.5"
            step="0.1"
            value={formulation.targetPH}
            onChange={(e) => handlePHChange(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Protein Concentration: {formulation.ingredients.find(i => i.ingredientId === 'PRO_001')?.percentage.toFixed(1) || 0}%</label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={formulation.ingredients.find(i => i.ingredientId === 'PRO_001')?.percentage || 0}
            onChange={(e) => handleProteinChange(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Processing Method</label>
          <select
            value={formulation.processingMethod}
            onChange={(e) => handleProcessChange(e.target.value as FormulationInput['processingMethod'])}
            style={styles.select}
          >
            <option value="UHT">UHT (Ultra-High Temperature)</option>
            <option value="RETORT">Retort Sterilization</option>
            <option value="HTST">HTST (High-Temperature Short Time)</option>
            <option value="COLD_FILL">Cold Fill Aseptic</option>
            <option value="ASEPTIC">Aseptic Processing</option>
          </select>
        </div>

        <div style={{
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Overall Feasibility Score</span>
            <span style={{
              ...styles.scoreBadge,
              background: getScoreColor(results.overallScore),
              color: '#fff',
            }}>
              {results.overallScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div style={styles.grid}>
        {/* Module 1: Ingredient Feasibility */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>1. Ingredient Feasibility</h3>
            <span style={{
              ...styles.scoreBadge,
              background: getScoreColor(results.ingredientFeasibility?.overallScore || 0),
              color: '#fff',
            }}>
              {results.ingredientFeasibility?.overallScore || 0}/100
            </span>
          </div>

          <ProgressBar
            label="Availability"
            value={results.ingredientFeasibility?.scoreBreakdown.availabilityScore || 0}
          />
          <ProgressBar
            label="MOQ Compliance"
            value={results.ingredientFeasibility?.scoreBreakdown.moqScore || 0}
          />
          <ProgressBar
            label="Cost Efficiency"
            value={results.ingredientFeasibility?.scoreBreakdown.costScore || 0}
          />
          <ProgressBar
            label="Regulatory Status"
            value={results.ingredientFeasibility?.scoreBreakdown.regulatoryScore || 0}
          />

          {results.ingredientFeasibility?.recommendedSubstitutes.length ? (
            <div style={styles.successBox}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e', marginBottom: '8px' }}>
                Substitutes Available
              </div>
              {results.ingredientFeasibility.recommendedSubstitutes.slice(0, 2).map((sub, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#d1d5db' }}>
                  • {sub.originalName} → {sub.substituteName}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Module 2: Stability Risk */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>2. Stability Risk</h3>
            <span style={{
              ...styles.scoreBadge,
              background: getRiskColor(results.stabilityRisk?.overallRiskScore || 100),
              color: '#fff',
            }}>
              Risk: {results.stabilityRisk?.riskLevel || 'Unknown'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart data={riskFactors} />
          </div>

          <div style={{ marginTop: '16px' }}>
            <ProgressBar
              label="Est. Shelf Life"
              value={Math.min(365, results.stabilityRisk?.shelfLifeEstimate.maxDays || 0)}
              max={365}
              color="#667eea"
            />
          </div>

          {results.stabilityRisk?.suggestedPHAdjustment && (
            <div style={styles.warningBox}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>
                pH Adjustment Suggested
              </div>
              <div style={{ fontSize: '12px', color: '#d1d5db' }}>
                Target: {results.stabilityRisk.suggestedPHAdjustment.targetPH} using {results.stabilityRisk.suggestedPHAdjustment.acidulant}
              </div>
            </div>
          )}

          {results.stabilityRisk?.warnings.slice(0, 2).map((warning, i) => (
            <div key={i} style={{ ...styles.warningBox, marginTop: '8px' }}>
              <div style={{ fontSize: '12px', color: '#d1d5db' }}>⚠️ {warning}</div>
            </div>
          ))}
        </div>

        {/* Module 3: Thermal Degradation */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>3. Nutrient Retention</h3>
            <span style={{
              ...styles.scoreBadge,
              background: getScoreColor(results.nutrientRetention?.overallRetentionScore || 0),
              color: '#fff',
            }}>
              {results.nutrientRetention?.overallRetentionScore || 0}%
            </span>
          </div>

          <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>
            Process: {results.nutrientRetention?.thermalProcessAssessment.processType}
            ({formulation.processingTemp}°C, {formulation.processingTime}s)
          </div>

          {Object.entries(results.nutrientRetention?.nutrientRetention || {}).slice(0, 4).map(([key, data]) => (
            <ProgressBar
              key={key}
              label={data.name || key}
              value={data.retainedPercent}
              color={data.retainedPercent >= 80 ? '#22c55e' : data.retainedPercent >= 60 ? '#eab308' : '#ef4444'}
            />
          ))}

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
            F₀ Value: {results.nutrientRetention?.thermalProcessAssessment.f0Value.toFixed(2)}
          </div>

          {results.nutrientRetention?.recommendations.slice(0, 1).map((rec, i) => (
            <div key={i} style={{ ...styles.warningBox, marginTop: '8px' }}>
              <div style={{ fontSize: '12px', color: '#d1d5db' }}>💡 {rec}</div>
            </div>
          ))}
        </div>

        {/* Module 4: COGS */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>4. Cost Analysis</h3>
            <span style={{
              ...styles.scoreBadge,
              background: 'rgba(102, 126, 234, 0.3)',
              color: '#fff',
            }}>
              {results.cogs?.marginProjection?.grossMarginPercent || 0}% Margin
            </span>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <DoughnutChart
              data={cogsChartData}
              centerValue={formatCurrency(results.cogs?.totalCostPerBottle || 0)}
              centerLabel="per bottle"
            />
            <div style={{ flex: 1 }}>
              {cogsChartData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: item.color,
                    marginRight: '8px',
                  }} />
                  <span style={{ fontSize: '11px', color: '#9ca3af', flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: '11px', color: '#fff' }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Ingredients</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                ${results.cogs?.costBreakdown.ingredientsCost.toFixed(4)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Processing</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                ${results.cogs?.costBreakdown.processingCost.toFixed(4)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Packaging</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                ${results.cogs?.costBreakdown.packagingCost.toFixed(4)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Overhead</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                ${results.cogs?.costBreakdown.overheadCost.toFixed(4)}
              </div>
            </div>
          </div>

          {results.cogs?.marginProjection && (
            <div style={{ ...styles.successBox, marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Suggested MSRP</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>${results.cogs.marginProjection.suggestedMSRP}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Wholesale</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>${results.cogs.marginProjection.targetWholesale}</span>
              </div>
            </div>
          )}
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
        MoBai R&D Feasibility Intelligence Layer v1.0 | Last Updated: June 2026
      </div>
    </div>
  );
};

export default FeasibilityDashboard;
