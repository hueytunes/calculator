/* ==========================================================================
   Recipe Builder screen — multi-ingredient mixer.
   ========================================================================== */

import { createEl, formatNumber, bestVolumeUnit, bestMassUnit } from '../utils.js';
import {
  screenHeader, inputGroup, textInputGroup, selectGroup, ctaButton,
  errorEl, resultEl, showError, hideError, showResult, hideResult,
} from '../ui.js';
import {
  blankRecipe, blankIngredient, computeRecipe,
  SOURCE_TYPES, DILUENT_OPTIONS,
} from '../recipe.js';
import { PRESETS, getPreset } from '../presets.js';
import { getRecipe, saveRecipe, addHistory, newId } from '../storage.js';

const VOL_UNITS = ['L', 'mL', 'µL', 'nL'];

const CONC_UNIT_GROUPS = {
  molar:    ['M','mM','µM','nM','pM','fM'],
  massvol:  ['g/L','g/mL','g/µL','mg/L','mg/mL','mg/µL','µg/L','µg/mL','µg/µL','ng/L','ng/mL','ng/µL','pg/L','pg/mL','pg/µL'],
  percent:  ['% w/v', '% v/v', '% w/w'],
  factor:   ['1×','10×','100×','1000×'],
  activity: ['U/mL','mU/mL','IU/mL','kIU/mL'],
};
const ALL_CONC_UNITS = [
  ...CONC_UNIT_GROUPS.molar,
  ...CONC_UNIT_GROUPS.massvol,
  ...CONC_UNIT_GROUPS.percent,
  ...CONC_UNIT_GROUPS.factor,
  ...CONC_UNIT_GROUPS.activity,
];

/* Current in-memory recipe being edited. */
let currentRecipe = null;

