/* ==========================================================================
   calculators.js — pure math functions, DOM-free.
   Each function takes a plain-object spec and returns either a result
   object or { error: '...' }. Screen modules consume and render the
   results; they never parse inputs in this file.

   Base units (internal):
     volume      → L
     mass        → g
     molar conc  → M
     mass/vol    → mg/mL  (numerically equal to g/L)
     activity    → IU/mL
   ========================================================================== */

import {
  parseNumber, parseToBase, parseConcentration,
  volumeToBase, massToBase, molarToBase, massPerVolToBase,
} from './utils.js';

/* ---------------------------------------------------------------------------
   1. Dilution — C1V1 = C2V2
   --------------------------------------------------------------------------*/
export function computeDilution({ stockVal, stockUnit, finalVal, finalUnit, volVal, volUnit }) {
  const stock = parseConcentration(stockVal, stockUnit);
  if (stock.error) return stock;
  const final = parseConcentration(finalVal, finalUnit);
  if (final.error) return final;
  const finalVol = parseToBase(volVal, volUnit, volumeToBase, 'volume');
  if (finalVol.error) return finalVol;

  if (stock.type !== final.type) {
    return { error: 'Stock and final concentration must be the same type (both molar, both mass/vol, etc.).' };
  }
  if (stock.value === 0) return { error: 'Stock concentration cannot be zero.' };
  if (stock.value < final.value) return { error: 'Stock concentration cannot be less than the final concentration.' };

  const stockVolL = (final.value * finalVol) / stock.value;
  const diluentVolL = finalVol - stockVolL;

  return {
    stockVolL,
    diluentVolL,
    finalVolL: finalVol,
    userFinalVolUnit: volUnit,
  };
}

/* ---------------------------------------------------------------------------
   2. Concentration — merged Molarity + Mass/Vol/Conc.
   Solve for one of mass / volume / concentration, given the other two.
   MW is required only when a molar concentration unit is selected.
   --------------------------------------------------------------------------*/
export function computeConcentration({ solveFor, mw, massVal, massUnit, volVal, volUnit, concVal, concUnit }) {
  let massG = null;
  let volL = null;
  let parsedConc = null;

  if (solveFor !== 'mass') {
    const m = parseToBase(massVal, massUnit, massToBase, 'mass');
    if (m.error) return m;
    massG = m;
  }
  if (solveFor !== 'volume') {
    const v = parseToBase(volVal, volUnit, volumeToBase, 'volume');
    if (v.error) return v;
    volL = v;
  }
  if (solveFor !== 'concentration') {
    const c = parseConcentration(concVal, concUnit);
    if (c.error) return c;
    parsedConc = c;
    // If molar, need MW to bridge to mass
    if (c.type === 'molar') {
      const mwN = parseNumber(mw);
      if (mwN && mwN.error) return { error: 'Molecular weight is required for molar concentrations.' };
      if (mwN <= 0) return { error: 'Molecular weight must be greater than zero.' };
    }
  }

  // When user requests a molar-unit target for "solve for concentration",
  // we need MW to convert from mass/vol to molarity.
  if (solveFor === 'concentration') {
    if (molarToBase[concUnit] !== undefined) {
      const mwN = parseNumber(mw);
      if (mwN && mwN.error) return { error: 'Molecular weight is required for molar concentrations.' };
      if (mwN <= 0) return { error: 'Molecular weight must be greater than zero.' };
    }
  }

  const mwN = (typeof mw === 'number') ? mw : parseFloat(mw);

  if (solveFor === 'mass') {
    // mass = conc × vol  (convert molar → mass/vol via MW if needed)
    if (parsedConc.type === 'molar') {
      // M × L × g/mol = g
      massG = parsedConc.value * volL * mwN;
    } else if (parsedConc.type === 'massvol' || parsedConc.type === 'percent-wv' || parsedConc.type === 'percent-ww') {
      // mg/mL × L = 1e3 mg/L × L... actually: base for parsedConc is mg/mL.
      // mass in g = conc(mg/mL) × vol(L) × 1000 mL/L / 1000 mg/g = conc × vol
      massG = parsedConc.value * volL;
    } else {
      return { error: 'This concentration type cannot be used to solve for mass.' };
    }
    return { solved: 'mass', massG };
  }

  if (solveFor === 'volume') {
    if (parsedConc.type === 'molar') {
      // vol(L) = mass(g) / (molar × MW)
      volL = massG / (parsedConc.value * mwN);
    } else if (parsedConc.type === 'massvol' || parsedConc.type === 'percent-wv' || parsedConc.type === 'percent-ww') {
      if (parsedConc.value === 0) return { error: 'Concentration cannot be zero.' };
      volL = massG / parsedConc.value;
    } else {
      return { error: 'This concentration type cannot be used to solve for volume.' };
    }
    return { solved: 'volume', volL };
  }

  if (solveFor === 'concentration') {
    if (volL === 0) return { error: 'Volume cannot be zero.' };
    // Requesting molar output → use MW
    if (molarToBase[concUnit] !== undefined) {
      // M = g / (L × g/mol)
      const molarityM = massG / (volL * mwN);
      return { solved: 'concentration', outType: 'molar', valueBase: molarityM, outUnit: concUnit };
    }
    // Requesting mass/vol → value in mg/mL
    if (massPerVolToBase[concUnit] !== undefined) {
      const mgPerMl = massG / volL; // g / L  = mg/mL numerically
      return { solved: 'concentration', outType: 'massvol', valueBase: mgPerMl, outUnit: concUnit };
    }
    if (concUnit === '% w/v') {
      const mgPerMl = massG / volL;
      return { solved: 'concentration', outType: 'percent-wv', valueBase: mgPerMl, outUnit: concUnit };
    }
    return { error: `Unsupported output unit: ${concUnit}.` };
  }
}

