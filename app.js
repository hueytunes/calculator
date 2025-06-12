
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

/**
 * Formats a number into a readable string with suffixes for thousands (k)
 * and millions (M), or scientific notation for very small numbers.
 * @param {number} num - The number to format.
 * @returns {string} - The formatted string.
 */
function formatNumber(num) {
    // Always handle the zero case first
    if (num === 0) return '0';

    const absNum = Math.abs(num);

    // Rule for numbers >= 1,000,000 (e.g., 2,500,000 -> "2.50M")
    if (absNum >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    }
    // Rule for numbers >= 1,000 (e.g., 100,000 -> "100k")
    else if (absNum >= 1e3) {
        return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    // Rule for numbers between 1 and 999 (e.g., 50 -> "50")
    else if (absNum >= 1) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    // Rule for ALL numbers less than 1
    else {
        // Use toPrecision for significant figures. (e.g., 0.0005 -> "5.00e-4")
        return num.toPrecision(3);
    }
}

/**
 * Formats a concentration value by automatically selecting the best units
 * (mg/mL, µg/mL, or ng/mL) to make the number readable.
 * @param {number} conc_mg_per_ml - The concentration in mg/mL.
 * @returns {string} - The formatted concentration string with units.
 */
function formatConcentration(conc_mg_per_ml) {
    if (conc_mg_per_ml === 0) return '0 mg/mL';

    // Convert to ng/mL for comparison, as it's the smallest common unit here
    const conc_ng_per_ml = conc_mg_per_ml * 1e6;

    if (conc_ng_per_ml >= 1000) { // If it's 1 µg/mL or more
        if (conc_ng_per_ml >= 1e6) { // If it's 1 mg/mL or more
             return formatNumber(conc_mg_per_ml) + ' mg/mL';
        }
        return formatNumber(conc_mg_per_ml / 1000) + ' µg/mL';
    } else {
        return formatNumber(conc_ng_per_ml) + ' ng/mL';
    }
}

/**
 * Tries to find a valid serial dilution protocol for a given dilution factor.
 * @returns {string|false} - The HTML for the protocol, or false if impossible.
 */
function findSerialProtocol(c1, c2, finalVol_uL, minPipetteVol_uL, factor, originalValues) {
    let html = '';
    let currentStockConc = c1;
    let stepCounter = 1;
    const DILUTION_VOL_STOCK = 100 / factor;
    const DILUTION_VOL_DILUENT = 100 - DILUTION_VOL_STOCK;

    while ((c2 * finalVol_uL) / currentStockConc < minPipetteVol_uL) {
        let nextStockConc = currentStockConc / factor;
        if (nextStockConc < c2) {
            return false;
        }
        html += `<div class="mt-4"><p class="font-medium">Step ${stepCounter}: Prepare Intermediate Stock #${stepCounter} (${formatConcentration(nextStockConc)})</p><ul class="list-disc list-inside mt-2 space-y-1"><li>Take <strong>${formatNumber(DILUTION_VOL_STOCK)} µL</strong> of your previous stock (${formatConcentration(currentStockConc)}).</li><li>Add <strong>${formatNumber(DILUTION_VOL_DILUENT)} µL</strong> of diluent (to make 100 µL total).</li></ul></div>`;
        currentStockConc = nextStockConc;
        stepCounter++;
        if (stepCounter > 5) return false;
    }

    const final_v1_uL = (c2 * finalVol_uL) / currentStockConc;
    let final_diluent_uL = finalVol_uL - final_v1_uL;

    // --- THIS IS THE FIX ---
    // If the diluent volume is a tiny floating-point residual, round to 0.
    if (Math.abs(final_diluent_uL) < 1e-9) final_diluent_uL = 0;

    html += `<div class="mt-4"><p class="font-medium">Step ${stepCounter}: Prepare the Final Dose</p><ul class="list-disc list-inside mt-2 space-y-1"><li>Take <strong>${formatNumber(final_v1_uL)} µL</strong> of the last intermediate stock (${formatConcentration(currentStockConc)}).</li><li>Add <strong>${formatNumber(final_diluent_uL)} µL</strong> of diluent.</li><li class="text-sm text-slate-600">This gives you a final volume of ${originalValues.volVal} ${originalValues.volUnit} containing exactly <strong>${originalValues.massVal} ${originalValues.massUnit}</strong> of the drug.</li></ul></div>`;
    return html;
}

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

function calculateSerialDose() {
    hideAndClear(getEl('sd_result'));
    hideAndClear(getEl('sd_error'));

    const originalValues = {
        massVal: getEl('sd_final_mass_val').value,
        massUnit: getEl('sd_final_mass_unit').value,
        volVal: getEl('sd_final_vol_val').value,
        volUnit: getEl('sd_final_vol_unit').value,
    };
    
    const stockConcMap = { 'mg/mL': 1, 'µg/mL': 1e-3, 'g/L': 1, 'ng/mL': 1e-6 }; // Corrected ng/mL to be relative to mg/mL
    const c1 = parseToBase(getEl('sd_stock_val').value, getEl('sd_stock_unit').value, stockConcMap, 'concentration');
    if (c1.error || c1 <= 0) { showError('sd_error', 'Invalid Stock Concentration.'); return; }

    const finalMass_g = parseToBase(originalValues.massVal, originalValues.massUnit, massToBase, 'mass');
    if (finalMass_g.error) { showError('sd_error', finalMass_g.error); return; }
    const finalMass_mg = finalMass_g * 1000;

    const finalVol_uL = parseToBase(originalValues.volVal, originalValues.volUnit, { 'mL': 1000, 'µL': 1 }, 'volume');
    if (finalVol_uL.error) { showError('sd_error', finalVol_uL.error); return; }

    const minPipetteVol_uL = parseScientific(getEl('sd_min_pipette_vol').value);
    if (minPipetteVol_uL.error || minPipetteVol_uL <= 0) { showError('sd_error', 'Invalid Minimum Pipetting Volume.'); return; }
    
    const c2 = finalMass_mg / (finalVol_uL / 1000);

    if (c1 < c2) {
        showError('sd_error', 'Stock Concentration cannot be less than the required Final Concentration.');
        return;
    }

    let direct_v1_uL = (c2 * finalVol_uL) / c1;
    
    // --- Strategy 1: The Best Case - A Direct Dilution ---
    if (direct_v1_uL >= minPipetteVol_uL) {
        let diluentVol_uL = finalVol_uL - direct_v1_uL;
        if (Math.abs(diluentVol_uL) < 1e-9) diluentVol_uL = 0;
        
        let resultHtml = `<p class="font-semibold text-green-800">A direct dilution is the most efficient method.</p>
                          <p class="mt-2">To prepare your dose:</p>
                          <ul class="list-disc list-inside mt-2 space-y-1">
                            <li>Take <strong>${formatNumber(direct_v1_uL)} µL</strong> of your original stock.</li>`;
        if (diluentVol_uL > 0) {
            resultHtml += `<li>Add <strong>${formatNumber(diluentVol_uL)} µL</strong> of diluent.</li>`;
        }
         resultHtml += `<li class="text-sm text-slate-600">This gives you a final volume of ${originalValues.volVal} ${originalValues.volUnit} containing exactly <strong>${originalValues.massVal} ${originalValues.massUnit}</strong> of the drug.</li></ul>`;
        showResult('sd_result', resultHtml);
        return; 
    }

    // --- Strategy 2: The Next Best Case - An Ideal 2-Step Dilution ---
    const V_inter_total_uL = 100;
    const c_inter_max = (c2 * finalVol_uL) / minPipetteVol_uL;
    
    if (c_inter_max < c1) {
        const c_inter = c_inter_max;
        const v1_for_inter_uL = (c_inter * V_inter_total_uL) / c1;
        
        if (v1_for_inter_uL >= minPipetteVol_uL) {
            const diluent_for_inter_uL = V_inter_total_uL - v1_for_inter_uL;
            const v1_for_final_uL = (c2 * finalVol_uL) / c_inter;
            let diluent_for_final_uL = finalVol_uL - v1_for_final_uL;
            if (Math.abs(diluent_for_final_uL) < 1e-9) diluent_for_final_uL = 0;

            let resultHtml = `<p class="font-semibold">The most efficient protocol is a 2-step dilution:</p>
                <div class="mt-4"><p class="font-medium">Step 1: Prepare an Intermediate Stock (${formatConcentration(c_inter)})</p><ul class="list-disc list-inside mt-2 space-y-1"><li>Take <strong>${formatNumber(v1_for_inter_uL)} µL</strong> of your original stock (${formatConcentration(c1)}).</li><li>Add <strong>${formatNumber(diluent_for_inter_uL)} µL</strong> of diluent.</li></ul></div>
                <div class="mt-4"><p class="font-medium">Step 2: Prepare the Final Dose</p><ul class="list-disc list-inside mt-2 space-y-1"><li>Take <strong>${formatNumber(v1_for_final_uL)} µL</strong> of your new intermediate stock.</li>`;
            if (diluent_for_final_uL > 0) {
                resultHtml += `<li>Add <strong>${formatNumber(diluent_for_final_uL)} µL</strong> of diluent.</li>`;
            }
            resultHtml += `<li class="text-sm text-slate-600">This gives you ${originalValues.volVal} ${originalValues.volUnit} containing exactly <strong>${originalValues.massVal} ${originalValues.massUnit}</strong> of the drug.</li></ul></div>`;
            showResult('sd_result', resultHtml);
            return; 
        }
    }
    
    // --- Strategy 3: The Last Resort - Multi-Step Serial Dilution ---
    const factorsToTry = [10, 100]; 
    for (const factor of factorsToTry) {
        const protocolHtml = findSerialProtocol(c1, c2, finalVol_uL, minPipetteVol_uL, factor, originalValues);
        if (protocolHtml !== false) {
            let resultHtml = `<p class="font-semibold">A simple dilution is not practical. A multi-step protocol is required:</p>` + protocolHtml;
            showResult('sd_result', resultHtml);
            return;
        }
    }

    showError('sd_error', 'Cannot find a practical dilution protocol with the given constraints. Your stock may be too concentrated or your minimum pipetting volume too high.');
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
    
    // --- Connect Dynamic Field Selectors ---
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

    // --- Connect ALL Calculator Buttons ---
    getEl('dilution-calculator').querySelector('button').addEventListener('click', calculateDilution);
    getEl('molarity-calculator').querySelector('button').addEventListener('click', calculateMolarityCalc);
    getEl('reconstitution-calculator').querySelector('button').addEventListener('click', calculateReconstitution);
    getEl('mass-vol-conc-calculator').querySelector('button').addEventListener('click', calculateMVC);
    getEl('cell-seeding-calculator').querySelector('button').addEventListener('click', calculateCellSeeding);
    
    // This connects your new button
    getEl('calculate_sd_btn').addEventListener('click', calculateSerialDose);

    // Activate the first tab on page load
    switchTab(tabs[0].dataset.target);
});
