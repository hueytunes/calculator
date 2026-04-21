/* ==========================================================================
   recipe.js — Recipe Builder data model + compute.
   Pure functions; no DOM. Screen modules wire this to the UI.
   ========================================================================== */

import {
  parseNumber, parseConcentration, parseToBase,
  volumeToBase, massToBase, molarToBase, massPerVolToBase, percentToBase,
} from './utils.js';

export const SOURCE_TYPES = {
  'liquid-stock':        'Liquid stock (with concentration)',
  'powder-mw':           'Solid powder (with MW)',
  'powder-mass':         'Solid powder (by mass only)',
  'x-concentrated':      '×-concentrated stock',
  'pure-liquid-density': 'Pure liquid (with density)',
  'ratio-dilution':      'Ratio dilution (1:X)',
};

export const DILUENT_OPTIONS = [
  { value: 'PBS',     label: 'PBS' },
  { value: 'Water',   label: 'Water (ddH₂O)' },
  { value: 'Tris',    label: 'Tris buffer' },
  { value: 'Media',   label: 'Media' },
  { value: 'TE',      label: 'TE' },
  { value: 'custom',  label: 'Custom…' },
];

/* ---------------------------------------------------------------------------
   Make a blank ingredient.
   --------------------------------------------------------------------------*/
export function blankIngredient() {
  return {
    id: 'ing-' + Math.random().toString(36).slice(2, 10),
    name: '',
    source: 'liquid-stock',
    sourceInputs: { stockValue: '', stockUnit: 'M', density: '', xFactor: '', ratioX: '' },
    targetInputs: { value: '', unit: 'mM' },
    mw: '',
  };
}

/* Blank recipe skeleton. */
export function blankRecipe() {
  return {
    id: 'rec-' + Math.random().toString(36).slice(2, 10),
    name: 'New recipe',
    icon: '✨',
    finalVolume: { value: 50, unit: 'mL' },
    diluent: 'PBS',
    customDiluent: '',
    ingredients: [blankIngredient()],
    createdAt: null,
    updatedAt: null,
    isPreset: false,
    presetId: null,
  };
}

/* ---------------------------------------------------------------------------
   Compute a recipe → per-ingredient amounts + diluent volume + protocol.
   Returns { ingredients: [{id, name, amount: {value, unit}, kind, note}],
             diluentVolL, finalVolL, errors: [] }
   kind is 'volume' (liquid, mL/µL) or 'mass' (powder, mg/µg)
   --------------------------------------------------------------------------*/
export function computeRecipe(recipe) {
  const errors = [];
  const finalVol = parseToBase(
    recipe.finalVolume.value,
    recipe.finalVolume.unit,
    volumeToBase,
    'final volume',
  );
  if (finalVol.error) return { error: finalVol.error, errors: [finalVol.error], ingredients: [], diluentVolL: 0, finalVolL: 0 };

  const out = [];
  let totalLiquidL = 0;

  for (const ing of (recipe.ingredients || [])) {
    if (!ing || !ing.name) continue;        // skip blank rows
    const res = computeIngredient(ing, finalVol);
    if (res.error) {
      errors.push(`${ing.name}: ${res.error}`);
      out.push({ id: ing.id, name: ing.name, error: res.error });
      continue;
    }
    if (res.kind === 'volume') totalLiquidL += res.amountBaseL;
    out.push({ id: ing.id, name: ing.name, ...res });
  }

  const diluentVolL = finalVol - totalLiquidL;

  if (diluentVolL < -1e-9) {
    errors.push(`Ingredients require ${formatMl(totalLiquidL)} but final volume is ${formatMl(finalVol)}. Increase final volume or reduce concentrations.`);
  }

  return {
    ingredients: out,
    diluentVolL: Math.max(0, diluentVolL),
    finalVolL: finalVol,
    errors,
  };
}

function formatMl(L) { return `${(L * 1000).toFixed(2)} mL`; }

