/* ==========================================================================
   Dilution screen — C1V1 = C2V2
   ========================================================================== */

import { createEl, formatNumber, volumeInUnit } from '../utils.js';
import {
  screenHeader, inputGroup, ctaButton, errorEl, resultEl,
  showError, hideError, showResult, hideResult,
} from '../ui.js';
import { computeDilution } from '../calculators.js';
import { addHistory } from '../storage.js';

const MOLAR_UNITS   = ['M', 'mM', 'µM', 'nM', 'pM', 'fM'];
const MASSVOL_UNITS = ['g/L','g/mL','g/µL','mg/L','mg/mL','mg/µL','µg/L','µg/mL','µg/µL','ng/L','ng/mL','ng/µL','pg/L','pg/mL','pg/µL'];
const ACTIVITY_UNITS= ['U/mL','mU/mL','IU/mL','kIU/mL'];
const PCT_UNITS     = ['% w/v', '% v/v', '% w/w'];
const FACTOR_UNITS  = ['1×','10×','100×','1000×'];
const CONC_UNITS = [...MOLAR_UNITS, ...MASSVOL_UNITS, ...PCT_UNITS, ...ACTIVITY_UNITS, ...FACTOR_UNITS];
const VOL_UNITS  = ['L','mL','µL','nL'];

export function renderDilution(host) {
  host.innerHTML = '';
  host.appendChild(screenHeader({ eyebrow: 'Calculator', title: 'Dilution', avatar: '💧' }));

  host.appendChild(createEl('p', {
    class: 'hint',
    text: 'Volume of stock needed to reach a final concentration in a final volume.',
    style: { marginBottom: '16px' },
  }));

  const stock = inputGroup({ label: 'Stock concentration', placeholder: 'e.g. 10', units: CONC_UNITS, defaultUnit: 'M' });
  const final_ = inputGroup({ label: 'Final concentration', placeholder: 'e.g. 1',  units: CONC_UNITS, defaultUnit: 'M' });
  const vol    = inputGroup({ label: 'Final volume',        placeholder: 'e.g. 100', units: VOL_UNITS,  defaultUnit: 'mL' });

  host.appendChild(stock.wrap);
  host.appendChild(final_.wrap);
  host.appendChild(vol.wrap);

  const err = errorEl();
  const res = resultEl();

  const btn = ctaButton({ text: 'Calculate', onClick: () => {
    hideError(err); hideResult(res);
    const r = computeDilution({
      stockVal: stock.input.value, stockUnit: stock.select.value,
      finalVal: final_.input.value, finalUnit: final_.select.value,
      volVal: vol.input.value, volUnit: vol.select.value,
    });
    if (r.error) { showError(err, r.error); return; }
    const userUnit = r.userFinalVolUnit;
    const stockInUser = volumeInUnit(r.stockVolL, userUnit);
    const diluentInUser = volumeInUnit(r.diluentVolL, userUnit);
    const stockInMl = r.stockVolL * 1000;
    const stockInUl = r.stockVolL * 1e6;
    showResult(res, `
      <div class="result-label">To prepare ${formatNumber(volumeInUnit(r.finalVolL, userUnit))} ${userUnit}</div>
      <div class="result-big">${formatNumber(stockInUser)}<span class="u">${userUnit}</span></div>
      <div class="result-sub">of stock solution<br/>
        <strong>Add ${formatNumber(diluentInUser)} ${userUnit}</strong> of diluent.
        <br/><span style="opacity:0.75;font-size:12px">Also: ${formatNumber(stockInMl)} mL · ${formatNumber(stockInUl)} µL of stock</span>
      </div>
    `);
    addHistory({
      tool: 'dilution', toolLabel: 'Dilution',
      inputs: {
        stockVal: stock.input.value, stockUnit: stock.select.value,
        finalVal: final_.input.value, finalUnit: final_.select.value,
        volVal: vol.input.value, volUnit: vol.select.value,
      },
      summary: `${stock.input.value} ${stock.select.value} → ${final_.input.value} ${final_.select.value} · ${vol.input.value} ${vol.select.value} → ${formatNumber(stockInUser)} ${userUnit} stock`,
    });
  }});

  host.appendChild(btn);
  host.appendChild(err);
  host.appendChild(res);
}
