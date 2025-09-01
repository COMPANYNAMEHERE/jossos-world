import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {
  TOP_ZONE_FRAC, HOLD_POLL_MS, DEBUG_TOGGLE_KEY, FPS_UPDATE_MS, RESET_SCENE_KEY,
  GRAVITY_Y, TOP_ZONE_UPWARD_MULTIPLIER,
  RESTITUTION, LINEAR_DAMP, ANGULAR_DAMP, GROUND_FRICTION,
  MAX_SPRING_FORCE, DRAG_K, DRAG_C, FIXED_DT,
  COLLISION_E, COLLISION_FRICTION, SOLVER_ITER, PENETRATION_SLOP, POSITION_BIAS,
  GROUND_UPRIGHT_STRENGTH, GROUND_ANGULAR_FRICTION, UPRIGHT_SNAP_RAD, VY_REST_THRESH, UPRIGHT_HORIZONTAL_BIAS,
  UPRIGHT_TORQUE_K, UPRIGHT_TORQUE_DAMP
} from '../config/index.js';

// Physics constants (sourced from config)
const GRAVITY = GRAVITY_Y; // alias for readability in this module

const WORDS = [
  { id: 'blogs', label: 'BLOGS', route: '/blogs' },
  { id: 'videos', label: 'VIDEOS', route: '/videos' }
];

function rectInertia(m, w, h) {
  return (m * (w * w + h * h)) / 12;
}

function rotate(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: c * x - s * y, y: s * x + c * y };
}

function getExtents(cx, cy, hw, hh, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ex = Math.abs(c) * hw + Math.abs(s) * hh;
  const ey = Math.abs(s) * hw + Math.abs(c) * hh;
  return { minX: cx - ex, maxX: cx + ex, minY: cy - ey, maxY: cy + ey };
}
function getExtentsCS(cx, cy, hw, hh, c, s) {
  const ex = Math.abs(c) * hw + Math.abs(s) * hh;
  const ey = Math.abs(s) * hw + Math.abs(c) * hh;
  return { minX: cx - ex, maxX: cx + ex, minY: cy - ey, maxY: cy + ey };
}

