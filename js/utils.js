/**********************************************
 * UNIT CONVERSION CONSTANTS        *
 **********************************************/
export const volumeToBase = { 'L': 1, 'mL': 1e-3, 'µL': 1e-6, 'nL': 1e-9 };
export const massToBase = { 'g': 1, 'mg': 1e-3, 'µg': 1e-6, 'ng': 1e-9 };
export const molarToBase = { 'M': 1, 'mM': 1e-3, 'µM': 1e-6, 'nM': 1e-9 };
export const activityToBase = { 'IU/mL': 1, 'kIU/mL': 1000 };
export const massPerVolToBase = {
    'g/L': 1, 'mg/mL': 1, 'µg/mL': 1e-3, 'ng/mL': 1e-6, 'ng/µL': 1e-3
};

/**********************************************
 * DOM ELEMENT GETTERS              *
 **********************************************/
export const getEl = (id) => document.getElementById(id);
export const querySelAll = (selector) => document.querySelectorAll(selector);

/**********************************************
 * UI & HELPER FUNCTIONS             *
 **********************************************/

/**
 * Formats a number into a readable string with suffixes for thousands (k)
 * and millions (M), or scientific notation for very small numbers.
 * @param {number} num - The number to format.
 * @returns {string} - The formatted string.
 */
export function formatNumber(num) {
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
 * Formats a number for the dosing calculator
 * without using k/M suffixes for large numbers.
 * @param {number} num - The number to format.
 * @returns {string} - The formatted string.
 */
export function formatDoseNumber(num) {
    // Always handle the zero case first
    if (num === 0) return '0';

    const absNum = Math.abs(num);

    // For very small numbers, use scientific notation for readability.
    if (absNum > 0 && absNum < 1e-3) {
        return num.toPrecision(3);
    }

    // For all other numbers, use standard formatting with commas and up to 4 decimal places.
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
/**
 * Formats a concentration value by automatically selecting the best units
 * (mg/mL, µg/mL, or ng/mL) to make the number readable.
 * @param {number} conc_mg_per_ml - The concentration in mg/mL.
 * @returns {string} - The formatted concentration string with units.
 */
export function formatConcentration(conc_mg_per_ml) {
    if (conc_mg_per_ml === 0) return '0 mg/mL';

    // Convert to ng/mL for comparison, as it's the smallest common unit here
    const conc_ng_per_ml = conc_mg_per_ml * 1e6;

    if (conc_ng_per_ml >= 1000) { // If it's 1 µg/mL or more
        if (conc_ng_per_ml >= 1e6) { // If it's 1 mg/mL or more
             return formatNumber(conc_mg_per_ml) + ' mg/mL';
        }
        return formatNumber(conc_mg_per_ml * 1000) + ' µg/mL';
    } else {
        return formatNumber(conc_ng_per_ml) + ' ng/mL';
    }
}

 /**
 * Parses a string that may contain scientific notation or common suffixes
 * like 'k' (thousand) or 'million'.
 * @param {string} value - The input string from the user.
 * @returns {{error: string}|number} - The parsed number or an error object.
 */
export function parseScientific(value) {
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
export function parseToBase(value, unit, conversionMap, typeName) {
    const val = parseScientific(value);
    if (val.error) return val;
    if (val < 0) return { error: `Invalid ${typeName} input. Must be a non-negative number.` };

    const factor = conversionMap[unit];
    if (factor === undefined) {
        return { error: `Unsupported ${typeName} unit: ${unit}` };
    }
    return val * factor;
}

export function parseConcentration(value, unit) {
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