/* ---------------------------------------------------------------------------
   3. Reconstitution — mass in vial + desired conc → volume of solvent
   --------------------------------------------------------------------------*/
export function computeReconstitution({ massVal, massUnit, concVal, concUnit, mw }) {
  const massG = parseToBase(massVal, massUnit, massToBase, 'mass');
  if (massG.error) return massG;
  const desired = parseConcentration(concVal, concUnit);
  if (desired.error) return desired;

  let volL;
  if (desired.type === 'molar') {
    const mwN = parseNumber(mw);
    if (mwN && mwN.error) return { error: 'Molecular weight is required for molar concentrations.' };
    if (mwN <= 0) return { error: 'Molecular weight must be greater than zero.' };
    const moles = massG / mwN;
    volL = moles / desired.value;
  } else if (desired.type === 'massvol' || desired.type === 'percent-wv' || desired.type === 'percent-ww') {
    if (desired.value === 0) return { error: 'Desired concentration cannot be zero.' };
    // desired.value is mg/mL; mass in g; vol(L) = mass(g) / conc(mg/mL)
    volL = massG / desired.value;
  } else if (desired.type === 'activity') {
    if (desired.value === 0) return { error: 'Desired concentration cannot be zero.' };
    // For activity, we can't compute from mass alone — would need specific activity.
    return { error: 'Activity-unit reconstitution needs specific activity; use mass/vol instead.' };
  } else {
    return { error: 'Unsupported concentration type for reconstitution.' };
  }

  if (!Number.isFinite(volL) || volL <= 0) {
    return { error: 'Calculation produced an invalid volume. Check inputs.' };
  }
  return { volL };
}

/* ---------------------------------------------------------------------------
   4a. Seeding — single suspension (formerly calculateCellSeeding)
   Inputs are plain cells/mL numbers (expanded from mantissa×exponent
   by the screen) and volume in mL.
   --------------------------------------------------------------------------*/
export function computeSeedingSingle({ stockConc, finalConc, finalVolMl }) {
  if (!Number.isFinite(stockConc) || stockConc <= 0) return { error: 'Stock concentration must be a positive number.' };
  if (!Number.isFinite(finalConc) || finalConc < 0)  return { error: 'Final concentration must be a non-negative number.' };
  if (!Number.isFinite(finalVolMl) || finalVolMl <= 0) return { error: 'Final volume must be a positive number.' };
  if (stockConc < finalConc) return { error: 'Stock concentration cannot be less than final concentration.' };

  const stockVolMl = (finalConc * finalVolMl) / stockConc;
  const mediaVolMl = finalVolMl - stockVolMl;
  const totalCells = finalConc * finalVolMl;

  return { stockVolMl, mediaVolMl, totalCells, finalVolMl };
}

/* ---------------------------------------------------------------------------
   4b. Seeding — plate master mix (formerly calculatePlateSeeding)
   --------------------------------------------------------------------------*/
export const PLATE_PRESETS = {
  '6-well':   { surfaceAreaCm2: 9.6,  mediaVolMl: 2 },
  '12-well':  { surfaceAreaCm2: 3.8,  mediaVolMl: 1 },
  '24-well':  { surfaceAreaCm2: 1.9,  mediaVolMl: 0.5 },
  '48-well':  { surfaceAreaCm2: 0.95, mediaVolMl: 0.25 },
  '96-well':  { surfaceAreaCm2: 0.32, mediaVolMl: 0.1 },
  '384-well': { surfaceAreaCm2: 0.08, mediaVolMl: 0.025 },
};

/* Plate master mix, parametrized by volume-per-well and target cells/mL
   (the way most people think about cell seeding day-to-day). */
