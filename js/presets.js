/* ==========================================================================
   presets.js — built-in recipe templates.
   Each preset matches the Recipe data shape in recipe.js.
   Add more by dropping an object into PRESETS. No other changes needed.
   ========================================================================== */

export const PRESETS = [
  {
    id: 'preset-primer-mix',
    name: 'Primer Mix',
    icon: '🧬',
    finalVolume: { value: 100, unit: 'µL' },
    diluent: 'Water',
    customDiluent: '',
    isPreset: true,
    presetId: 'primer-mix',
    ingredients: [
      {
        id: 'ing-primer-fwd',
        name: 'Forward primer',
        source: 'liquid-stock',
        sourceInputs: { stockValue: 100, stockUnit: 'µM' },
        targetInputs: { value: 10, unit: 'µM' },
        mw: '',
      },
      {
        id: 'ing-primer-rev',
        name: 'Reverse primer',
        source: 'liquid-stock',
        sourceInputs: { stockValue: 100, stockUnit: 'µM' },
        targetInputs: { value: 10, unit: 'µM' },
        mw: '',
      },
    ],
  },

  {
    id: 'preset-facs-buffer',
    name: 'FACS Buffer',
    icon: '🫧',
    finalVolume: { value: 50, unit: 'mL' },
    diluent: 'PBS',
    customDiluent: '',
    isPreset: true,
    presetId: 'facs-buffer',
    ingredients: [
      {
        id: 'ing-facs-edta',
        name: 'EDTA',
        source: 'liquid-stock',
        sourceInputs: { stockValue: 1, stockUnit: 'M' },
        targetInputs: { value: 25, unit: 'mM' },
        mw: '',
      },
      {
        id: 'ing-facs-bsa',
        name: 'BSA',
        source: 'powder-mass',
        sourceInputs: {},
        targetInputs: { value: 0.02, unit: '% w/v' },
        mw: '',
      },
    ],
  },

  {
    id: 'preset-macs-buffer',
    name: 'MACS Buffer',
    icon: '🧲',
    finalVolume: { value: 500, unit: 'mL' },
    diluent: 'PBS',
    customDiluent: '',
    isPreset: true,
    presetId: 'macs-buffer',
    ingredients: [
      {
        id: 'ing-macs-bsa',
        name: 'BSA',
        source: 'powder-mass',
        sourceInputs: {},
        targetInputs: { value: 0.5, unit: '% w/v' },
        mw: '',
      },
      {
        id: 'ing-macs-edta',
        name: 'EDTA',
        source: 'liquid-stock',
        sourceInputs: { stockValue: 0.5, stockUnit: 'M' },
        targetInputs: { value: 2, unit: 'mM' },
        mw: '',
      },
    ],
  },

  {
    id: 'preset-ripa',
    name: 'RIPA Lysis Buffer',
    icon: '🧪',
    finalVolume: { value: 10, unit: 'mL' },
    diluent: 'Water',
    customDiluent: '',
    isPreset: true,
    presetId: 'ripa',
    ingredients: [
      { id: 'ing-ripa-tris', name: 'Tris-HCl pH 8.0', source: 'liquid-stock', sourceInputs: { stockValue: 1, stockUnit: 'M' }, targetInputs: { value: 50, unit: 'mM' }, mw: '' },
      { id: 'ing-ripa-nacl', name: 'NaCl',             source: 'liquid-stock', sourceInputs: { stockValue: 5, stockUnit: 'M' }, targetInputs: { value: 150, unit: 'mM' }, mw: '' },
      { id: 'ing-ripa-np40', name: 'NP-40 (IGEPAL)',   source: 'pure-liquid-density', sourceInputs: { density: 0.98 }, targetInputs: { value: 1, unit: '% v/v' }, mw: '' },
      { id: 'ing-ripa-doc',  name: 'Na deoxycholate',  source: 'powder-mass', sourceInputs: {}, targetInputs: { value: 0.5, unit: '% w/v' }, mw: '' },
      { id: 'ing-ripa-sds',  name: 'SDS',              source: 'powder-mass', sourceInputs: {}, targetInputs: { value: 0.1, unit: '% w/v' }, mw: '' },
    ],
  },

  {
    id: 'preset-laemmli-4x',
    name: 'Laemmli (4×) Loading Dye',
    icon: '🟦',
    finalVolume: { value: 5, unit: 'mL' },
    diluent: 'Water',
    customDiluent: '',
    isPreset: true,
    presetId: 'laemmli-4x',
    ingredients: [
      { id: 'ing-lae-tris',   name: 'Tris-HCl pH 6.8',  source: 'liquid-stock', sourceInputs: { stockValue: 1, stockUnit: 'M' }, targetInputs: { value: 250, unit: 'mM' }, mw: '' },
      { id: 'ing-lae-gly',    name: 'Glycerol',         source: 'pure-liquid-density', sourceInputs: { density: 1.26 }, targetInputs: { value: 40, unit: '% v/v' }, mw: '' },
      { id: 'ing-lae-sds',    name: 'SDS',              source: 'powder-mass', sourceInputs: {}, targetInputs: { value: 8, unit: '% w/v' }, mw: '' },
      { id: 'ing-lae-bpb',    name: 'Bromophenol blue', source: 'powder-mass', sourceInputs: {}, targetInputs: { value: 0.04, unit: '% w/v' }, mw: '' },
    ],
  },
];

export function getPreset(id) {
  return PRESETS.find(p => p.id === id || p.presetId === id) || null;
}
