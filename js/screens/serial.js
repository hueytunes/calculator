/* ==========================================================================
   Serial Dosing screen — with the v1 error-swallowing bug fixed.
   ========================================================================== */

import { createEl, formatNumber } from '../utils.js';
import {
  screenHeader, inputGroup, ctaButton, errorEl, resultEl,
  showError, hideError, showResult, hideResult,
} from '../ui.js';
import { computeSerialDose } from '../calculators.js';
import { addHistory } from '../storage.js';

const STOCK_UNITS = ['ng/mL', 'µg/mL', 'mg/mL', 'g/L', 'µg/µL'];
const MASS_UNITS  = ['ng','µg','mg','g'];
const VOL_UNITS   = ['µL','mL'];

export function renderSerial(host) {
  host.innerHTML = '';
  host.appendChild(screenHeader({ eyebrow: 'Calculator', title: 'Serial Dosing', avatar: '💉' }));
  host.appendChild(createEl('p', {
    class: 'hint',
    text: 'Plan a direct or step-down dilution to dose a specific mass of a drug.',
    style: { marginBottom: '16px' },
  }));

  const stock = inputGroup({ label: 'Original stock concentration', placeholder: 'e.g. 50', units: STOCK_UNITS, defaultUnit: 'mg/mL' });
  const mass  = inputGroup({ label: 'Desired final mass',           placeholder: 'e.g. 25', units: MASS_UNITS,  defaultUnit: 'mg' });
  const vol   = inputGroup({ label: 'Desired final volume',         placeholder: 'e.g. 5',  units: VOL_UNITS,   defaultUnit: 'mL' });
  const minP  = inputGroup({ label: 'Min. pipetting volume (µL)',   placeholder: 'e.g. 2',  units: null });
  const inter = inputGroup({ label: 'Intermediate dilution vol. (µL)', placeholder: 'e.g. 100', units: null });

  minP.input.value = '2';
  inter.input.value = '100';

  host.appendChild(stock.wrap);
  host.appendChild(mass.wrap);
  host.appendChild(vol.wrap);
  host.appendChild(minP.wrap);
  host.appendChild(inter.wrap);

  const err = errorEl();
  const res = resultEl();

  host.appendChild(ctaButton({ text: 'Calculate', onClick: () => {
    hideError(err); hideResult(res);
    const r = computeSerialDose({
      stockVal: stock.input.value, stockUnit: stock.select.value,
      finalMassVal: mass.input.value, finalMassUnit: mass.select.value,
      finalVolVal: vol.input.value, finalVolUnit: vol.select.value,
      minPipetteUl: minP.input.value,
      interVolUl: inter.input.value,
    });
    if (r.error) { showError(err, r.error); return; }

    if (r.strategy === 'direct') {
      showResult(res, `
        <div class="result-label">Direct dilution</div>
        <div class="result-big">${formatNumber(r.stockVolUl)}<span class="u">µL</span></div>
        <div class="result-sub">
          of your <strong>${formatNumber(r.cStockMgMl)} mg/mL</strong> stock
          + <strong>${formatNumber(r.diluentVolUl)} µL</strong> diluent.<br/>
          Final: ${formatNumber(r.finalVolUl)} µL containing <strong>${mass.input.value} ${mass.select.value}</strong>.
        </div>
      `);
    } else {
      // Serial dilution
      let stepsHtml = '';
      for (const s of r.steps) {
        if (s.kind === 'intermediate') {
          stepsHtml += `
            <div style="padding:10px 0;border-bottom:1px dashed rgba(255,255,255,0.2)">
              <strong>Step ${s.stepNumber}:</strong> Take <strong>${formatNumber(s.takeStockUl)} µL</strong> of
              ${formatNumber(s.fromStockMgMl)} mg/mL stock, add <strong>${formatNumber(s.diluentUl)} µL</strong> diluent.
              → ${formatNumber(s.producesMgMl)} mg/mL intermediate.
            </div>`;
        } else {
          stepsHtml += `
            <div style="padding:10px 0">
              <strong>Step ${s.stepNumber}:</strong> Take <strong>${formatNumber(s.takeStockUl)} µL</strong> of
              ${formatNumber(s.fromStockMgMl)} mg/mL, add <strong>${formatNumber(s.diluentUl)} µL</strong> diluent.
              → final dose of ${mass.input.value} ${mass.select.value} in ${formatNumber(r.finalVolUl)} µL.
            </div>`;
        }
      }
      showResult(res, `
        <div class="result-label">Serial dilution</div>
        <div class="result-sub" style="margin-top:4px">Direct dilution would require less than ${minP.input.value} µL — stepping down:</div>
        ${stepsHtml}
      `);
    }
    addHistory({
      tool: 'serial', toolLabel: 'Serial Dosing',
      inputs: {
        stockVal: stock.input.value, stockUnit: stock.select.value,
        massVal: mass.input.value, massUnit: mass.select.value,
        volVal: vol.input.value, volUnit: vol.select.value,
      },
      summary: `${stock.input.value} ${stock.select.value} → ${mass.input.value} ${mass.select.value} in ${vol.input.value} ${vol.select.value}`,
    });
  }}));
  host.appendChild(err);
  host.appendChild(res);
}