function normalizeAngle(a) {
  let x = a;
  const twoPi = Math.PI * 2;
  x = ((x + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return x;
}
function shortestAngleDelta(from, to) {
  const a = normalizeAngle(from);
  const b = normalizeAngle(to);
  let d = b - a;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export default function LandingPage() {
  const navigate = useNavigate();

  // Debug + FPS
  const [debug, setDebug] = useState(false);
  const [fps, setFps] = useState(0);
  const fpsFramesRef = useRef(0);
  const fpsElapsedRef = useRef(0);
  const fpsLastSetRef = useRef(performance.now());

  const recordFrame = (dt) => {
    fpsFramesRef.current += 1;
    fpsElapsedRef.current += dt;
    const now = performance.now();
    if (now - fpsLastSetRef.current >= FPS_UPDATE_MS) {
      const fpsVal = fpsFramesRef.current / Math.max(0.001, fpsElapsedRef.current);
      setFps(fpsVal);
      fpsFramesRef.current = 0;
      fpsElapsedRef.current = 0;
      fpsLastSetRef.current = now;
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      const key = (e.key || '').toLowerCase();
      if (key === (DEBUG_TOGGLE_KEY || 'o').toLowerCase()) {
        setDebug((d) => !d);
      }
      if (key === (RESET_SCENE_KEY || 'r').toLowerCase()) {
        // Reset the scene bodies without leaving physics mode
        setBodies(makeInitialBodies());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Viewport + container ref
  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Landing tilt (kept light)
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const targetTilt = useRef({ x: 0, y: 0 });
  const rafTilt = useRef(0);
  useEffect(() => {
    let last = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (debug) recordFrame(dt);
      setTilt((prev) => ({
        x: prev.x + (targetTilt.current.x - prev.x) * 0.12,
        y: prev.y + (targetTilt.current.y - prev.y) * 0.12
      }));
      rafTilt.current = requestAnimationFrame(animate);
    };
    rafTilt.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafTilt.current);
  }, [debug]);

  const onMouseMoveLanding = (e) => {
    const { innerWidth, innerHeight } = window;
    const y = (e.clientX - innerWidth / 2) / (innerWidth / 2);
    const x = -((e.clientY - innerHeight / 2) / (innerHeight / 2));
    targetTilt.current = { x: x * 5, y: y * 5 };
  };
  const onMouseLeaveLanding = () => {
    targetTilt.current = { x: 0, y: 0 };
  };

  // Countdown and spawn capture
  const [phase, setPhase] = useState('landing'); // landing | physics
  const [count, setCount] = useState(null);
  const landingCardRef = useRef(null);
  const [spawnCard, setSpawnCard] = useState(null); // {x,y,width,height}

  useEffect(() => {
    if (typeof count !== 'number') return;
    if (count <= 0) {
      const cardEl = landingCardRef.current;
      const contEl = containerRef.current;
      if (cardEl && contEl) {
        const r = cardEl.getBoundingClientRect();
        const cr = contEl.getBoundingClientRect();
        setSpawnCard({ x: r.left - cr.left, y: r.top - cr.top, width: r.width, height: r.height });
      }
      setPhase('physics');
      return;
    }
    const t = setTimeout(() => setCount((c) => (c ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  const startCountdown = () => {
    if (typeof count === 'number') return;
    setCount(3);
  };

  // Factory to create initial bodies (center-based positions)
  const makeInitialBodies = () => {
    const bodies = [];
    const cw = spawnCard?.width ?? Math.min(420, Math.max(300, viewport.w * 0.5));
    const ch = spawnCard?.height ?? 220;
    const cx = (spawnCard?.x ?? (viewport.w - cw) / 2) + cw / 2;
    const cy = (spawnCard?.y ?? -ch - 40) + ch / 2;
    bodies.push({
      id: 'card', type: 'card', w: cw, h: ch, m: 3,
      cx, cy, vx: 0, vy: 0, angle: 0, omega: 0,
      I: rectInertia(3, cw, ch), holding: false, ax: 0, ay: 0, outAt: null
    });
    for (const w of WORDS) {
      const ww = 120, hh = 44;
      const x0 = 80 + Math.random() * (viewport.w - 160);
      const y0 = 20 + Math.random() * 120; // spawn just inside viewport so they are visible
      bodies.push({
        id: w.id, type: 'word', label: w.label, route: w.route,
        w: ww, h: hh, m: 1,
        cx: x0 + ww / 2, cy: y0 + hh / 2,
        vx: (Math.random() - 0.5) * 200, vy: 0,
        angle: 0, omega: 0, I: rectInertia(1, ww, hh),
        holding: false, ax: 0, ay: 0, outAt: null, seen: true
      });
    }
    return bodies;
  };

  const initialBodies = useMemo(() => makeInitialBodies(), [viewport.w, viewport.h, spawnCard]);

  const [bodies, setBodies] = useState(initialBodies);
  const bodiesRef = useRef(bodies);
  useEffect(() => { bodiesRef.current = bodies; }, [bodies]);

  // Pointer tracking (id -> {px,py,prevPx,prevPy,prevT})
  const dragMapRef = useRef(new Map());
  const dragPollRef = useRef(null);

  const startPoll = () => {
    if (!dragPollRef.current) {
      dragPollRef.current = setInterval(() => {
        // polling keeps interval alive; velocities computed in physics step
      }, HOLD_POLL_MS);
    }
  };
  const stopPollIfIdle = () => {
    if (dragMapRef.current.size === 0 && dragPollRef.current) {
      clearInterval(dragPollRef.current);
      dragPollRef.current = null;
    }
  };

  const onPointerDown = (id) => (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setBodies((arr) => arr.map((b) => {
      if (b.id !== id) return b;
      // Compute local anchor relative to center at current angle
      const lx = px - b.cx;
      const ly = py - b.cy;
      // Rotate into local object space (inverse rotation)
      const c = Math.cos(-b.angle);
      const s = Math.sin(-b.angle);
      const ax = c * lx - s * ly;
      const ay = s * lx + c * ly;
      return { ...b, holding: true, ax, ay };
    }));
    dragMapRef.current.set(id, { px, py, prevPx: px, prevPy: py, prevT: performance.now() });
    e.currentTarget.setPointerCapture(e.pointerId);
    startPoll();
  };

  const onPointerMove = (id) => (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const rec = dragMapRef.current.get(id);
    if (rec) {
      dragMapRef.current.set(id, { px, py, prevPx: rec.prevPx, prevPy: rec.prevPy, prevT: rec.prevT });
    }
  };

  const onPointerUp = (id) => () => {
    setBodies((arr) => arr.map((b) => (b.id === id ? { ...b, holding: false } : b)));
    dragMapRef.current.delete(id);
    stopPollIfIdle();
  };

  // Physics loop with fixed timestep
  const runningRef = useRef(false);
  const accRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    if (phase !== 'physics') return;
    setBodies(initialBodies);
    runningRef.current = true;
    accRef.current = 0;
    lastRef.current = performance.now();

    const step = () => {
      const now = performance.now();
      let dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      if (debug) recordFrame(dt);
      dt = Math.min(dt, 0.05);
      accRef.current += dt;
      // compute pointer instantaneous velocities once per frame (store on records)
      for (const [id, rec] of dragMapRef.current) {
        const pdt = Math.max(0.001, (now - rec.prevT) / 1000);
        rec.vx = (rec.px - rec.prevPx) / pdt;
        rec.vy = (rec.py - rec.prevPy) / pdt;
        rec.prevPx = rec.px;
        rec.prevPy = rec.py;
        rec.prevT = now;
      }

      while (accRef.current >= FIXED_DT) {
        accRef.current -= FIXED_DT;
        // integrate one fixed step
        const next = bodiesRef.current.map((b) => {
          let { cx, cy, vx, vy, angle, omega, w, h, m, I } = b;
          let Fx = 0, Fy = 0, torque = 0;

          // gravity with safer upward-assist: only inside viewport and when moving up
          const zoneH = TOP_ZONE_FRAC * viewport.h;
          const c = Math.cos(angle), s = Math.sin(angle);
          const ext = getExtentsCS(cx, cy, w / 2, h / 2, c, s);
          let geff = GRAVITY; // default downward
          if (ext.minY >= 0 && ext.minY < zoneH && vy < 0) {
            const t = 1 - ext.minY / zoneH; // 1 at very top, 0 at zone boundary
            const mult = 1 + (TOP_ZONE_UPWARD_MULTIPLIER - 1) * t; // lerp 1 -> multiplier
            geff = GRAVITY * mult;
          }
          Fy += m * geff;

          // dragging spring at anchor if held
          if (b.holding && dragMapRef.current.has(b.id)) {
            const rec = dragMapRef.current.get(b.id);
            const vrec = rec || { vx: 0, vy: 0 };
            // world offset from center to anchor using precomputed cos/sin
            const awx = c * b.ax - s * b.ay;
            const awy = s * b.ax + c * b.ay;
            const axw = cx + awx;
            const ayw = cy + awy;
            const tx = rec.px;
            const ty = rec.py;
            const ex = tx - axw;
            const ey = ty - ayw;
            // velocity of anchor point: v + omega x r
            const vax = vx + (-omega) * awy;
            const vay = vy + (omega) * awx;
            const evx = (vrec.vx || 0) - vax;
            const evy = (vrec.vy || 0) - vay;
            let FxAnchor = DRAG_K * ex + DRAG_C * evx;
            let FyAnchor = DRAG_K * ey + DRAG_C * evy;
            const mag = Math.hypot(FxAnchor, FyAnchor);
            if (mag > MAX_SPRING_FORCE) {
              const s = MAX_SPRING_FORCE / mag;
              FxAnchor *= s; FyAnchor *= s;
            }
            Fx += FxAnchor; Fy += FyAnchor;
            // torque = r x F (2D)
            torque += awx * FyAnchor - awy * FxAnchor;
          }

          // integrate
          const ax = Fx / m;
          const ay = Fy / m;
          vx += ax * FIXED_DT;
          vy += ay * FIXED_DT;
          cx += vx * FIXED_DT;
          cy += vy * FIXED_DT;
          const alpha = torque / Math.max(1e-6, I);
          omega += alpha * FIXED_DT;
          angle += omega * FIXED_DT;

          // damping
          vx *= LINEAR_DAMP;
          vy *= LINEAR_DAMP;
          omega *= ANGULAR_DAMP;

          // out-of-screen top detection with seen-on-screen guard
          let outAt = b.outAt ?? null;
          let seen = b.seen ?? false;
          // compute extents for top detection (top is open)
          const ext2 = getExtentsCS(cx, cy, w / 2, h / 2, c, s);
          if (ext2.maxY >= 0) seen = true; // has been visible at least once
          if (b.type === 'word') {
            if (seen && ext2.maxY < 0) {
              if (!outAt) outAt = now;
              if (outAt && now - outAt >= 2000) {
                runningRef.current = false;
                setTimeout(() => navigate(b.route), 0);
              }
            } else {
              outAt = null;
            }
          }

          return { ...b, cx, cy, vx, vy, angle, omega, outAt, seen };
        });
        // Resolve pairwise collisions (AABB approximation with impulses)
        const collided = resolveCollisions(next);
        // Then handle borders with awareness of push direction from collisions
        const bordered = resolveBorders(collided);
        setBodies(bordered);
      }

      if (runningRef.current) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
    return () => { runningRef.current = false; };
  }, [phase, initialBodies, navigate, viewport.h, viewport.w, debug]);

  function resolveCollisions(arr) {
    const bs = arr; // mutate in place (arr is a fresh array for this frame)
    for (let iter = 0; iter < SOLVER_ITER; iter++) {
      for (let i = 0; i < bs.length; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i];
          const b = bs[j];

          // Compute overlap using rotated AABBs
          const ea = getExtents(a.cx, a.cy, a.w / 2, a.h / 2, a.angle);
          const eb = getExtents(b.cx, b.cy, b.w / 2, b.h / 2, b.angle);
          const overlapX = Math.min(ea.maxX, eb.maxX) - Math.max(ea.minX, eb.minX);
          const overlapY = Math.min(ea.maxY, eb.maxY) - Math.max(ea.minY, eb.minY);
          if (overlapX <= 0 || overlapY <= 0) continue;

          // Normal is axis of minimum penetration, oriented from a to b
          let nx = 0, ny = 0, pen = 0;
          if (overlapX < overlapY) {
            pen = overlapX;
            nx = (b.cx - a.cx) >= 0 ? 1 : -1;
            ny = 0;
          } else {
            pen = overlapY;
            ny = (b.cy - a.cy) >= 0 ? 1 : -1;
            nx = 0;
          }

          const aHeld = !!a.holding;
          const bHeld = !!b.holding;
          const invMa = aHeld ? 0 : 1 / a.m;
          const invMb = bHeld ? 0 : 1 / b.m;
          const invSum = invMa + invMb;
          if (invSum === 0) continue; // both kinematic (unlikely)

          // Positional correction with slop and bias
          // When one body is held, fully resolve penetration (no slop, full bias)
          const heldPair = aHeld || bHeld;
          const usedSlop = heldPair ? 0 : PENETRATION_SLOP;
          const usedBias = heldPair ? 1.0 : POSITION_BIAS;
          const corr = Math.max(0, pen - usedSlop) * usedBias;
          const moveA = (invMa / invSum) * corr;
          const moveB = (invMb / invSum) * corr;
          a.cx -= nx * moveA; a.cy -= ny * moveA;
          b.cx += nx * moveB; b.cy += ny * moveB;

          // Track push direction per axis for border handling
          if (nx !== 0) {
            a._pushX = (a._pushX || 0) + (-nx);
            b._pushX = (b._pushX || 0) + (nx);
          }
          if (ny !== 0) {
            a._pushY = (a._pushY || 0) + (-ny);
            b._pushY = (b._pushY || 0) + (ny);
          }

          // Relative velocity along normal
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const vrn = rvx * nx + rvy * ny;
          if (vrn < 0) {
            const j = (-(1 + COLLISION_E) * vrn) / invSum;
            const jx = j * nx, jy = j * ny;
            a.vx -= jx * invMa; a.vy -= jy * invMa;
            b.vx += jx * invMb; b.vy += jy * invMb;

            // Coulomb friction along tangent (provides rubbing drag)
            const tx = -ny, ty = nx;
            const vrt = rvx * tx + rvy * ty;
            let jt = -vrt / invSum;
            const maxFriction = Math.abs(COLLISION_FRICTION * j);
            if (jt > maxFriction) jt = maxFriction;
            if (jt < -maxFriction) jt = -maxFriction;
            const jtx = jt * tx, jty = jt * ty;
            a.vx -= jtx * invMa; a.vy -= jty * invMa;
            b.vx += jtx * invMb; b.vy += jty * invMb;

            // Mild angular damping on impact for non-held bodies
            if (!aHeld) a.omega *= 0.985;
            if (!bHeld) b.omega *= 0.985;
          }
        }
      }
    }
    return bs;
  }

  function resolveBorders(arr) {
    const bs = arr; // mutate in place
    for (const b of bs) {
      const ext = getExtents(b.cx, b.cy, b.w / 2, b.h / 2, b.angle);
      // Left wall
      if (ext.minX < 0) {
        b.cx += -ext.minX;
        const pushingIn = (b.vx < 0) || ((b._pushX || 0) < 0);
        if (pushingIn) {
          b.vx = 0;
        } else {
          b.vx = Math.abs(b.vx) * RESTITUTION;
        }
      }
      // Right wall
      if (ext.maxX > viewport.w) {
        b.cx -= (ext.maxX - viewport.w);
        const pushingIn = (b.vx > 0) || ((b._pushX || 0) > 0);
        if (pushingIn) {
          b.vx = 0;
        } else {
          b.vx = -Math.abs(b.vx) * RESTITUTION;
        }
      }
      // Bottom (ground)
      if (ext.maxY > viewport.h) {
        b.cy -= (ext.maxY - viewport.h);
        const pushingIn = (b.vy > 0) || ((b._pushY || 0) > 0);
        if (pushingIn) {
          b.vy = 0;
        } else {
          b.vy = -Math.abs(b.vy) * RESTITUTION;
        }
        b.vx *= GROUND_FRICTION;
        // Extra angular friction and uprighting toward nearest axis-aligned (0, π/2, π, 3π/2)
        if (Math.abs(b.vy) < VY_REST_THRESH) {
          // Base angular damping on ground
          b.omega *= GROUND_ANGULAR_FRICTION;
          const a = normalizeAngle(b.angle);
          // Nearest horizontal vs vertical decision with bias
          const d0 = Math.abs(shortestAngleDelta(a, 0));
          const dPi = Math.abs(shortestAngleDelta(a, Math.PI));
          const dH = Math.min(d0, dPi);
          const tH = (d0 <= dPi) ? 0 : Math.PI;
          const d90 = Math.abs(shortestAngleDelta(a, Math.PI / 2));
          const d270 = Math.abs(shortestAngleDelta(a, -Math.PI / 2));
          const dV = Math.min(d90, d270);
          const tV = (d90 <= d270) ? Math.PI / 2 : -Math.PI / 2;
          const target = (dH <= dV * Math.max(1, UPRIGHT_HORIZONTAL_BIAS)) ? tH : tV;
          const delta = shortestAngleDelta(a, target);
          // Apply non-linear spring-like torque toward target: tau = -K * sin(2*delta)
          const tau = -UPRIGHT_TORQUE_K * Math.sin(2 * delta) - UPRIGHT_TORQUE_DAMP * b.omega;
          const I = Math.max(1e-6, b.I);
          const alpha = tau / I;
          b.omega += alpha * FIXED_DT;
          // Snap when very close
          if (Math.abs(delta) < UPRIGHT_SNAP_RAD && Math.abs(b.omega) < 0.35) {
            b.angle = target;
            b.omega = 0;
          }
        } else {
          b.omega *= 0.9;
        }
      }
      // Top is open for throw-out; no clamp/bounce
      // Clear transient push markers
      delete b._pushX;
      delete b._pushY;
    }
    return bs;
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
        overflow: 'hidden'
      }}
      onMouseMove={onMouseMoveLanding}
      onMouseLeave={onMouseLeaveLanding}
    >
      {debug && (
        <Box sx={{ position: 'fixed', top: 8, left: 8, px: 1.5, py: 1, bgcolor: 'rgba(0,0,0,0.6)', color: '#9effa0', fontFamily: 'monospace', fontSize: 12, borderRadius: 1, zIndex: 2000, minWidth: 220 }}>
          <div>FPS: {fps.toFixed(0)}</div>
          <div>Poll: {HOLD_POLL_MS}ms (toggle: {DEBUG_TOGGLE_KEY})</div>
          <div>GravityY: {GRAVITY_Y}</div>
          <div>TopZone: {Math.round(TOP_ZONE_FRAC*100)}% mul {TOP_ZONE_UPWARD_MULTIPLIER}</div>
          <div>Restitution: {RESTITUTION} CollFric: {COLLISION_FRICTION}</div>
          <div>Damp L/A: {LINEAR_DAMP.toFixed(3)}/{ANGULAR_DAMP.toFixed(3)}</div>
          <div>Solver: {SOLVER_ITER} slop {PENETRATION_SLOP} bias {POSITION_BIAS}</div>
          <div>Upright k: {GROUND_UPRIGHT_STRENGTH} snap {UPRIGHT_SNAP_RAD}</div>
          <div>Upright bias: {UPRIGHT_HORIZONTAL_BIAS} torqueK {UPRIGHT_TORQUE_K} damp {UPRIGHT_TORQUE_DAMP}</div>
        </Box>
      )}

      {phase === 'landing' && (
        <Container maxWidth="sm">
          <Paper
            ref={landingCardRef}
            elevation={10}
            sx={{
              p: 6,
              textAlign: 'center',
              backdropFilter: 'blur(6px)',
              backgroundColor: 'rgba(255,255,255,0.08)',
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.1s'
            }}
          >
            <Typography variant="h3" component="h1" gutterBottom>
              Jossos World
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              A playground for new ideas. Watch this space as we build the future.
            </Typography>
            <Button variant="contained" color="primary" size="large" onClick={startCountdown}>
              {typeof count === 'number' ? `${count || 'Go!'}` : 'Explore'}
            </Button>
          </Paper>
        </Container>
      )}

      {phase === 'physics' && (
        <>
          {/* Card */}
          {bodies.filter((b) => b.type === 'card').map((b) => (
            <Paper
              key={b.id}
              elevation={6}
              sx={{
                position: 'absolute',
                left: b.cx - b.w / 2,
                top: b.cy - b.h / 2,
                width: b.w,
                height: b.h,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                backdropFilter: 'blur(6px)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                transform: `rotate(${b.angle}rad)`,
                transformOrigin: 'center'
              }}
            >
              <Typography variant="h4" component="h2" gutterBottom>
                Jossos World
              </Typography>
              <Typography variant="body2" sx={{ px: 2, mb: 2 }}>
                Pick up a word and throw it upward. If it leaves the screen for 2 seconds, you’ll enter that page.
              </Typography>
              <Button variant="contained" color="primary" size="medium" disabled>
                Explore
              </Button>
            </Paper>
          ))}

          {/* Words */}
          {bodies.filter((b) => b.type === 'word').map((w) => (
            <Box
              key={w.id}
              onPointerDown={onPointerDown(w.id)}
              onPointerMove={onPointerMove(w.id)}
              onPointerUp={onPointerUp(w.id)}
              sx={{
                position: 'absolute',
                left: w.cx - w.w / 2,
                top: w.cy - w.h / 2,
                width: w.w,
                height: w.h,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: '#000',
                fontWeight: 700,
                borderRadius: 1,
                userSelect: 'none',
                touchAction: 'none',
                boxShadow: 3,
                cursor: w.holding ? 'grabbing' : 'grab',
                transform: `rotate(${w.angle}rad)`,
                transformOrigin: 'center'
              }}
              aria-label={w.label}
            >
              {w.label}
            </Box>
          ))}

          {/* Ground indicator */}
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, bgcolor: 'rgba(255,255,255,0.08)' }} />
        </>
      )}
    </Box>
  );
}
