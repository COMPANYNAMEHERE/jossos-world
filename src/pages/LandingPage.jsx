import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { TOP_ZONE_FRAC, HOLD_POLL_MS, DEBUG_TOGGLE_KEY, FPS_UPDATE_MS, SPACE_MODE, STARS_COUNT, STARS_SPEED, STARS_TWINKLE, GRAVITY_Y } from '../config.js';
import { setTransferPayload } from '../lib/transfer.js';
import Starfield from '../components/Starfield.jsx';

// Physics constants (space tuned)
const GRAVITY = GRAVITY_Y; // px/s^2 (slight downward)
const RESTITUTION = 0.88; // bouncier in space
const LINEAR_DAMP = 0.998; // very low linear damping
const ANGULAR_DAMP = 0.995; // very low angular damping
const GROUND_FRICTION = 0.99; // almost no friction on ground
const MAX_SPRING_FORCE = 20000; // cap dragging force magnitude
const DRAG_K = 3000; // spring stiffness
const DRAG_C = 120; // damping
const FIXED_DT = 1 / 120; // fixed physics step

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
  const verts = [
    rotate(-hw, -hh, angle),
    rotate(hw, -hh, angle),
    rotate(hw, hh, angle),
    rotate(-hw, hh, angle)
  ];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of verts) {
    const x = cx + v.x;
    const y = cy + v.y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

// Optimized helpers using precomputed cos/sin when available
function rotateCS(x, y, c, s) {
  return { x: c * x - s * y, y: s * x + c * y };
}
function getExtentsCS(cx, cy, hw, hh, c, s) {
  const ex = Math.abs(c) * hw + Math.abs(s) * hh;
  const ey = Math.abs(s) * hw + Math.abs(c) * hh;
  return { minX: cx - ex, maxX: cx + ex, minY: cy - ey, maxY: cy + ey };
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
      if ((e.key || '').toLowerCase() === (DEBUG_TOGGLE_KEY || 'o').toLowerCase()) {
        setDebug((d) => !d);
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

  // Bodies state (center-based positions)
  const initialBodies = useMemo(() => {
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
  }, [viewport.w, viewport.h, spawnCard]);

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
      for (const [, rec] of dragMapRef.current) {
        const pdt = Math.max(0.001, (now - rec.prevT) / 1000);
        rec.vx = (rec.px - rec.prevPx) / pdt;
        rec.vy = (rec.py - rec.prevPy) / pdt;
        rec.prevPx = rec.px;
        rec.prevPy = rec.py;
        rec.prevT = now;
      }

      // clone once and mutate in place across fixed steps
      let curr = bodiesRef.current.map((b) => ({ ...b }));
      while (accRef.current >= FIXED_DT) {
        accRef.current -= FIXED_DT;
        for (let i = 0; i < curr.length; i++) {
          const b = curr[i];
          let { cx, cy, vx, vy, angle, omega, w, h, m, I } = b;
          let Fx = 0, Fy = 0, torque = 0;

          // gravity: in space mode, no upward assist; otherwise keep top-zone blend
          const zoneH = TOP_ZONE_FRAC * viewport.h;
          const c = Math.cos(angle), s = Math.sin(angle);
          const ext = getExtentsCS(cx, cy, w / 2, h / 2, c, s);
          let geff = GRAVITY; // default downward
          if (!SPACE_MODE && zoneH > 0 && ext.minY >= 0 && ext.minY < zoneH && vy < 0) {
            const t = 1 - ext.minY / Math.max(1, zoneH); // 1 at very top, 0 at boundary
            geff = GRAVITY * (1 - 2 * t);
          }
          Fy += m * geff;

          // dragging spring at anchor if held
          if (b.holding) {
            const rec = dragMapRef.current.get(b.id);
            if (rec) {
              const aw = rotateCS(b.ax, b.ay, c, s); // world offset from center to anchor
              const axw = cx + aw.x;
              const ayw = cy + aw.y;
              const ex = rec.px - axw;
              const ey = rec.py - ayw;
              // velocity of anchor point: v + omega x r
              const vax = vx + (-omega) * aw.y;
              const vay = vy + (omega) * aw.x;
              const evx = (rec.vx || 0) - vax;
              const evy = (rec.vy || 0) - vay;
              let FxAnchor = DRAG_K * ex + DRAG_C * evx;
              let FyAnchor = DRAG_K * ey + DRAG_C * evy;
              const mag = Math.hypot(FxAnchor, FyAnchor);
              if (mag > MAX_SPRING_FORCE) {
                const s = MAX_SPRING_FORCE / mag;
                FxAnchor *= s; FyAnchor *= s;
              }
              Fx += FxAnchor; Fy += FyAnchor;
              // torque = r x F (2D)
              torque += aw.x * FyAnchor - aw.y * FxAnchor;
            }
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

          // borders collision using rotated extents; open top for throw-out detection
          const ext2 = getExtentsCS(cx, cy, w / 2, h / 2, Math.cos(angle), Math.sin(angle));
          if (ext2.minX < 0) { cx += -ext2.minX; vx = Math.abs(vx) * RESTITUTION; }
          if (ext2.maxX > viewport.w) { cx -= (ext2.maxX - viewport.w); vx = -Math.abs(vx) * RESTITUTION; }
          if (ext2.maxY > viewport.h) {
            cy -= (ext2.maxY - viewport.h);
            vy = -Math.abs(vy) * RESTITUTION;
            vx *= GROUND_FRICTION;
            omega *= ANGULAR_DAMP;
          }

          // damping
          vx *= LINEAR_DAMP;
          vy *= LINEAR_DAMP;
          omega *= ANGULAR_DAMP;

          // out-of-screen top detection with seen-on-screen guard
          let outAt = b.outAt ?? null;
          let seen = b.seen ?? false;
          if (ext2.maxY >= 0) seen = true; // has been visible at least once
          if (b.type === 'word') {
            if (seen && ext2.maxY < 0) {
              if (!outAt) {
                outAt = now;
                // capture exit velocity exactly at first leave
                b.exitVx = vx;
                b.exitVy = vy;
              }
              if (outAt && now - outAt >= 2000) {
                runningRef.current = false;
                // transfer velocity/label to the next page before navigating
                try {
                  const tvx = b.exitVx ?? vx;
                  const tvy = b.exitVy ?? vy;
                  setTransferPayload({ route: b.route, id: b.id, label: b.label, vx: tvx, vy: tvy });
                } catch (_) {}
                setTimeout(() => navigate(b.route), 0);
              }
            } else {
              outAt = null;
              b.exitVx = undefined;
              b.exitVy = undefined;
            }
          }

          // write back into curr
          b.cx = cx; b.cy = cy; b.vx = vx; b.vy = vy; b.angle = angle; b.omega = omega; b.outAt = outAt; b.seen = seen;
        }
      }
      setBodies(curr);

      if (runningRef.current) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
    return () => { runningRef.current = false; };
  }, [phase, initialBodies, navigate, viewport.h, viewport.w, debug]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: SPACE_MODE ? '#030711' : 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
        overflow: 'hidden'
      }}
      onMouseMove={onMouseMoveLanding}
      onMouseLeave={onMouseLeaveLanding}
    >
      {SPACE_MODE && (
        <Starfield count={STARS_COUNT} speed={STARS_SPEED} twinkle={STARS_TWINKLE} />
      )}
      {debug && (
        <Box sx={{ position: 'fixed', top: 8, left: 8, px: 1, py: 0.5, bgcolor: 'rgba(0,0,0,0.6)', color: '#9effa0', fontFamily: 'monospace', fontSize: 12, borderRadius: 1, zIndex: 2000 }}>
          <div>FPS: {fps.toFixed(0)}</div>
          <div>Poll: {HOLD_POLL_MS}ms (toggle: {DEBUG_TOGGLE_KEY})</div>
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

          {/* Ground indicator (hidden in space mode) */}
          {!SPACE_MODE && (
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, bgcolor: 'rgba(255,255,255,0.08)' }} />
          )}
        </>
      )}
    </Box>
  );
}
