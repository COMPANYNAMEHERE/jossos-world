import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Starfield from '../components/Starfield.jsx';
import { consumeTransferPayload } from '../lib/transfer.js';
import { SPACE_MODE, STARS_COUNT, STARS_SPEED, STARS_TWINKLE } from '../config.js';

export default function VideosPage() {
  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [spawned, setSpawned] = useState(false);
  const [obj, setObj] = useState(null); // {x,y,vx,vy,w,h}
  const [expanded, setExpanded] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Sections of screens; 2x2 grid per page
  const sections = useMemo(() => {
    return [
      [
        { id: 'orb', title: 'Orbitals', lines: ['Emergent synth loops', 'Captured in WebAudio'] },
        { id: 'neb', title: 'Nebula', lines: ['Canvas particle sim', 'Pixel bloom shader'] },
        { id: 'dock', title: 'Docking', lines: ['Easing choreography', 'GSAP timeline'] },
        { id: 'probe', title: 'Probe', lines: ['Pathfinding demo', 'UI overlays'] },
      ],
      [
        { id: 'echo', title: 'Echoes', lines: ['Audio reactive', 'Post effects'] },
        { id: 'field', title: 'Starfield', lines: ['Parallax layers', 'Canvas perf tips'] },
        { id: 'lunar', title: 'Lunar', lines: ['Tile engine', 'Pixel lighting'] },
        { id: 'comms', title: 'Comms', lines: ['WebRTC test', 'Latency graphs'] },
      ],
    ];
  }, []);

  const screens = useMemo(() => {
    const data = sections[pageIndex % sections.length];
    const w = 220, h = 140;
    const gapX = 28, gapY = 28;
    const gridW = 2 * w + gapX;
    const gridH = 2 * h + gapY;
    const originX = viewport.w / 2 - gridW / 2;
    const originY = viewport.h / 2 - gridH / 2;
    return data.map((d, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = originX + col * (w + gapX) + w / 2;
      const y = originY + row * (h + gapY) + h / 2;
      return { id: d.id, title: d.title, lines: d.lines, x, y, w, h };
    });
  }, [sections, pageIndex, viewport.w, viewport.h]);

  // Read transfer payload once on mount and schedule spawn after 1s if present
  useEffect(() => {
    const payload = consumeTransferPayload('/videos');
    if (!payload) {
      setSpawned(false);
      setObj(null);
      return;
    }
    const vx = payload.vx ?? 0;
    const vy = payload.vy ?? -180;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const timer = setTimeout(() => {
      setObj({ x: w / 2, y: h + 30, vx, vy, w: 180, h: 56 });
      setSpawned(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Animate the object in zero-gravity; collide with screens and side walls; open top to fly on
  useEffect(() => {
    if (!obj) return;
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      setObj((o) => {
        if (!o) return o;
        let { x, y, vx, vy, w, h } = o;
        // zero gravity in videos page
        x += vx * dt;
        y += vy * dt;
        // bounce side walls only
        const left = x - w / 2;
        const right = x + w / 2;
        if (left < 0) { x += -left; vx = Math.abs(vx) * 0.9; }
        if (right > viewport.w) { x -= (right - viewport.w); vx = -Math.abs(vx) * 0.9; }
        // open top/bottom: if leaves top, remove (fly on)
        const top = y - h / 2;
        if (top < -60) return null; // despawn once fully out

        // collide with static screens (AABB vs AABB)
        for (const s of screens) {
          const ax1 = x - w / 2, ax2 = x + w / 2, ay1 = y - h / 2, ay2 = y + h / 2;
          const bx1 = s.x - s.w / 2, bx2 = s.x + s.w / 2, by1 = s.y - s.h / 2, by2 = s.y + s.h / 2;
          const overlapX = Math.min(ax2, bx2) - Math.max(ax1, bx1);
          const overlapY = Math.min(ay2, by2) - Math.max(ay1, by1);
          if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
              // resolve in X
              if (x < s.x) { x -= overlapX; vx = -Math.abs(vx) * 0.95; }
              else { x += overlapX; vx = Math.abs(vx) * 0.95; }
              vy *= 0.99;
            } else {
              // resolve in Y
              if (y < s.y) { y -= overlapY; vy = -Math.abs(vy) * 0.95; }
              else { y += overlapY; vy = Math.abs(vy) * 0.95; }
              vx *= 0.99;
            }
          }
        }
        return { ...o, x, y, vx, vy };
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [obj, viewport.w, viewport.h, screens]);

  const pixelButtonSx = {
    position: 'absolute',
    left: obj ? obj.x - (obj.w / 2) : -9999,
    top: obj ? obj.y - (obj.h / 2) : -9999,
    width: obj?.w,
    height: obj?.h,
    bgcolor: '#5de4c7',
    color: '#0b141a',
    fontWeight: 800,
    fontFamily: 'monospace',
    textTransform: 'none',
    letterSpacing: 1.5,
    boxShadow: '0 0 0 2px #c2fff3, inset 0 -6px rgba(0,0,0,0.3), 0 6px #0b141a',
    borderRadius: 0,
    imageRendering: 'pixelated',
    pointerEvents: 'none', // not interactable
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        background: '#030711',
        overflow: 'hidden',
      }}
    >
      {SPACE_MODE && (
        <Starfield count={STARS_COUNT} speed={STARS_SPEED} twinkle={STARS_TWINKLE} />
      )}

      <Box sx={{ position: 'absolute', top: 16, left: 16, color: '#c2fff3', fontFamily: 'monospace' }}>
        <Typography variant="h5" sx={{ fontFamily: 'monospace', letterSpacing: 2 }}>
          Videos
        </Typography>
        {!spawned && <Typography variant="body2">Initializing docking…</Typography>}
      </Box>

      {/* Static video screens (click to enlarge) */}
      {screens.map((s) => {
        const isExpanded = expanded === s.id;
        const scale = isExpanded ? 1.6 : 1;
        const z = isExpanded ? 5 : 2;
        return (
          <Box
            key={s.id}
            onClick={() => setExpanded(isExpanded ? null : s.id)}
            sx={{
              position: 'absolute',
              left: s.x - s.w / 2,
              top: s.y - s.h / 2,
              width: s.w,
              height: s.h,
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              zIndex: z,
              cursor: 'pointer',
              bgcolor: '#0b141a',
              color: '#c2fff3',
              borderRadius: 1,
              border: '3px solid #5de4c7',
              boxShadow: '0 0 0 2px #00151a, inset 0 -10px rgba(93,228,199,0.15), 0 10px #000',
              imageRendering: 'pixelated',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', letterSpacing: 1.5, mb: 0.5 }}>
                {s.title}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.1, opacity: 0.9, fontFamily: 'monospace' }}>
                {s.lines[0]}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.1, opacity: 0.9, fontFamily: 'monospace' }}>
                {s.lines[1]}
              </Typography>
            </Box>
            {/* Faux scanlines */}
            <Box sx={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 3px)' }} />
          </Box>
        );
      })}

      {obj && (
        <Button variant="contained" size="large" sx={pixelButtonSx} disableRipple disableElevation>
          VIDEOS
        </Button>
      )}

      {/* Paging arrows */}
      {sections.length > 1 && (
        <>
          <Button
            onClick={() => setPageIndex((p) => (p - 1 + sections.length) % sections.length)}
            sx={{
              position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
              bgcolor: '#0b141a', color: '#5de4c7', border: '2px solid #5de4c7',
              boxShadow: '0 0 0 2px #00151a, 0 6px #000', borderRadius: 0, imageRendering: 'pixelated'
            }}
          >
            ◀
          </Button>
          <Button
            onClick={() => setPageIndex((p) => (p + 1) % sections.length)}
            sx={{
              position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
              bgcolor: '#0b141a', color: '#5de4c7', border: '2px solid #5de4c7',
              boxShadow: '0 0 0 2px #00151a, 0 6px #000', borderRadius: 0, imageRendering: 'pixelated'
            }}
          >
            ▶
          </Button>
        </>
      )}
    </Box>
  );
}
