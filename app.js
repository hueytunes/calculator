
/**********************************************
 * UNIT CONVERSION CONSTANTS        *
 **********************************************/
const volumeToBase = { 'L': 1, 'mL': 1e-3, 'µL': 1e-6, 'nL': 1e-9 };
const massToBase = { 'g': 1, 'mg': 1e-3, 'µg': 1e-6, 'ng': 1e-9 };
const molarToBase = { 'M': 1, 'mM': 1e-3, 'µM': 1e-6, 'nM': 1e-9 };
const activityToBase = { 'IU/mL': 1, 'kIU/mL': 1000 };
const massPerVolToBase = {
    'g/L': 1, 'mg/mL': 1, 'µg/mL': 1e-3, 'ng/mL': 1e-6, 'ng/µL': 1
};

/**********************************************
 * DOM ELEMENT GETTERS              *
 **********************************************/
const getEl = (id) => document.getElementById(id);
const querySelAll = (selector) => document.querySelectorAll(selector);

/**********************************************
 * UI & HELPER FUNCTIONS             *
 **********************************************/
function showError(id, message) {
    const el = getEl(id);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function hideAndClear(el) {
    const targetEl = typeof el === 'string' ? getEl(el) : el;
    if (targetEl) {
        targetEl.classList.add('hidden');
        targetEl.innerHTML = '';
    }
}

function showResult(id, message) {
    const el = getEl(id);
    if (el) {
        el.innerHTML = message;
        el.classList.remove('hidden');
    }
}

function formatNumber(num) {
    if (num === 0) return '0';
    if (Math.abs(num) < 1e-6) return num.toExponential(4);
    if (Math.abs(num) < 1) return num.toPrecision(4);
    if (Math.abs(num) >= 1000) return num.toExponential(4);
    return Number(num.toPrecision(6)).toString();
}

/**
 * Parses a string that may contain scientific notation (e.g., '1.2e6' or '1.2x10^6')
 * @param {string} value - The input string from the user.
 * @returns {{error: string}|number} - The parsed number or an error object.
 /**
 * Parses a string that may contain scientific notation or common suffixes
 * like 'k' (thousand) or 'million'.
 * @param {string} value - The input string from the user.
 * @returns {{error: string}|number} - The parsed number or an error object.
 */
function parseScientific(value) {
    if (typeof value !== 'string') value = String(value);

    // Sanitize the string: remove whitespace and make it lowercase
    let sanitizedValue = value.trim().toLowerCase();

    // NEW: Handle 'million' suffix (e.g., '2.5 million' -> '2.5e6')
    // The \s* allows for an optional space between the number and "million"
    sanitizedValue = sanitizedValue.replace(/\s*million/, 'e6');

    // NEW: Handle 'k' suffix (e.g., '25k' -> '25e3')
    // The $ ensures we only replace 'k' if it's at the very end of the string
    sanitizedValue = sanitizedValue.replace(/k$/, 'e3');

    // Handle scientific 'x10^' notation (e.g., '3x10^5' -> '3e5')
    sanitizedValue = sanitizedValue.replace(/x10\^/, 'e');

    // Parse the potentially modified string into a number
    const val = parseFloat(sanitizedValue);

    // If parsing fails, return an error with updated examples
    if (isNaN(val)) {
        return { error: `Invalid number input: "${value}". Please use standard or scientific notation (e.g., 1000, 1e3, 25k, or 2.5 million).` };
    }
    return val;
}

/**********************************************
 * PARSING FUNCTIONS             *
 **********************************************/
function parseToBase(value, unit, conversionMap, typeName) {
    const val = parseScientific(value);
    if (val.error) return val;
    if (val < 0) return { error: `Invalid ${typeName} input. Must be a non-negative number.` };

    const factor = conversionMap[unit];
    if (factor === undefined) {
        return { error: `Unsupported ${typeName} unit: ${unit}` };
    }
    return val * factor;
}

function parseConcentration(value, unit) {
    const val = parseScientific(value);
    if (val.error) return val;
    
    if (unit === 'X') {
        if (val <= 0) return { error: 'X-factor must be a positive number.' };
        return { type: 'X', value: val };
    }
    if (molarToBase[unit]) {
        return { type: 'molar', value: val * molarToBase[unit] };
    }
    if (massPerVolToBase[unit]) {
        return { type: 'mass/vol', value: val * massPerVolToBase[unit] };
    }
    if (activityToBase[unit]) {
        return { type: 'activity', value: val * activityToBase[unit] };
    }
    return { error: `Unsupported concentration unit: ${unit}` };
}

/**********************************************
 * CALCULATOR LOGIC                 *
 **********************************************/

function calculateDilution() {
    hideAndClear(getEl('dil_result'));
    getEl('dil_error').textContent = '';

    const stockConc = parseConcentration(getEl('dil_stock_val').value, getEl('dil_stock_unit').value);
    const finalConc = parseConcentration(getEl('dil_final_val').value, getEl('dil_final_unit').value);
    const finalVol = parseToBase(getEl('dil_final_vol').value, getEl('dil_vol_unit').value, volumeToBase, 'volume');

    if (stockConc.error) { showError('dil_error', stockConc.error); return; }
    if (finalConc.error) { showError('dil_error', finalConc.error); return; }
    if (finalVol.error) { showError('dil_error', finalVol.error); return; }

    if (stockConc.type !== finalConc.type) {
        showError('dil_error', 'Stock and final concentration must be of the same type (e.g., both molar, both mass/vol, or both activity).');
        return;
    }
    if (stockConc.value < finalConc.value) {
        showError('dil_error', 'Stock concentration cannot be less than the final concentration.');
        return;
    }
    if(stockConc.value === 0) {
        showError('dil_error', 'Stock concentration cannot be zero.');
        return;
    }

    const stockVolNeeded = (finalConc.value * finalVol) / stockConc.value;
    const diluentVol = finalVol - stockVolNeeded;

    showResult('dil_result', `
        <p class="font-semibold">To prepare ${getEl('dil_final_vol').value} ${getEl('dil_vol_unit').value} of solution:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Take <strong>${formatNumber(stockVolNeeded * 1e3)} mL</strong> (or ${formatNumber(stockVolNeeded * 1e6)} µL) of your stock solution.</li>
            <li>Add <strong>${formatNumber(diluentVol * 1e3)} mL</strong> (or ${formatNumber(diluentVol * 1e6)} µL) of diluent.</li>
        </ul>
    `);
}

function calculateMolarityCalc() {
    hideAndClear(getEl('mol_calc_result'));
    getEl('mol_calc_error').textContent = '';
    const solveFor = getEl('mol_calc_solve_for').value;
    
    const mw = parseScientific(getEl('mol_calc_mw').value);
    if (mw.error || mw <= 0) {
        showError('mol_calc_error', 'Molecular Weight (MW) must be a positive number.');
        return;
    }

    const mass = parseToBase(getEl('mol_calc_mass_val').value, getEl('mol_calc_mass_unit').value, massToBase, 'mass');
    const vol = parseToBase(getEl('mol_calc_volume_val').value, getEl('mol_calc_volume_unit').value, volumeToBase, 'volume');
    const molarity = parseToBase(getEl('mol_calc_molar_val').value, getEl('mol_calc_molar_unit').value, molarToBase, 'molarity');

    let resultHtml = '';
    try {
        if (solveFor === 'mass') {
            if (vol.error) throw new Error(vol.error);
            if (molarity.error) throw new Error(molarity.error);
            const massG = molarity * vol * mw;
            resultHtml = `<p>Required Mass: <strong>${formatNumber(massG * 1000)} mg</strong> (or ${formatNumber(massG)} g)</p>`;
        } else if (solveFor === 'volume') {
            if (mass.error) throw new Error(mass.error);
            if (molarity.error) throw new Error(molarity.error);
            const volL = mass / (molarity * mw);
            resultHtml = `<p>Required Volume: <strong>${formatNumber(volL * 1000)} mL</strong> (or ${formatNumber(volL * 1e6)} µL)</p>`;
        } else if (solveFor === 'molarity') {
            if (mass.error) throw new Error(mass.error);
            if (vol.error) throw new Error(vol.error);
            const molarityM = mass / (vol * mw);
            resultHtml = `<p>Resulting Molarity: <strong>${formatNumber(molarityM * 1000)} mM</strong> (or ${formatNumber(molarityM)} M)</p>`;
        }
        showResult('mol_calc_result', resultHtml);
    } catch (e) {
        showError('mol_calc_error', e.message);
    }
}

function calculateReconstitution() {
    hideAndClear(getEl('recon_result'));
    getEl('recon_error').textContent = '';

    const mass = parseToBase(getEl('recon_mass_val').value, getEl('recon_mass_unit').value, massToBase, 'mass');
    const desiredConc = parseConcentration(getEl('recon_conc_val').value, getEl('recon_conc_unit').value);
    
    if (mass.error) { showError('recon_error', mass.error); return; }
    if (desiredConc.error) { showError('recon_error', desiredConc.error); return; }
    
    let volL = 0;
    
    if (desiredConc.type === 'molar') {
        const mw = parseScientific(getEl('recon_mw').value);
        if (mw.error || mw <= 0) {
            showError('recon_error', 'Molecular Weight (MW) is required for molar calculations.');
            return;
        }
        const moles = mass / mw;
        volL = moles / desiredConc.value;
    } else { // mass/vol or activity
        volL = mass / desiredConc.value;
    }
    
    if (volL <= 0 || !isFinite(volL)) {
        showError('recon_error', 'Calculation resulted in an invalid volume. Please check inputs.');
        return;
    }
    showResult('recon_result', `
        <p class="font-semibold">Add solvent to reconstitute:</p>
        <p><strong>${formatNumber(volL * 1e3)} mL</strong> (or ${formatNumber(volL * 1e6)} µL or ${formatNumber(volL)} L)</p>
    `);
}

function calculateMVC() {
    hideAndClear(getEl('mvc_result'));
    getEl('mvc_error').textContent = '';
    const solveFor = getEl('mvc_solve_for').value;

    const mass = parseToBase(getEl('mvc_mass').value, getEl('mvc_mass_unit').value, massToBase, 'mass');
    const vol = parseToBase(getEl('mvc_volume').value, getEl('mvc_vol_unit').value, volumeToBase, 'volume');
    const conc = parseToBase(getEl('mvc_conc').value, getEl('mvc_conc_unit').value, massPerVolToBase, 'concentration');

    let resultHtml = '';
    try {
        if (solveFor === 'mass') {
            if (vol.error) throw new Error(vol.error);
            if (conc.error) throw new Error(conc.error);
            const massG = conc * vol;
            resultHtml = `<p>Resulting Mass: <strong>${formatNumber(massG * 1000)} mg</strong> (or ${formatNumber(massG)} g)</p>`;
        } else if (solveFor === 'volume') {
            if (mass.error) throw new Error(mass.error);
            if (conc.error) throw new Error(conc.error);
            const volL = mass / conc;
            resultHtml = `<p>Resulting Volume: <strong>${formatNumber(volL * 1000)} mL</strong> (or ${formatNumber(volL * 1e6)} µL)</p>`;
        } else if (solveFor === 'concentration') {
            if (mass.error) throw new Error(mass.error);
            if (vol.error) throw new Error(vol.error);
            const concGL = mass / vol;
            resultHtml = `<p>Resulting Concentration: <strong>${formatNumber(concGL)} g/L</strong> (or ${formatNumber(concGL)} mg/mL)</p>`;
        }
        showResult('mvc_result', resultHtml);
    } catch (e) {
        showError('mvc_error', e.message);
    }
}

function calculateCellSeeding() {
    hideAndClear(getEl('cs_result'));
    getEl('cs_error').textContent = '';

    const stockConc = parseScientific(getEl('cs_stock_conc').value);
    const finalConc = parseScientific(getEl('cs_final_conc').value);
    const finalVol = parseScientific(getEl('cs_final_vol').value);

    if (stockConc.error) { showError('cs_error', stockConc.error); return; }
    if (finalConc.error) { showError('cs_error', finalConc.error); return; }
    if (finalVol.error) { showError('cs_error', finalVol.error); return; }

    if (stockConc <= 0 || finalConc < 0 || finalVol <= 0) {
        showError('cs_error', 'Concentrations and volumes must be positive numbers.');
        return;
    }
    if (stockConc < finalConc) {
        showError('cs_error', 'Stock concentration cannot be less than final concentration.');
        return;
    }
    
    // C1V1 = C2V2  => V1 = (C2 * V2) / C1
    const stockVolNeeded = (finalConc * finalVol) / stockConc; // in mL
    const mediaVolNeeded = finalVol - stockVolNeeded; // in mL

    showResult('cs_result', `
        <p class="font-semibold">To prepare ${formatNumber(finalVol)} mL of cell suspension:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Take <strong>${formatNumber(stockVolNeeded)} mL</strong> (or ${formatNumber(stockVolNeeded * 1000)} µL) of your cell stock.</li>
            <li>Add <strong>${formatNumber(mediaVolNeeded)} mL</strong> of fresh media.</li>
        </ul>
        <p class="mt-2 text-sm text-slate-600">This will yield a total of ${formatNumber(finalConc * finalVol)} cells.</p>
    `);
}


/**********************************************
 * EVENT LISTENERS               *
 **********************************************/
document.addEventListener('DOMContentLoaded', () => {
    const tabs = querySelAll('.tab');
    const sections = querySelAll('.calculator-section');
    
    function switchTab(targetId) {
        tabs.forEach(t => {
            const isActive = t.dataset.target === targetId;
            t.classList.toggle('border-indigo-500', isActive);
            t.classList.toggle('text-indigo-600', isActive);
            t.classList.toggle('border-transparent', !isActive);
            t.classList.toggle('text-slate-600', !isActive);
        });
        sections.forEach(s => {
            s.classList.toggle('active', s.id === targetId.substring(1));
        });
    }
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.target));
    });
    
    function setupDynamicFields(selectEl, fields) {
        function toggleFields() {
            const solveFor = selectEl.value;
            Object.keys(fields).forEach(key => {
                const isInputForSolve = key === solveFor;
                getEl(fields[key]).style.display = isInputForSolve ? 'none' : 'block';
            });
        }
        selectEl.addEventListener('change', toggleFields);
        toggleFields();
    }
    
    setupDynamicFields(getEl('mvc_solve_for'), {
        mass: 'mvc_input_mass',
        volume: 'mvc_input_volume',
        concentration: 'mvc_input_conc'
    });

    setupDynamicFields(getEl('mol_calc_solve_for'), {
        mass: 'mol_input_mass',
        volume: 'mol_input_volume',
        molarity: 'mol_input_molarity'
    });

    switchTab(tabs[0].dataset.target);
});
