// Config loader: parses config.ini and exposes typed constants with defaults
// We import the INI file as raw text (Vite feature) and parse it.
import iniText from './config.ini?raw';

function parseIni(text) {
  const result = {};
  let section = '';
  const lines = String(text || '').split(/\r?\n/);
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).trim();
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    // strip inline comments starting with ; if preceded by space
    const sc = v.indexOf(' ;');
    if (sc !== -1) v = v.slice(0, sc).trim();
    const key = section ? `${section}.${k}` : k;
    result[key] = v;
  }
  return result;
}

function toNum(v, def) {
  if (v == null) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function toStr(v, def) {
  return v != null && v !== '' ? String(v) : def;
}
function toBool(v, def) {
  if (v == null) return def;
  const s = String(v).toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return def;
}

const cfg = parseIni(iniText);

// Keys
export const DEBUG_TOGGLE_KEY = toStr(cfg['keys.DEBUG_TOGGLE_KEY'], 'o');
export const RESET_SCENE_KEY = toStr(cfg['keys.RESET_SCENE_KEY'], 'r');

// Timing
export const HOLD_POLL_MS = toNum(cfg['timing.HOLD_POLL_MS'], 33);
export const FPS_UPDATE_MS = toNum(cfg['timing.FPS_UPDATE_MS'], 250);

// Gravity / top zone
export const GRAVITY_Y = toNum(cfg['gravity.GRAVITY_Y'], 2000);
export const TOP_ZONE_FRAC = toNum(cfg['gravity.TOP_ZONE_FRAC'], 0.1);
export const TOP_ZONE_UPWARD_MULTIPLIER = toNum(cfg['gravity.TOP_ZONE_UPWARD_MULTIPLIER'], -1);

// Physics constants
export const RESTITUTION = toNum(cfg['physics.RESTITUTION'], 0.55);
export const LINEAR_DAMP = toNum(cfg['physics.LINEAR_DAMP'], 0.992);
export const ANGULAR_DAMP = toNum(cfg['physics.ANGULAR_DAMP'], 0.985);
export const GROUND_FRICTION = toNum(cfg['physics.GROUND_FRICTION'], 0.86);
export const MAX_SPRING_FORCE = toNum(cfg['physics.MAX_SPRING_FORCE'], 20000);
export const DRAG_K = toNum(cfg['physics.DRAG_K'], 3000);
export const DRAG_C = toNum(cfg['physics.DRAG_C'], 120);
export const FIXED_DT = toNum(cfg['physics.FIXED_DT'], 1 / 120);
export const COLLISION_E = toNum(cfg['physics.COLLISION_E'], 0.3);
export const COLLISION_FRICTION = toNum(cfg['physics.COLLISION_FRICTION'], 0.35);
export const SOLVER_ITER = Math.max(1, Math.floor(toNum(cfg['physics.SOLVER_ITER'], 8)));
export const PENETRATION_SLOP = toNum(cfg['physics.PENETRATION_SLOP'], 0.5);
export const POSITION_BIAS = toNum(cfg['physics.POSITION_BIAS'], 0.85);
export const GROUND_UPRIGHT_STRENGTH = toNum(cfg['physics.GROUND_UPRIGHT_STRENGTH'], 0.2);
export const GROUND_ANGULAR_FRICTION = toNum(cfg['physics.GROUND_ANGULAR_FRICTION'], 0.6);
export const UPRIGHT_SNAP_RAD = toNum(cfg['physics.UPRIGHT_SNAP_RAD'], 0.02);
export const VY_REST_THRESH = toNum(cfg['physics.VY_REST_THRESH'], 40);
export const UPRIGHT_HORIZONTAL_BIAS = toNum(cfg['physics.UPRIGHT_HORIZONTAL_BIAS'], 1.8);
export const UPRIGHT_TORQUE_K = toNum(cfg['physics.UPRIGHT_TORQUE_K'], 18);
export const UPRIGHT_TORQUE_DAMP = toNum(cfg['physics.UPRIGHT_TORQUE_DAMP'], 4);
