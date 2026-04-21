/* ==========================================================================
   Concentration screen — merged Molarity + Mass/Vol/Conc.
   "Solve for" selector: mass | volume | concentration.
   MW becomes required when a molar unit is chosen.
   ========================================================================== */

import { createEl, formatNumber, volumeInUnit, massInUnit } from '../utils.js';
import {
  screenHeader, inputGroup, selectGroup, ctaButton, errorEl, resultEl,
  showError, hideError, showResult, hideResult,
} from '../ui.js';
import { computeConcentration } from '../calculators.js';
import { molarToBase } from '../utils.js';
import { addHistory } from '../storage.js';

const MASS_UNITS    = ['g','mg','µg','ng','pg'];
const VOL_UNITS     = ['L','mL','µL','nL'];
const MOLAR_UNITS   = ['M','mM','µM','nM','pM','fM'];
const MASSVOL_UNITS = ['g/L','g/mL','g/µL','mg/L','mg/mL','mg/µL','µg/L','µg/mL','µg/µL','ng/L','ng/mL','ng/µL','pg/L','pg/mL','pg/µL'];
const CONC_UNITS    = [...MOLAR_UNITS, ...MASSVOL_UNITS, '% w/v'];

export function renderConcentration(host) {
  host.innerHTML = '';
  host.appendChild(screenHeader({ eyebrow: 'Calculator', title: 'Concentration', avatar: '⚖️' }));
  host.appendChild(createEl('p', {
    class: 'hint',
    text: 'Solve for mass, volume, or concentration given the other two. MW required for molar units.',
    style: { marginBottom: '16px' },
  }));

  const solveFor = selectGroup({
    label: 'Solve for',
    options: [
      { value: 'mass', label: 'Mass' },
      { value: 'volume', label: 'Volume' },
      { value: 'concentration', label: 'Concentration' },
    ],
    value: 'mass',
  });
  host.appendChild(solveFor.wrap);

  const mw = inputGroup({ label: 'Molecular weight (g/mol)', placeholder: 'e.g. 180.16', units: null, hint: 'Only required for molar units.' });
  host.appendChild(mw.wrap);

  const mass  = inputGroup({ label: 'Mass',          placeholder: 'e.g. 10',  units: MASS_UNITS,    defaultUnit: 'mg' });
  const vol   = inputGroup({ label: 'Volume',        placeholder: 'e.g. 100', units: VOL_UNITS,     defaultUnit: 'mL' });
  const conc  = inputGroup({ label: 'Concentration', placeholder: 'e.g. 10',  units: CONC_UNITS,    defaultUnit: 'mM' });

  host.appendChild(mass.wrap);
  host.appendChild(vol.wrap);
  host.appendChild(conc.wrap);

  function updateVisibility() {
    const sf = solveFor.select.value;
    mass.wrap.classList.toggle('hidden', sf === 'mass');
    vol.wrap.classList.toggle('hidden',  sf === 'volume');
    conc.wrap.classList.toggle('hidden', sf === 'concentration');
  }
  solveFor.select.addEventListener('change', updateVisibility);
  updateVisibility();

  const err = errorEl();
  const res = resultEl();

  host.appendChild(ctaButton({ text: 'Calculate', onClick: () => {
    hideError(err); hideResult(res);
    const r = computeConcentration({
      solveFor: solveFor.select.value,
      mw: mw.input.value,
      massVal: mass.input.value, massUnit: mass.select.value,
      volVal:  vol.input.value,  volUnit:  vol.select.value,
      concVal: conc.input.value, concUnit: conc.select.value,
    });
    if (r.error) { showError(err, r.error); return; }

    let html = '';
    if (r.solved === 'mass') {
      const mg = r.massG * 1000;
      html = `<div class="result-label">Mass</div>
              <div class="result-big">${formatNumber(mg)}<span class="u">mg</span></div>
              <div class="result-sub">(${formatNumber(r.massG)} g · ${formatNumber(r.massG * 1e6)} µg)</div>`;
    } else if (r.solved === 'volume') {
      const mL = r.volL * 1000;
      html = `<div class="result-label">Volume</div>
              <div class="result-big">${formatNumber(mL)}<span class="u">mL</span></div>
              <div class="result-sub">(${formatNumber(r.volL * 1e6)} µL · ${formatNumber(r.volL)} L)</div>`;
    } else if (r.solved === 'concentration') {
      if (r.outType === 'molar') {
        const factor = molarToBase[r.outUnit];
        const val = r.valueBase / factor;
        html = `<div class="result-label">Concentration</div>
                <div class="result-big">${formatNumber(val)}<span class="u">${r.outUnit}</span></div>
                <div class="result-sub">(${formatNumber(r.valueBase)} M)</div>`;
      } else {
        // massvol or percent-wv — valueBase in mg/mL
        html = `<div class="result-label">Concentration</div>
                <div class="result-big">${formatNumber(r.valueBase)}<span class="u">mg/mL</span></div>
                <div class="result-sub">(${formatNumber(r.valueBase)} g/L · ${formatNumber(r.valueBase * 1000)} µg/mL)</div>`;
      }
    }
    showResult(res, html);
    addHistory({
      tool: 'concentration', toolLabel: 'Concentration',
      inputs: {
        solveFor: solveFor.select.value, mw: mw.input.value,
        massVal: mass.input.value, massUnit: mass.select.value,
        volVal: vol.input.value,   volUnit: vol.select.value,
        concVal: conc.input.value, concUnit: conc.select.value,
      },
      summary: `Solve ${solveFor.select.value}`,
    });
  }}));

  host.appendChild(err);
  host.appendChild(res);
}
