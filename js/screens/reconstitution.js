/* ==========================================================================
   Reconstitution screen
   ========================================================================== */

import { createEl, formatNumber } from '../utils.js';
import {
  screenHeader, inputGroup, ctaButton, errorEl, resultEl,
  showError, hideError, showResult, hideResult,
} from '../ui.js';
import { computeReconstitution } from '../calculators.js';
import { addHistory } from '../storage.js';

const MASS_UNITS = ['g','mg','µg','ng','pg'];
const MOLAR_UNITS = ['M','mM','µM','nM','pM','fM'];
const MASSVOL_UNITS = ['g/L','g/mL','g/µL','mg/L','mg/mL','mg/µL','µg/L','µg/mL','µg/µL','ng/L','ng/mL','ng/µL','pg/L','pg/mL','pg/µL'];
const ACTIVITY_UNITS = ['U/mL','mU/mL','IU/mL','kIU/mL'];
const CONC_UNITS = [...MOLAR_UNITS, ...MASSVOL_UNITS, '% w/v', ...ACTIVITY_UNITS];

export function renderReconstitution(host) {
  host.innerHTML = '';
  host.appendChild(screenHeader({ eyebrow: 'Calculator', title: 'Reconstitution', avatar: '🧴' }));
  host.appendChild(createEl('p', {
    class: 'hint',
    text: 'Volume of solvent to reconstitute a lyophilized powder to a target concentration.',
    style: { marginBottom: '16px' },
  }));

  const mass = inputGroup({ label: 'Mass in vial', placeholder: 'e.g. 10', units: MASS_UNITS, defaultUnit: 'mg' });
  const conc = inputGroup({ label: 'Desired concentration', placeholder: 'e.g. 10', units: CONC_UNITS, defaultUnit: 'mM' });
  const mw   = inputGroup({ label: 'Molecular weight (g/mol)', placeholder: 'e.g. 180.16', units: null, hint: 'Only required for molar units.' });

  host.appendChild(mass.wrap);
  host.appendChild(conc.wrap);
  host.appendChild(mw.wrap);

  const err = errorEl();
  const res = resultEl();

  host.appendChild(ctaButton({ text: 'Calculate', onClick: () => {
    hideError(err); hideResult(res);
    const r = computeReconstitution({
      massVal: mass.input.value, massUnit: mass.select.value,
      concVal: conc.input.value, concUnit: conc.select.value,
      mw: mw.input.value,
    });
    if (r.error) { showError(err, r.error); return; }
    const mL = r.volL * 1000;
    const uL = r.volL * 1e6;
    showResult(res, `
      <div class="result-label">Add solvent</div>
      <div class="result-big">${formatNumber(mL)}<span class="u">mL</span></div>
      <div class="result-sub">(${formatNumber(uL)} µL · ${formatNumber(r.volL)} L)</div>
    `);
    addHistory({
      tool: 'reconstitution', toolLabel: 'Reconstitution',
      inputs: {
        massVal: mass.input.value, massUnit: mass.select.value,
        concVal: conc.input.value, concUnit: conc.select.value,
        mw: mw.input.value,
      },
      summary: `${mass.input.value} ${mass.select.value} → ${conc.input.value} ${conc.select.value} · ${formatNumber(mL)} mL solvent`,
    });
  }}));
  host.appendChild(err);
  host.appendChild(res);
}
