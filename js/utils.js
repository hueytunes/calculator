/* ==========================================================================
   utils.js — unit tables, parsers, formatters
   ========================================================================== */

/* ---------------------------------------------------------------------------
   Base-unit conversion maps
   Each value is the factor to multiply by to reach the base unit.
   Bases: volume→L, mass→g, molar→M, mass/vol→mg/mL, activity→IU/mL
   --------------------------------------------------------------------------*/

export const volumeToBase = {
  'L':  1,
  'mL': 1e-3,
  'µL': 1e-6,
  'nL': 1e-9,
  'pL': 1e-12,
};

export const massToBase = {
  'g':  1,
  'mg': 1e-3,
  'µg': 1e-6,
  'ng': 1e-9,
  'pg': 1e-12,
};

export const molarToBase = {
  'M':  1,
  'mM': 1e-3,
  'µM': 1e-6,
  'nM': 1e-9,
  'pM': 1e-12,
  'fM': 1e-15,
};

/* Mass/Volume concentrations. Base = mg/mL.
   1 g/L = 1 mg/mL. Works out numerically. */
export const massPerVolToBase = {
  'g/L':   1,
  'g/mL':  1000,
  'g/µL':  1e6,
  'mg/L':  1e-3,
  'mg/mL': 1,
  'mg/µL': 1000,
  'µg/L':  1e-6,
  'µg/mL': 1e-3,
  'µg/µL': 1,
  'ng/L':  1e-9,
  'ng/mL': 1e-6,
  'ng/µL': 1e-3,
  'pg/L':  1e-12,
  'pg/mL': 1e-9,
  'pg/µL': 1e-6,
};

export const activityToBase = {
  'U/mL':   1e-3,
  'mU/mL':  1e-6,
  'IU/mL':  1,
  'kIU/mL': 1000,
};

/* Percentages. All convert to mg/mL on mass/vol basis (where applicable). */
export const percentToBase = {
  /* % w/v — grams solute per 100 mL solvent.  1% w/v = 10 mg/mL. */
  '% w/v': 10,
  /* % v/v — mL solute per 100 mL total. Target vol * percent / 100 = mL to add.
     Tracked as its own category; handled specially in recipe compute. */
  '% v/v': 1,
  /* % w/w — similar to w/v but mass basis. For dilute aqueous, ≈ % w/v. */
  '% w/w': 10,
};

/* X-factor: stock strength relative to 1×. */
export const factorToBase = {
  '1×':   1,
  '10×':  10,
  '100×': 100,
  '1000×':1000,
};

/* ---------------------------------------------------------------------------
   DOM helpers
   --------------------------------------------------------------------------*/
export const getEl = (id) => document.getElementById(id);
export const querySelAll = (sel) => document.querySelectorAll(sel);

export function createEl(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in props) {
    if (k === 'class' || k === 'className') el.className = props[k];
    else if (k === 'text') el.textContent = props[k];
    else if (k === 'html') el.innerHTML = props[k];
    else if (k.startsWith('on') && typeof props[k] === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), props[k]);
    } else if (k === 'style' && typeof props[k] === 'object') {
      Object.assign(el.style, props[k]);
    } else if (k === 'dataset' && typeof props[k] === 'object') {
      Object.assign(el.dataset, props[k]);
    } else el.setAttribute(k, props[k]);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/* ---------------------------------------------------------------------------
   Number parsing — simplified, plain parseFloat.
   Accepts decimals and native scientific notation (1e6). Rejects
   fuzzy suffixes (25k, 2.5 million, x10^).
   --------------------------------------------------------------------------*/
export function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return { error: 'Please enter a number.' };
  }
  const s = String(value).trim();
  if (s === '') return { error: 'Please enter a number.' };

  const n = parseFloat(s);
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return { error: `"${value}" is not a valid number.` };
  }
  // Reject strings with trailing non-numeric junk (e.g., "25k")
  // parseFloat("25k") returns 25 silently; we want to catch that.
  if (!/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) {
    return { error: `"${value}" contains invalid characters. Use plain numbers like 0.5 or 1e6.` };
  }
  return n;
}

