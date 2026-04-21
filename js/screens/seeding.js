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
    text: 'Calculate a master mix for seeding multiple wells at a desired density. Includes 10% overhead.',
    style: { marginBottom: '16px' },
  }));

  const plateOpts = [
    { value: '6-well', label: '6-well (9.6 cm²)' },
    { value: '12-well', label: '12-well (3.8 cm²)' },
    { value: '24-well', label: '24-well (1.9 cm²)' },
    { value: '48-well', label: '48-well (0.95 cm²)' },
    { value: '96-well', label: '96-well (0.32 cm²)' },
    { value: '384-well', label: '384-well (0.08 cm²)' },
    { value: 'custom', label: 'Custom…' },
  ];
  const plateSel = selectGroup({ label: 'Plate type', options: plateOpts, value: '96-well' });
  const wells    = inputGroup({ label: 'Wells to seed', placeholder: 'e.g. 12', units: null });
  const density  = cellCountInput({ label: 'Seeding density', value: 5, exponent: 3, unitLabel: 'cells/cm²' });
  const stock    = cellCountInput({ label: 'Stock cell concentration', value: 1.5, exponent: 6 });

  host.appendChild(plateSel.wrap);
  host.appendChild(wells.wrap);
  host.appendChild(density.wrap);
  host.appendChild(stock.wrap);

  const customArea = inputGroup({ label: 'Custom surface area (cm²)', placeholder: 'e.g. 0.32', units: null });
  const customMed  = inputGroup({ label: 'Custom media vol per well (µL)', placeholder: 'e.g. 100', units: null });
  customArea.wrap.classList.add('hidden');
  customMed.wrap.classList.add('hidden');
  host.appendChild(customArea.wrap);
  host.appendChild(customMed.wrap);

  plateSel.select.addEventListener('change', () => {
    const isCustom = plateSel.select.value === 'custom';
    customArea.wrap.classList.toggle('hidden', !isCustom);
    customMed.wrap.classList.toggle('hidden', !isCustom);
  });

  const err = errorEl();
  const res = resultEl();

  host.appendChild(ctaButton({ text: 'Calculate', onClick: () => {
    hideError(err); hideResult(res);
    const r = computeSeedingPlate({
      plateType: plateSel.select.value,
      wellsToSeed: parseFloat(wells.input.value),
      seedingDensity: density.readValue(),
      stockConc: stock.readValue(),
      customSurfaceAreaCm2: parseFloat(customArea.input.value),
      customMediaVolMl: parseFloat(customMed.input.value) / 1000,
    });
    if (r.error) { showError(err, r.error); return; }

    showResult(res, `
      <div class="result-label">Master mix</div>
      <div class="result-big">${formatNumber(r.stockVolForMmMl * 1000)}<span class="u">µL</span></div>
      <div class="result-sub">
        of stock + <strong>${formatNumber(r.mediaVolForMmMl)} mL</strong> media
        = ${formatNumber(r.masterMixTotalVolMl)} mL total (${r.numWellsOverhead} wells-worth, 10% overhead).<br/>
        Gently mix, then pipette <strong>${formatNumber(r.mediaVolPerWellMl * 1000)} µL</strong> into each of the ${r.wellsToSeed} wells.<br/>
        <span style="opacity:0.75;font-size:12px">Total cells needed: ${formatNumber(r.totalCellsNeeded)} · Final: ${formatNumber(r.finalCellConc)} cells/mL</span>
      </div>
    `);
    addHistory({
      tool: 'seeding-plate', toolLabel: 'Seeding · plate',
      inputs: { plateType: plateSel.select.value, wells: parseFloat(wells.input.value), density: density.readValue(), stock: stock.readValue() },
      summary: `${plateSel.select.value} · ${wells.input.value} wells · ${formatNumber(density.readValue())} cells/cm²`,
    });
  }}));
  host.appendChild(err);
  host.appendChild(res);
}