/* ---------------------------------------------------------------------------
   Compute a single ingredient → { kind, amountBaseL | amountBaseG, note }
   --------------------------------------------------------------------------*/
function computeIngredient(ing, finalVolL) {
  const target = parseConcentration(ing.targetInputs.value, ing.targetInputs.unit);
  if (target.error && ing.source !== 'ratio-dilution' && ing.source !== 'powder-mass') {
    // ratio and powder-mass may not use standard concentration; they have
    // their own input schemas.
  }

  switch (ing.source) {
    case 'liquid-stock': {
      if (target.error) return target;
      const stock = parseConcentration(ing.sourceInputs.stockValue, ing.sourceInputs.stockUnit);
      if (stock.error) return stock;
      // Need to resolve stock + target to compatible types. If different type,
      // try to bridge via MW.
      return computeLiquidStock(stock, target, finalVolL, ing.mw);
    }
    case 'powder-mw': {
      if (target.error) return target;
      const mwN = parseNumber(ing.mw);
      if (mwN && mwN.error) return { error: 'MW is required for this ingredient.' };
      if (mwN <= 0) return { error: 'MW must be greater than zero.' };
      return computePowderMw(target, finalVolL, mwN);
    }
    case 'powder-mass': {
      // Target must be % w/v, % w/w, mass/vol, or a direct mass
      if (ing.targetInputs.unit === 'g' || ing.targetInputs.unit === 'mg' || ing.targetInputs.unit === 'µg' || ing.targetInputs.unit === 'ng') {
        const massG = parseToBase(ing.targetInputs.value, ing.targetInputs.unit, massToBase, 'mass');
        if (massG.error) return massG;
        return { kind: 'mass', amountBaseG: massG, note: 'Weigh directly.' };
      }
      if (target.error) return target;
      if (target.type !== 'massvol' && target.type !== 'percent-wv' && target.type !== 'percent-ww') {
        return { error: 'Use a mass/vol, % w/v, % w/w, or direct mass unit for powder-by-mass.' };
      }
      // massG = conc(mg/mL) × finalVol(L)  → result in grams
      const massG = target.value * finalVolL;
      return { kind: 'mass', amountBaseG: massG, note: 'Weigh on a balance.' };
    }
    case 'x-concentrated': {
      // stock is X-factor, target is X-factor too.
      const stockX = parseConcentration(ing.sourceInputs.stockValue, ing.sourceInputs.stockUnit);
      if (stockX.error) return stockX;
      if (target.error) return target;
      if (stockX.type !== 'factor' || target.type !== 'factor') {
        return { error: 'Both stock and target must be × units for ×-concentrated.' };
      }
      if (stockX.value <= 0) return { error: 'Stock × factor must be > 0.' };
      if (stockX.value < target.value) return { error: 'Target × cannot exceed stock ×.' };
      const volL = (target.value * finalVolL) / stockX.value;
      return { kind: 'volume', amountBaseL: volL, note: `${formatMl(volL)} of ${stockX.value}× stock`};
    }
    case 'pure-liquid-density': {
      // density given in g/mL. Target → mass needed → volume = mass/density.
      const density = parseNumber(ing.sourceInputs.density);
      if (density && density.error) return { error: 'Density (g/mL) is required.' };
      if (density <= 0) return { error: 'Density must be > 0.' };
      if (target.error) return target;
      let massG;
      if (target.type === 'molar') {
        const mwN = parseNumber(ing.mw);
        if (mwN && mwN.error) return { error: 'MW required for molar targets on pure liquids.' };
        if (mwN <= 0) return { error: 'MW must be > 0.' };
        massG = target.value * finalVolL * mwN;
      } else if (target.type === 'massvol' || target.type === 'percent-wv' || target.type === 'percent-ww') {
        massG = target.value * finalVolL;  // base mg/mL × L = mass in g
      } else if (target.type === 'percent-vv') {
        // volume-based — skip mass, compute volume directly
        const volL = (target.value / 100) * finalVolL;
        return { kind: 'volume', amountBaseL: volL, note: 'Measured by volume' };
      } else {
        return { error: 'Pure-liquid supports molar, mass/vol, % w/v, or % v/v.' };
      }
      const volL = (massG / density) / 1000;  // g / (g/mL) = mL → /1000 = L
      return { kind: 'volume', amountBaseL: volL, note: `density ${density} g/mL` };
    }
    case 'ratio-dilution': {
      // 1:X convention = 1 part stock in X parts total.
      const x = parseNumber(ing.sourceInputs.ratioX);
      if (x && x.error) return { error: 'Ratio X is required (for 1:X).' };
      if (x <= 1) return { error: 'Ratio X must be > 1.' };
      const volL = finalVolL / x;
      return { kind: 'volume', amountBaseL: volL, note: `1:${x} → ${formatMl(volL)} of stock` };
    }
    default:
      return { error: `Unknown source type: ${ing.source}` };
  }
}