export function computeSeedingPlate({ wellsToSeed, volPerWellMl, finalCellConc, stockConc }) {
  if (!Number.isFinite(wellsToSeed) || wellsToSeed <= 0) return { error: 'Number of wells must be a positive number.' };
  if (!Number.isFinite(volPerWellMl) || volPerWellMl <= 0) return { error: 'Volume per well must be a positive number.' };
  if (!Number.isFinite(finalCellConc) || finalCellConc <= 0) return { error: 'Target cell concentration must be a positive number.' };
  if (!Number.isFinite(stockConc) || stockConc <= 0) return { error: 'Stock concentration must be a positive number.' };
  if (stockConc < finalCellConc) {
    return { error: `Stock (${stockConc.toPrecision(3)} cells/mL) is below target (${finalCellConc.toPrecision(3)} cells/mL).` };
  }

  const numWellsOverhead = Math.ceil(wellsToSeed * 1.1);
  const totalVolMl            = volPerWellMl * wellsToSeed;
  const totalCellsNeeded      = finalCellConc * totalVolMl;
  const cellsPerWell          = finalCellConc * volPerWellMl;
  const masterMixTotalVolMl   = volPerWellMl * numWellsOverhead;
  const masterMixTotalCells   = finalCellConc * masterMixTotalVolMl;
  const stockVolForMmMl       = masterMixTotalCells / stockConc;
  const mediaVolForMmMl       = masterMixTotalVolMl - stockVolForMmMl;

  return {
    totalCellsNeeded, cellsPerWell, finalCellConc,
    numWellsOverhead, wellsToSeed,
    masterMixTotalVolMl, volPerWellMl,
    stockVolForMmMl, mediaVolForMmMl,
  };
}

/* ---------------------------------------------------------------------------
   5. Serial Dosing — with the v1 bug fixed (no more {error}×1000→NaN).
   --------------------------------------------------------------------------*/
export function computeSerialDose({
  stockVal, stockUnit,
  finalMassVal, finalMassUnit,
  finalVolVal, finalVolUnit,
  minPipetteUl, interVolUl,
}) {
  // Stock → base mg/mL
  const stockConcMap = { 'mg/mL': 1, 'µg/mL': 1e-3, 'g/L': 1, 'ng/mL': 1e-6, 'µg/µL': 1 };
  const cStock = parseToBase(stockVal, stockUnit, stockConcMap, 'stock concentration');
  if (cStock.error) return cStock;
  if (cStock <= 0) return { error: 'Stock concentration must be greater than zero.' };

  // Final mass — parse to grams FIRST, validate, THEN convert to mg
  const finalMassG = parseToBase(finalMassVal, finalMassUnit, massToBase, 'final mass');
  if (finalMassG.error) return finalMassG;
  const finalMassMg = finalMassG * 1000;

  // Final volume — parse directly to µL
  const finalVolUl = parseToBase(finalVolVal, finalVolUnit, { 'mL': 1000, 'µL': 1 }, 'final volume');
  if (finalVolUl.error) return finalVolUl;

  const minPip = parseNumber(minPipetteUl);
  if (minPip && minPip.error) return { error: 'Minimum pipetting volume must be a number.' };
  if (minPip <= 0) return { error: 'Minimum pipetting volume must be greater than zero.' };

  const interVol = parseNumber(interVolUl);
  if (interVol && interVol.error) return { error: 'Intermediate volume must be a number.' };
  if (interVol <= minPip) return { error: 'Intermediate volume must be larger than the minimum pipetting volume.' };

  const cTarget = finalMassMg / (finalVolUl / 1000); // mg/mL
  if (cStock < cTarget) return { error: 'Stock concentration cannot be less than the required final concentration.' };

  // Strategy 1: direct dilution
  const volFromStockUl = (cTarget / cStock) * finalVolUl;
  if (volFromStockUl >= minPip) {
    return {
      strategy: 'direct',
      cStockMgMl: cStock,
      cTargetMgMl: cTarget,
      stockVolUl: volFromStockUl,
      diluentVolUl: finalVolUl - volFromStockUl,
      finalVolUl, finalMassMg,
    };
  }

  // Strategy 2: serial dilution
  const steps = [];
  let currentStock = cStock;
  const maxDilutionFactor = interVol / minPip;
  let stepIx = 1;

  while (stepIx <= 10) {
    const cIntermediateNeeded = (cTarget * finalVolUl) / minPip;
    if (currentStock <= cIntermediateNeeded) {
      const v1Ul = (cTarget * finalVolUl) / currentStock;
      const diluentUl = finalVolUl - v1Ul;
      steps.push({
        kind: 'final',
        stepNumber: stepIx,
        fromStockMgMl: currentStock,
        takeStockUl: v1Ul,
        diluentUl,
        producesMgMl: cTarget,
      });
      return { strategy: 'serial', cStockMgMl: cStock, cTargetMgMl: cTarget, finalVolUl, finalMassMg, steps };
    }

    let factor = Math.min(maxDilutionFactor, Math.ceil(currentStock / cIntermediateNeeded));
    if (Math.abs(factor - 10) < 0.5) factor = 10;
    if (Math.abs(factor - 100) < 5)  factor = 100;

    const takeUl    = interVol / factor;
    const diluentUl = interVol - takeUl;
    const nextConc  = currentStock / factor;
    steps.push({
      kind: 'intermediate',
      stepNumber: stepIx,
      fromStockMgMl: currentStock,
      takeStockUl: takeUl,
      diluentUl,
      intermediateVolUl: interVol,
      producesMgMl: nextConc,
    });
    currentStock = nextConc;
    stepIx++;
  }
  return { error: 'Could not find a practical dilution protocol within 10 steps. Try raising the intermediate volume or lowering the minimum pipetting volume.' };
}
