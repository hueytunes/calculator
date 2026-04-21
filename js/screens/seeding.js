/* ==========================================================================
   Seeding screen — merged Cell Seeding + Plate Seeding with a mode toggle.
   Uses the cell-count compound input (mantissa × 10ⁿ) for cell numbers.
   ========================================================================== */

import { createEl, formatNumber } from '../utils.js';
import {
  screenHeader, inputGroup, selectGroup, cellCountInput, modeToggle,
  ctaButton, errorEl, resultEl,
  showError, hideError, showResult, hideResult,
} from '../ui.js';
import { computeSeedingSingle, computeSeedingPlate, PLATE_PRESETS } from '../calculators.js';
import { addHistory } from '../storage.js';

export function renderSeeding(host) {
  host.innerHTML = '';
  host.appendChild(screenHeader({ eyebrow: 'Calculator', title: 'Seeding', avatar: '🦠' }));

  const toggle = modeToggle({
    options: [
      { value: 'single', label: 'Single suspension' },
      { value: 'plate',  label: 'Plate master mix' },
    ],
    value: 'single',
    onChange: () => swap(),
  });
  host.appendChild(toggle);

  const body = createEl('div');
  host.appendChild(body);

  function swap() {
    const mode = toggle.dataset.value;
    body.innerHTML = '';
    if (mode === 'single') renderSingle(body);
    else renderPlate(body);
  }
  swap();
}

function renderSingle(host) {
  host.appendChild(createEl('p', {
    class: 'hint',
    text: 'Dilute a cell stock to a target concentration in a given volume.',
    style: { marginBottom: '16px' },
  }));

  const stock  = cellCountInput({ label: 'Stock cell concentration', value: 2,   exponent: 6 });
  const final_ = cellCountInput({ label: 'Desired final concentration', value: 2.5, exponent: 5 });
  const vol    = inputGroup({ label: 'Final volume (mL)', placeholder: 'e.g. 10', units: null });

  host.appendChild(stock.wrap);
  host.appendChild(final_.wrap);
  host.appendChild(vol.wrap);

  const err = errorEl();
  const res = resultEl();

  host.appendChild(ctaButton({ text: 'Calculate', onClick: () => {
    hideError(err); hideResult(res);
    const sc = stock.readValue();
    const fc = final_.readValue();
    const fv = parseFloat(vol.input.value);
    if (sc == null || !Number.isFinite(sc)) { showError(err, 'Enter a stock cell concentration.'); return; }
    if (fc == null || !Number.isFinite(fc)) { showError(err, 'Enter a final cell concentration.'); return; }
    if (!Number.isFinite(fv))              { showError(err, 'Enter a final volume in mL.'); return; }
    const r = computeSeedingSingle({ stockConc: sc, finalConc: fc, finalVolMl: fv });
    if (r.error) { showError(err, r.error); return; }
    showResult(res, `
      <div class="result-label">Take from stock</div>
      <div class="result-big">${formatNumber(r.stockVolMl)}<span class="u">mL</span></div>
      <div class="result-sub">
        (${formatNumber(r.stockVolMl * 1000)} µL)<br/>
        <strong>Add ${formatNumber(r.mediaVolMl)} mL</strong> of fresh media to reach ${formatNumber(r.finalVolMl)} mL.<br/>
        <span style="opacity:0.75;font-size:12px">Total cells: ${formatNumber(r.totalCells)}</span>
      </div>
    `);
    addHistory({
      tool: 'seeding-single', toolLabel: 'Seeding · single',
      inputs: { stock: sc, final: fc, volMl: fv },
      summary: `${formatNumber(sc)} → ${formatNumber(fc)} cells/mL · ${fv} mL`,
    });
  }}));
  host.appendChild(err);
  host.appendChild(res);
}

