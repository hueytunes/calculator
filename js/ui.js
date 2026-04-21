/* ==========================================================================
   ui.js — reusable UI helpers for building screens.
   All helpers return DOM nodes; callers append them to their containers.
   ========================================================================== */

import { createEl } from './utils.js';
import { back } from './router.js';

/* Screen header with back arrow, title, and optional right-accessory. */
export function screenHeader({ eyebrow, title, avatar, onBack }) {
  const backBtn = createEl('button', {
    class: 'back', 'aria-label': 'Back',
    onclick: onBack || back,
  }, [svgBack()]);

  const block = createEl('div', { class: 'title-block' }, [
    eyebrow ? createEl('div', { class: 'eyebrow', text: eyebrow }) : null,
    createEl('h1', { text: title }),
  ]);

  const right = avatar
    ? createEl('div', { class: 'avatar', text: avatar })
    : createEl('div', { style: { width: '38px' } });

  return createEl('div', { class: 'screen-header' }, [backBtn, block, right]);
}

function svgBack() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', 'M10 12L6 8l4-4');
  svg.appendChild(p);
  return svg;
}

/* Greeting block for top-level tabs. */
export function greeting({ eyebrow, title }) {
  return createEl('div', { class: 'greeting' }, [
    eyebrow ? createEl('div', { class: 'eyebrow', text: eyebrow }) : null,
    createEl('h1', { text: title }),
  ]);
}

/* Input group: label + input (+ optional unit select). Returns container + field refs. */
export function inputGroup({ label, value = '', placeholder = '', units, defaultUnit, hint, step = 'any', id }) {
  const input = createEl('input', {
    class: 'input', type: 'number', inputmode: 'decimal',
    step, placeholder, autocomplete: 'off',
    ...(id ? { id } : {}),
  });
  if (value !== '' && value != null) input.value = value;

  let select = null;
  let container;

  if (units && units.length) {
    select = createEl('select', { class: 'select' },
      units.map(u => {
        const opt = createEl('option', { value: u, text: u });
        if (u === defaultUnit) opt.selected = true;
        return opt;
      })
    );
    container = createEl('div', { class: 'row' }, [input, select]);
  } else {
    container = input;
  }

  const wrap = createEl('div', { class: 'input-group' }, [
    createEl('label', { class: 'field-label', text: label }),
    container,
    hint ? createEl('p', { class: 'hint', text: hint }) : null,
  ]);

  return { wrap, input, select };
}

/* Text (non-number) input group — for recipe name, custom diluent, etc. */
export function textInputGroup({ label, value = '', placeholder = '', id }) {
  const input = createEl('input', {
    class: 'input', type: 'text', placeholder, autocomplete: 'off',
    ...(id ? { id } : {}),
  });
  if (value) input.value = value;
  const wrap = createEl('div', { class: 'input-group' }, [
    createEl('label', { class: 'field-label', text: label }),
    input,
  ]);
  return { wrap, input };
}

/* Standalone select with label. */
export function selectGroup({ label, options, value, id }) {
  const select = createEl('select', { class: 'select', ...(id ? { id } : {}) },
    options.map(o => {
      const opt = createEl('option', { value: o.value, text: o.label });
      if (o.value === value) opt.selected = true;
      return opt;
    })
  );
  const wrap = createEl('div', { class: 'input-group' }, [
    createEl('label', { class: 'field-label', text: label }),
    select,
  ]);
  return { wrap, select };
}

/* Cell-count compound input: mantissa × 10ⁿ [unit label]. */
export function cellCountInput({ label, value = '', exponent = 6, unitLabel = 'cells/mL', exponentOptions = [2,3,4,5,6,7,8], id }) {
  const input = createEl('input', {
    class: 'input', type: 'number', inputmode: 'decimal', step: 'any',
    autocomplete: 'off', placeholder: 'e.g. 1.1',
    ...(id ? { id } : {}),
  });
  if (value !== '' && value != null) input.value = value;

  const select = createEl('select', { class: 'select' },
    exponentOptions.map(e => {
      const opt = createEl('option', { value: String(e), text: `× 10^${e}` });
      if (e === exponent) opt.selected = true;
      return opt;
    })
  );

  const tag = createEl('div', { class: 'unit-tag', text: unitLabel });

  const wrap = createEl('div', { class: 'input-group' }, [
    createEl('label', { class: 'field-label', text: label }),
    createEl('div', { class: 'cell-count' }, [input, select, tag]),
  ]);

  /* Helper: read mantissa × 10^exp as a plain number, or return null if empty. */
  const readValue = () => {
    if (input.value === '' || input.value == null) return null;
    const mantissa = parseFloat(input.value);
    if (!Number.isFinite(mantissa)) return null;
    const exp = parseInt(select.value, 10);
    return mantissa * Math.pow(10, exp);
  };

  return { wrap, input, select, readValue };
}

/* Primary call-to-action button. */
export function ctaButton({ text, onClick, id }) {
  return createEl('button', {
    class: 'btn-cta', type: 'button',
    onclick: onClick,
    ...(id ? { id } : {}),
    text,
  });
}

/* Error message placeholder (starts hidden). */
export function errorEl({ id } = {}) {
  return createEl('div', { class: 'error-msg hidden', ...(id ? { id } : {}) });
}

/* Result container (starts hidden). */
export function resultEl({ id } = {}) {
  return createEl('div', { class: 'result-card hidden', ...(id ? { id } : {}) });
}

export function showError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}
export function hideError(el) { el.classList.add('hidden'); el.textContent = ''; }
export function showResult(el, html) { el.innerHTML = html; el.classList.remove('hidden'); }
export function hideResult(el) { el.classList.add('hidden'); el.innerHTML = ''; }

/* Mode toggle (segmented pill). onChange(value) fires when user changes. */
export function modeToggle({ options, value, onChange }) {
  const container = createEl('div', { class: 'mode-toggle' });
  const buttons = options.map(o => {
    const b = createEl('button', {
      class: 'mt-opt' + (o.value === value ? ' active' : ''),
      type: 'button', text: o.label,
      onclick: () => {
        buttons.forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        container.dataset.value = o.value;
        onChange && onChange(o.value);
      },
    });
    return b;
  });
  buttons.forEach(b => container.appendChild(b));
  container.dataset.value = value;
  return container;
}
