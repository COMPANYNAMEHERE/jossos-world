// Runtime-tunable configuration defaults
export const DEBUG_TOGGLE_KEY = 'o';
export const RESET_SCENE_KEY = 'r';
export const HOLD_POLL_MS = 33; // ~30Hz
export const FPS_UPDATE_MS = 250; // throttle fps UI updates

// Space mode and visuals
export const SPACE_MODE = true; // enable microgravity and space styling
export const STARS_COUNT = 220; // number of stars in background
export const STARS_SPEED = 14; // px/s drift speed
export const STARS_TWINKLE = true; // subtle brightness variation

// Gravity/top zone
export const GRAVITY_Y = 80; // slight downward gravity (px/s^2)
export const TOP_ZONE_FRAC = 0.0; // disable upward assist in space