function renderPlate(host) {
  host.appendChild(createEl('p', {
    class: 'hint',
    text: 'Master mix for seeding multiple wells at a target cell concentration. Includes 10% overhead.',
    style: { marginBottom: '16px' },
  }));

  // Plate-type is a convenience: picking a plate auto-fills the volume-per-well.
  // User can still edit volume-per-well freely.
  const plateDefaults = {
    '6-well':   { volMl: 2 },
    '12-well':  { volMl: 1 },
    '24-well':  { volMl: 0.5 },
    '48-well':  { volMl: 0.25 },
    '96-well':  { volMl: 0.1 },
    '384-well': { volMl: 0.025 },
    'custom':   { volMl: null },
  };
  const plateOpts = [
    { value: '6-well',   label: '6-well (2 mL / well)' },
    { value: '12-well',  label: '12-well (1 mL / well)' },
    { value: '24-well',  label: '24-well (0.5 mL / well)' },
    { value: '48-well',  label: '48-well (0.25 mL / well)' },
    { value: '96-well',  label: '96-well (0.1 mL / well)' },
    { value: '384-well', label: '384-well (0.025 mL / well)' },
    { value: 'custom',   label: 'Custom…' },
  ];
  const plateSel = selectGroup({ label: 'Plate type', options: plateOpts, value: '6-well' });
  const wells    = inputGroup({ label: 'Wells to seed', placeholder: 'e.g. 6', units: null });

  const volPerWell = inputGroup({
    label: 'Volume per well',
    value: plateDefaults['6-well'].volMl,
    units: ['mL', 'µL'],
    defaultUnit: 'mL',
  });

  // Auto-fill volume per well when plate type changes (unless "custom")
  plateSel.select.addEventListener('change', () => {
    const p = plateDefaults[plateSel.select.value];
    if (p && p.volMl != null) {
      volPerWell.input.value = p.volMl;
      volPerWell.select.value = 'mL';
    }
  });

  const finalConc = cellCountInput({ label: 'Target cell concentration', value: 1, exponent: 6 });
  const stock     = cellCountInput({ label: 'Stock cell concentration',  value: 1, exponent: 7 });

  host.appendChild(plateSel.wrap);
  host.appendChild(wells.wrap);
  host.appendChild(volPerWell.wrap);
  host.appendChild(finalConc.wrap);
  host.appendChild(stock.wrap);

  const err = errorEl();
  const res = resultEl();

  host.appendChild(ctaButton({ text: 'Calculate', onClick: () => {
    hideError(err); hideResult(res);
    const volPerWellMl = volPerWell.select.value === 'µL'
      ? parseFloat(volPerWell.input.value) / 1000
      : parseFloat(volPerWell.input.value);
    const r = computeSeedingPlate({
      wellsToSeed: parseFloat(wells.input.value),
      volPerWellMl,
      finalCellConc: finalConc.readValue(),
      stockConc: stock.readValue(),
    });
    if (r.error) { showError(err, r.error); return; }

    const stockDisplayUl = r.stockVolForMmMl * 1000;
    const mediaDisplay = r.mediaVolForMmMl >= 1
      ? `${formatNumber(r.mediaVolForMmMl)} mL`
      : `${formatNumber(r.mediaVolForMmMl * 1000)} µL`;
    const perWellDisplay = r.volPerWellMl >= 1
      ? `${formatNumber(r.volPerWellMl)} mL`
      : `${formatNumber(r.volPerWellMl * 1000)} µL`;

    showResult(res, `
      <div class="result-label">Master mix</div>
      <div class="result-big">${formatNumber(stockDisplayUl)}<span class="u">µL</span></div>
      <div class="result-sub">
        of stock + <strong>${mediaDisplay}</strong> media
        = ${formatNumber(r.masterMixTotalVolMl)} mL total (${r.numWellsOverhead} wells-worth, 10% overhead).<br/>
        Gently mix, then pipette <strong>${perWellDisplay}</strong> into each of the ${r.wellsToSeed} wells.<br/>
        <span style="opacity:0.75;font-size:12px">Cells per well: ${formatNumber(r.cellsPerWell)} · Total cells needed: ${formatNumber(r.totalCellsNeeded)}</span>
      </div>
    `);
    addHistory({
      tool: 'seeding-plate', toolLabel: 'Seeding · plate',
      inputs: {
        plateType: plateSel.select.value,
        wells: parseFloat(wells.input.value),
        volPerWellMl,
        finalCellConc: finalConc.readValue(),
        stockConc: stock.readValue(),
      },
      summary: `${plateSel.select.value} · ${wells.input.value} wells · ${formatNumber(finalConc.readValue())} cells/mL`,
    });
  }}));
  host.appendChild(err);
  host.appendChild(res);
}