function computeLiquidStock(stock, target, finalVolL, mw) {
  // Same-family: easy.
  if (stock.type === target.type) {
    if (stock.value === 0) return { error: 'Stock concentration cannot be zero.' };
    if (stock.value < target.value) return { error: 'Stock concentration is less than target.' };
    const volL = (target.value * finalVolL) / stock.value;
    return { kind: 'volume', amountBaseL: volL, note: 'C₁V₁=C₂V₂' };
  }
  // Bridge molar ↔ mass/vol via MW
  if ((stock.type === 'molar' && target.type === 'massvol') ||
      (stock.type === 'massvol' && target.type === 'molar')) {
    const mwN = parseNumber(mw);
    if (mwN && mwN.error) return { error: 'MW is required when stock and target use different unit families.' };
    if (mwN <= 0) return { error: 'MW must be > 0 to bridge units.' };
    let stockMgMl, targetMgMl;
    if (stock.type === 'molar') stockMgMl = stock.value * mwN * 1000;  // M × g/mol × 1000 = mg/L × (1/1000) ... wait
    // Actually: M = mol/L. g/L = M × g/mol. mg/mL = g/L. So mg/mL = M × g/mol.
    stockMgMl = (stock.type === 'molar') ? stock.value * mwN : stock.value;
    targetMgMl = (target.type === 'molar') ? target.value * mwN : target.value;
    if (stockMgMl === 0) return { error: 'Stock concentration cannot be zero.' };
    if (stockMgMl < targetMgMl) return { error: 'Stock concentration is less than target (after MW conversion).' };
    const volL = (targetMgMl * finalVolL) / stockMgMl;
    return { kind: 'volume', amountBaseL: volL, note: 'Bridged via MW' };
  }
  // Percent w/v and mass/vol are same family numerically (both mg/mL base)
  const pctGroup = ['massvol', 'percent-wv', 'percent-ww'];
  if (pctGroup.includes(stock.type) && pctGroup.includes(target.type)) {
    if (stock.value === 0) return { error: 'Stock concentration cannot be zero.' };
    if (stock.value < target.value) return { error: 'Stock concentration is less than target.' };
    const volL = (target.value * finalVolL) / stock.value;
    return { kind: 'volume', amountBaseL: volL, note: 'C₁V₁=C₂V₂' };
  }
  return { error: `Cannot dilute ${stock.type} stock into ${target.type} target without a unit bridge.` };
}

function computePowderMw(target, finalVolL, mw) {
  // Need mass in grams. mass = molarity × vol × MW OR mass = conc × vol
  let massG;
  if (target.type === 'molar') {
    massG = target.value * finalVolL * mw;
  } else if (target.type === 'massvol' || target.type === 'percent-wv' || target.type === 'percent-ww') {
    massG = target.value * finalVolL;
  } else {
    return { error: 'Use a molar, mass/vol, or % w/v target for powder with MW.' };
  }
  return { kind: 'mass', amountBaseG: massG, note: `via MW ${mw} g/mol` };
}