/* ---------------------------------------------------------------------------
   Unit parsers — use parseNumber then apply a conversion factor from a map.
   Returns: number (in base units) OR { error: string }.
   --------------------------------------------------------------------------*/
export function parseToBase(value, unit, conversionMap, typeName = 'value') {
  const n = parseNumber(value);
  if (n && n.error) return n;
  if (n < 0) return { error: `${typeName} must not be negative.` };
  const factor = conversionMap[unit];
  if (factor === undefined) return { error: `Unsupported ${typeName} unit: ${unit}.` };
  return n * factor;
}

/* Parse a concentration whose unit could come from any family.
   Returns { type, value } or { error }. Type is one of:
   'molar' (base M), 'massvol' (base mg/mL), 'percent-wv', 'percent-vv',
   'percent-ww', 'activity' (base IU/mL), 'factor'. */
export function parseConcentration(value, unit) {
  const n = parseNumber(value);
  if (n && n.error) return n;
  if (n < 0) return { error: 'Concentration must not be negative.' };

  if (molarToBase[unit] !== undefined) {
    return { type: 'molar', value: n * molarToBase[unit], unit };
  }
  if (massPerVolToBase[unit] !== undefined) {
    return { type: 'massvol', value: n * massPerVolToBase[unit], unit };
  }
  if (unit === '% w/v') return { type: 'percent-wv', value: n * percentToBase['% w/v'], unit };
  if (unit === '% v/v') return { type: 'percent-vv', value: n, unit };
  if (unit === '% w/w') return { type: 'percent-ww', value: n * percentToBase['% w/w'], unit };
  if (activityToBase[unit] !== undefined) {
    return { type: 'activity', value: n * activityToBase[unit], unit };
  }
  if (factorToBase[unit] !== undefined) {
    return { type: 'factor', value: n * factorToBase[unit], unit };
  }
  return { error: `Unsupported concentration unit: ${unit}.` };
}

/* ---------------------------------------------------------------------------
   Formatters
   --------------------------------------------------------------------------*/
export function formatNumber(num) {
  if (num === 0) return '0';
  if (num == null || !Number.isFinite(num)) return '—';
  const abs = Math.abs(num);

  // Very small: scientific
  if (abs > 0 && abs < 1e-3) return num.toPrecision(3);
  // Very large: scientific
  if (abs >= 1e9) return num.toPrecision(4);
  // Normal range: up to 4 fraction digits with locale separators
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/* Pick a human-friendly volume unit for a value given in liters.
   Returns { value: <display number>, unit: <string> } */
export function bestVolumeUnit(liters) {
  if (liters == null || !Number.isFinite(liters)) return { value: 0, unit: 'mL' };
  const abs = Math.abs(liters);
  if (abs >= 1) return { value: liters, unit: 'L' };
  if (abs >= 1e-3) return { value: liters * 1e3, unit: 'mL' };
  if (abs >= 1e-6) return { value: liters * 1e6, unit: 'µL' };
  if (abs >= 1e-9) return { value: liters * 1e9, unit: 'nL' };
  return { value: liters * 1e12, unit: 'pL' };
}

export function bestMassUnit(grams) {
  if (grams == null || !Number.isFinite(grams)) return { value: 0, unit: 'mg' };
  const abs = Math.abs(grams);
  if (abs >= 1) return { value: grams, unit: 'g' };
  if (abs >= 1e-3) return { value: grams * 1e3, unit: 'mg' };
  if (abs >= 1e-6) return { value: grams * 1e6, unit: 'µg' };
  if (abs >= 1e-9) return { value: grams * 1e9, unit: 'ng' };
  return { value: grams * 1e12, unit: 'pg' };
}

/* Convert a volume from liters to a specific display unit. */
export function volumeInUnit(liters, unit) {
  const factor = volumeToBase[unit];
  if (factor === undefined) return liters;
  return liters / factor;
}

/* Convert a mass from grams to a specific display unit. */
export function massInUnit(grams, unit) {
  const factor = massToBase[unit];
  if (factor === undefined) return grams;
  return grams / factor;
}
