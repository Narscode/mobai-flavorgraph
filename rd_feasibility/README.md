# R&D Feasibility Intelligence Layer

**MoBai - AI-assisted Functional RTD Beverage Platform**

## Overview

Simplified R&D prediction layer focusing on **Formulation & COGS**. Just specify your targets (protein %, sugar, dietary constraints) and get instant formulation predictions with cost analysis.

## Quick Start

Open the HTML preview directly in your browser:

```bash
open rd_feasibility/ui/PredictionDashboard.html
```

Or integrate into React:

```tsx
import { PredictionDashboard } from './ui/PredictionDashboard';

function App() {
  return <PredictionDashboard />;
}
```

## Architecture

```
rd_feasibility/
├── engine/                      # Core engines
│   ├── types.ts               # TypeScript definitions
│   ├── ingredient_feasibility.ts
│   ├── stability_predictor.ts
│   ├── thermal_degradation.ts
│   ├── cogs_predictor.ts      # Cost analysis
│   ├── formulation_predictor.ts
│   └── ingredient_database.ts
├── ui/
│   ├── FeasibilityDashboard.tsx   # Full 4-module dashboard
│   ├── PredictionDashboard.tsx    # Simplified Formulation + COGS
│   └── PredictionDashboard.html   # Standalone HTML preview
└── README.md
```

## Simplified Prediction Dashboard

### Features (No Processing Stage)

- **Target Inputs**: Protein %, Sugar %, Dietary constraints (Vegan, Keto, Sugar-Free)
- **Instant Formulation**: AI-generated ingredient matrix
- **Nutrition Facts**: Calories, Protein, Sugar per serving
- **COGS Breakdown**: Ingredient, Packaging, Processing costs
- **Margin Analysis**: Suggested retail, wholesale, gross margin
- **AI Rationale**: Why each ingredient was selected
- **Warnings**: Taste profile notes, allergen alerts

### Usage

1. Adjust protein and sugar sliders
2. Select dietary options
3. Click "Generate Formulation"
4. View predicted ingredients, costs, and margins instantly

## Full Dashboard (4 Modules)

For complete analysis including thermal degradation and stability:

```tsx
import { FeasibilityDashboard } from './ui/FeasibilityDashboard';
```

## Ingredient Database

20+ ingredients with realistic costs:

| Category | Examples | Cost Range |
|----------|----------|------------|
| Base | Water, Coconut Water | $0.15-4.80/kg |
| Protein | Whey, Soy, Pea Isolate | $8.50-18.50/kg |
| Sweeteners | Erythritol, Stevia, Allulose | $4.20-850/kg |
| Functional | Caffeine, Taurine, B-Complex | $8.50-280/kg |
| Stabilizers | Xanthan, CMC | $8.50-12.80/kg |
| Acidulants | Citric Acid | $0.95/kg |
| Flavors | Green Tea, Yuzu | $85-150/kg |

## API Example

```typescript
// Predict formulation
const prediction = predictOptimalFormulation({
  targetCategory: 'protein-beverage',
  targetProtein: 3.0,
  targetSugar: 2,
  dietaryConstraints: { vegan: false, sugarFree: true }
});

// Get results
prediction.formulation.ingredients  // [{ id: 'whey_isolate', percentage: 3.5 }, ...]
prediction.cogs.totalCostPerBottle   // $0.2847
prediction.marginAnalysis.grossMargin // 72%
```

## Version

**v1.0.0** - June 2026 | Simplified Formulation & COGS Focus