export function renderBuilder(host, ctx) {
  host.innerHTML = '';

  // Load recipe: from ctx.recipeId, or from ctx.presetId, or fresh blank.
  if (ctx && ctx.recipeId) {
    currentRecipe = getRecipe(ctx.recipeId) || blankRecipe();
  } else if (ctx && ctx.presetId) {
    const p = getPreset(ctx.presetId);
    currentRecipe = p ? clonePreset(p) : blankRecipe();
  } else if (!currentRecipe) {
    currentRecipe = blankRecipe();
  }

  host.appendChild(screenHeader({
    eyebrow: 'Recipe',
    title: currentRecipe.name || 'New recipe',
    avatar: currentRecipe.icon || '✨',
  }));

  // Preset chip row — always visible so you can swap recipes without leaving.
  // The currently-loaded preset (if any) is highlighted.
  host.appendChild(renderPresetChips(currentRecipe.presetId));

  // Recipe meta: name + final volume + diluent
  const name = textInputGroup({ label: 'Recipe name', value: currentRecipe.name });
  name.input.addEventListener('input', () => { currentRecipe.name = name.input.value; });
  host.appendChild(name.wrap);

  const vol = inputGroup({
    label: 'Final volume',
    value: currentRecipe.finalVolume.value,
    units: VOL_UNITS,
    defaultUnit: currentRecipe.finalVolume.unit,
  });
  vol.input.addEventListener('input', () => { currentRecipe.finalVolume.value = vol.input.value; });
  vol.select.addEventListener('change', () => { currentRecipe.finalVolume.unit = vol.select.value; });
  host.appendChild(vol.wrap);

  const diluent = selectGroup({
    label: 'Diluent',
    options: DILUENT_OPTIONS,
    value: currentRecipe.diluent,
  });
  diluent.select.addEventListener('change', () => {
    currentRecipe.diluent = diluent.select.value;
    customDiluent.wrap.classList.toggle('hidden', diluent.select.value !== 'custom');
  });
  host.appendChild(diluent.wrap);

  const customDiluent = textInputGroup({ label: 'Custom diluent name', value: currentRecipe.customDiluent });
  if (currentRecipe.diluent !== 'custom') customDiluent.wrap.classList.add('hidden');
  customDiluent.input.addEventListener('input', () => { currentRecipe.customDiluent = customDiluent.input.value; });
  host.appendChild(customDiluent.wrap);

  // Ingredient list
  host.appendChild(createEl('div', { class: 'section-head' }, [
    createEl('h2', { text: 'Ingredients' }),
    createEl('span', { class: 'see-all', text: 'Tap to edit' }),
  ]));

  const ingHost = createEl('div');
  host.appendChild(ingHost);
  const renderIngredients = () => {
    ingHost.innerHTML = '';
    currentRecipe.ingredients.forEach((ing, ix) => ingHost.appendChild(renderIngredientCard(ing, ix)));
  };
  renderIngredients();

  host.appendChild(createEl('button', {
    class: 'btn-add',
    onclick: () => {
      currentRecipe.ingredients.push(blankIngredient());
      renderIngredients();
    },
  }, [
    createEl('span', { class: 'plus', text: '+' }),
    ' Add ingredient',
  ]));

  const err = errorEl();
  const res = resultEl();
  res.style.background = 'linear-gradient(135deg, var(--coral), var(--coral-deep))';

  // Actions
  const actions = createEl('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });
  const calcBtn = ctaButton({
    text: 'Compute recipe',
    onClick: () => doCompute(),
  });
  const saveBtn = createEl('button', {
    class: 'btn-secondary',
    text: 'Save',
    onclick: () => {
      if (!currentRecipe.name || !currentRecipe.name.trim()) {
        showError(err, 'Give the recipe a name before saving.');
        return;
      }
      const saved = saveRecipe({ ...currentRecipe, isPreset: false, presetId: null });
      currentRecipe = saved;
      showError(err, ''); hideError(err);
      flash(saveBtn, 'Saved ✓');
    },
  });
  actions.appendChild(calcBtn);
  actions.appendChild(saveBtn);
  host.appendChild(actions);

  host.appendChild(err);
  host.appendChild(res);

  const protocolHost = createEl('div', { style: { marginTop: '14px' } });
  host.appendChild(protocolHost);

  function doCompute() {
    hideError(err); hideResult(res);
    protocolHost.innerHTML = '';
    const r = computeRecipe(currentRecipe);
    if (r.error) { showError(err, r.error); return; }
    if (r.errors && r.errors.length) { showError(err, r.errors.join(' · ')); }

    const protocol = buildProtocolSteps(currentRecipe, r);
    const totalHtml = `
      <div class="result-label">Protocol</div>
      <div class="result-big">${formatNumber(r.finalVolL * 1000)}<span class="u">mL</span></div>
      <div class="result-sub">${currentRecipe.ingredients.filter(i => i.name).length} ingredient(s) + fill with ${labelDiluent(currentRecipe)} (${formatNumber(r.diluentVolL * 1000)} mL)</div>
    `;
    showResult(res, totalHtml);

    // Detailed protocol card
    protocolHost.appendChild(renderProtocolCard(r, currentRecipe, protocol));

    addHistory({
      tool: 'recipe', toolLabel: 'Recipe',
      inputs: { recipeId: currentRecipe.id, name: currentRecipe.name },
      summary: `${currentRecipe.name} · ${currentRecipe.ingredients.length} ingredient(s) · ${currentRecipe.finalVolume.value} ${currentRecipe.finalVolume.unit}`,
    });
  }
}

/* ---------- Preset chips ---------- */
function renderPresetChips(activePresetId) {
  const row = createEl('div', {
    style: { display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 2px 10px' },
  });
  // "Blank" chip first
  const blankActive = !activePresetId;
  const blank = createEl('button', {
    style: chipStyle(blankActive),
    onclick: () => {
      currentRecipe = null; // will be recreated as blank below
      const host = document.getElementById('screen-builder');
      renderBuilder(host, {});
    },
  }, ['＋ Blank']);
  row.appendChild(blank);

  for (const p of PRESETS) {
    const isActive = activePresetId === p.presetId;
    const chip = createEl('button', {
      style: chipStyle(isActive),
      onclick: () => {
        currentRecipe = clonePreset(p);
        const host = document.getElementById('screen-builder');
        renderBuilder(host, { presetId: p.presetId });
      },
    }, [`${p.icon || '✨'}  ${p.name}`]);
    row.appendChild(chip);
  }
  return createEl('div', { style: { marginBottom: '14px' } }, [
    createEl('div', { class: 'field-label', text: 'Templates', style: { marginBottom: '8px' } }),
    row,
  ]);
}

function chipStyle(isActive) {
  return {
    flex: '0 0 auto',
    padding: '10px 14px',
    borderRadius: '999px',
    border: isActive ? '1.5px solid var(--coral)' : '1.5px solid transparent',
    background: isActive ? 'var(--coral-soft)' : 'var(--card)',
    color: isActive ? 'var(--coral-deep)' : 'var(--ink)',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 10px -4px rgba(42,31,20,0.12)',
    whiteSpace: 'nowrap',
    transition: 'all 180ms',
  };
}

/* ---------- Ingredient card ---------- */
function renderIngredientCard(ing, ix) {
  const card = createEl('div', { class: 'ing-card' });
  const circle = createEl('div', {
    class: 'ing-circle bg-coral',
    text: (ing.name || '?')[0].toUpperCase(),
  });
  const body = createEl('div', { class: 'ing-body' }, [
    createEl('div', { class: 'nm', text: ing.name || '(unnamed ingredient)' }),
    createEl('div', { class: 'sub', text: summarizeIngredient(ing) }),
  ]);
  const chev = createEl('div', { class: 'chev', text: '›', style: { fontSize: '18px', fontWeight: '700' } });
  const head = createEl('div', {
    style: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: '100%' },
    onclick: () => card.classList.toggle('open'),
  }, [chev, circle, body]);
  card.appendChild(head);

  const expanded = createEl('div', { class: 'ing-expanded' });
  expanded.appendChild(buildIngredientForm(ing, () => {
    // Update the summary line when fields change
    body.querySelector('.nm').textContent = ing.name || '(unnamed ingredient)';
    body.querySelector('.sub').textContent = summarizeIngredient(ing);
    circle.textContent = (ing.name || '?')[0].toUpperCase();
  }, () => {
    // Remove callback
    const host = document.getElementById('screen-builder');
    const idx = currentRecipe.ingredients.findIndex(x => x.id === ing.id);
    if (idx >= 0) currentRecipe.ingredients.splice(idx, 1);
    renderBuilder(host, { recipeId: currentRecipe.id });
  }));
  card.appendChild(expanded);

  return card;
}

function buildIngredientForm(ing, onChange, onRemove) {
  const container = createEl('div');

  const name = textInputGroup({ label: 'Name', value: ing.name });
  name.input.addEventListener('input', () => { ing.name = name.input.value; onChange(); });
  container.appendChild(name.wrap);

  const srcSel = selectGroup({
    label: 'Source type',
    options: Object.entries(SOURCE_TYPES).map(([v, l]) => ({ value: v, label: l })),
    value: ing.source,
  });
  srcSel.select.addEventListener('change', () => {
    ing.source = srcSel.select.value;
    rebuildSourceFields();
    onChange();
  });
  container.appendChild(srcSel.wrap);

  const sourceHost = createEl('div');
  container.appendChild(sourceHost);

  const targetHost = createEl('div');
  container.appendChild(targetHost);

  const mwGroup = inputGroup({ label: 'Molecular weight (g/mol)', value: ing.mw, placeholder: 'e.g. 180.16', units: null, hint: 'Required for molar bridging.' });
  mwGroup.input.addEventListener('input', () => { ing.mw = mwGroup.input.value; onChange(); });
  container.appendChild(mwGroup.wrap);

  function rebuildSourceFields() {
    sourceHost.innerHTML = '';
    targetHost.innerHTML = '';
    mwGroup.wrap.classList.add('hidden');

    switch (ing.source) {
      case 'liquid-stock': {
        const stock = inputGroup({ label: 'Stock concentration', value: ing.sourceInputs.stockValue, units: ALL_CONC_UNITS, defaultUnit: ing.sourceInputs.stockUnit || 'M' });
        stock.input.addEventListener('input', () => { ing.sourceInputs.stockValue = stock.input.value; onChange(); });
        stock.select.addEventListener('change', () => { ing.sourceInputs.stockUnit = stock.select.value; onChange(); });
        sourceHost.appendChild(stock.wrap);
        appendTargetConc(ing, targetHost, onChange);
        mwGroup.wrap.classList.remove('hidden');
        break;
      }
      case 'powder-mw': {
        appendTargetConc(ing, targetHost, onChange);
        mwGroup.wrap.classList.remove('hidden');
        break;
      }
      case 'powder-mass': {
        const units = ['g','mg','µg','ng','% w/v','% v/v','% w/w','mg/mL','µg/mL','ng/mL'];
        appendTargetConc(ing, targetHost, onChange, units, ing.targetInputs.unit || '% w/v');
        break;
      }
      case 'x-concentrated': {
        const stock = inputGroup({ label: 'Stock × factor', value: ing.sourceInputs.stockValue, units: ['1×','10×','100×','1000×'], defaultUnit: ing.sourceInputs.stockUnit || '10×' });
        stock.input.addEventListener('input', () => { ing.sourceInputs.stockValue = stock.input.value; onChange(); });
        stock.select.addEventListener('change', () => { ing.sourceInputs.stockUnit = stock.select.value; onChange(); });
        sourceHost.appendChild(stock.wrap);
        appendTargetConc(ing, targetHost, onChange, ['1×','10×','100×','1000×'], ing.targetInputs.unit || '1×');
        break;
      }
      case 'pure-liquid-density': {
        const density = inputGroup({ label: 'Density (g/mL)', value: ing.sourceInputs.density, placeholder: 'e.g. 1.26 (glycerol)', units: null });
        density.input.addEventListener('input', () => { ing.sourceInputs.density = density.input.value; onChange(); });
        sourceHost.appendChild(density.wrap);
        appendTargetConc(ing, targetHost, onChange);
        mwGroup.wrap.classList.remove('hidden');
        break;
      }
      case 'ratio-dilution': {
        const ratio = inputGroup({ label: '1 : X (textbook)', value: ing.sourceInputs.ratioX, placeholder: 'e.g. 100 for 1:100', units: null, hint: '1 part stock in X parts total. 1:100 of 10 mL = 100 µL stock + 9,900 µL diluent.' });
        ratio.input.addEventListener('input', () => { ing.sourceInputs.ratioX = ratio.input.value; onChange(); });
        sourceHost.appendChild(ratio.wrap);
        // No separate target concentration
        break;
      }
    }
  }
  rebuildSourceFields();

  const removeBtn = createEl('button', {
    style: {
      marginTop: '8px', background: 'transparent', border: 'none',
      color: 'var(--red-danger)', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
      fontFamily: 'inherit',
    },
    text: 'Remove ingredient',
    onclick: onRemove,
  });
  container.appendChild(removeBtn);
  return container;
}

function appendTargetConc(ing, host, onChange, unitList = ALL_CONC_UNITS, defaultUnit = ing.targetInputs.unit || 'mM') {
  const target = inputGroup({ label: 'Final concentration', value: ing.targetInputs.value, units: unitList, defaultUnit });
  target.input.addEventListener('input', () => { ing.targetInputs.value = target.input.value; onChange(); });
  target.select.addEventListener('change', () => { ing.targetInputs.unit = target.select.value; onChange(); });
  host.appendChild(target.wrap);
}

/* ---------- Summary + protocol rendering ---------- */
function summarizeIngredient(ing) {
  const bits = [];
  if (ing.targetInputs.value) bits.push(`${ing.targetInputs.value} ${ing.targetInputs.unit}`);
  bits.push(SOURCE_TYPES[ing.source] || ing.source);
  return bits.join(' · ');
}

function labelDiluent(recipe) {
  if (recipe.diluent === 'custom') return recipe.customDiluent || 'custom';
  return recipe.diluent;
}

function buildProtocolSteps(recipe, r) {
  const steps = [];
  // Powders first (weighing order)
  for (const ing of r.ingredients) {
    if (ing.error) continue;
    if (ing.kind === 'mass') {
      const { value, unit } = bestMassUnit(ing.amountBaseG);
      steps.push(`Weigh <strong>${formatNumber(value)} ${unit}</strong> of ${ing.name}.`);
    }
  }
  // Liquids next
  for (const ing of r.ingredients) {
    if (ing.error) continue;
    if (ing.kind === 'volume') {
      const { value, unit } = bestVolumeUnit(ing.amountBaseL);
      steps.push(`Add <strong>${formatNumber(value)} ${unit}</strong> of ${ing.name}${ing.note ? ` <span style="opacity:0.7">(${escapeHtml(ing.note)})</span>` : ''}.`);
    }
  }
  steps.push(`Fill to <strong>${formatNumber(r.finalVolL * 1000)} mL</strong> with ${labelDiluent(recipe)} (≈ ${formatNumber(r.diluentVolL * 1000)} mL).`);
  steps.push('Mix well; filter sterilize (0.22 µm) if required.');
  return steps;
}

function renderProtocolCard(r, recipe, steps) {
  const card = createEl('div', { class: 'protocol' });
  card.appendChild(createEl('h4', { text: 'Protocol' }));
  const ol = createEl('ol');
  steps.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = s;
    ol.appendChild(li);
  });
  card.appendChild(ol);

  // Fill band summary
  const fill = createEl('div', { class: 'fill-band', style: { marginTop: '12px' } }, [
    createEl('div', {}, [
      createEl('div', { class: 'eyebrow', text: 'Diluent', style: { color: 'var(--sage-deep)' } }),
      createEl('div', { style: { marginTop: '4px', fontSize: '15px', fontWeight: '700' }, text: labelDiluent(recipe) }),
    ]),
    createEl('div', { style: { textAlign: 'right' } }, [
      createEl('div', { class: 'big', html: `${formatNumber(r.diluentVolL * 1000)}<span class="u">mL</span>` }),
      createEl('div', { style: { fontSize: '9px', fontWeight: '800', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }, text: 'add last' }),
    ]),
  ]);
  card.appendChild(fill);
  return card;
}

function clonePreset(p) {
  return {
    id: newId('rec'),
    name: p.name,
    icon: p.icon || '✨',
    finalVolume: { ...p.finalVolume },
    diluent: p.diluent,
    customDiluent: p.customDiluent || '',
    ingredients: p.ingredients.map(ing => ({
      ...ing,
      id: 'ing-' + Math.random().toString(36).slice(2, 10),
      sourceInputs: { ...ing.sourceInputs },
      targetInputs: { ...ing.targetInputs },
    })),
    createdAt: null,
    updatedAt: null,
    isPreset: false,
    presetId: p.presetId,
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function flash(btn, msg) {
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = original; }, 1200);
}

/* Allow router.go('builder', { recipeId / presetId }) to pass context.
   main.js registers builder without a fixed render() so we handle it here. */
export function openBuilderWith(ctx) {
  const host = document.getElementById('screen-builder');
  renderBuilder(host, ctx);
}
