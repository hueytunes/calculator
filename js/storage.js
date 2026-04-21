/* ==========================================================================
   storage.js — localStorage wrappers for recipes, history, settings
   ========================================================================== */

const KEY_RECIPES  = 'labcalc.recipes';
const KEY_HISTORY  = 'labcalc.history';
const KEY_SETTINGS = 'labcalc.settings';

const HISTORY_CAP = 50;

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read ${key}:`, e);
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to write ${key}:`, e);
  }
}

/* ---------------------------------------------------------------------------
   Settings
   --------------------------------------------------------------------------*/
export const DEFAULT_SETTINGS = {
  theme: 'auto',            // 'light' | 'dark' | 'auto'
  defaultVolumeUnit: 'mL',
  defaultDiluent: 'PBS',
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeRead(KEY_SETTINGS, {}) };
}

export function setSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  safeWrite(KEY_SETTINGS, s);
}

/* ---------------------------------------------------------------------------
   Recipes
   --------------------------------------------------------------------------*/
export function getRecipes() {
  const list = safeRead(KEY_RECIPES, []);
  return Array.isArray(list) ? list : [];
}

export function getRecipe(id) {
  return getRecipes().find(r => r.id === id) || null;
}

export function saveRecipe(recipe) {
  const list = getRecipes();
  const ix = list.findIndex(r => r.id === recipe.id);
  const now = new Date().toISOString();
  const saved = { ...recipe, updatedAt: now };
  if (ix >= 0) list[ix] = saved;
  else list.unshift({ ...saved, createdAt: saved.createdAt || now });
  safeWrite(KEY_RECIPES, list);
  return saved;
}

export function deleteRecipe(id) {
  const list = getRecipes().filter(r => r.id !== id);
  safeWrite(KEY_RECIPES, list);
}

export function getLastRecipe() {
  const list = getRecipes();
  if (list.length === 0) return null;
  return [...list].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
}

/* ---------------------------------------------------------------------------
   History
   --------------------------------------------------------------------------*/
export function getHistory() {
  const list = safeRead(KEY_HISTORY, []);
  return Array.isArray(list) ? list : [];
}

export function addHistory(entry) {
  const list = getHistory();
  list.unshift({
    id: 'hist-' + Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (list.length > HISTORY_CAP) list.length = HISTORY_CAP;
  safeWrite(KEY_HISTORY, list);
}

export function clearHistory() {
  safeWrite(KEY_HISTORY, []);
}

/* ---------------------------------------------------------------------------
   ID helpers
   --------------------------------------------------------------------------*/
export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
