import { useEffect, useRef } from 'react';

export default function Starfield({ count = 200, speed = 12, twinkle = true }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const starsRef = useRef([]);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    fit();
    const onResize = () => fit();
    window.addEventListener('resize', onResize);

    // init stars
    const initStars = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      const stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.2,
          a: Math.random() * 0.6 + 0.2,
          t: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = stars;
    };
    initStars();

    const render = () => {
      const now = performance.now();
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';

      for (const s of starsRef.current) {
        // drift down slowly
        s.y += speed * dt;
        if (s.y > h + 2) {
          s.y = -2;
          s.x = Math.random() * w;
        }
        // twinkle
        if (twinkle) {
          s.t += dt * 2;
          s.a = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(s.t + s.r));
        }
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [count, speed, twinkle]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    />
  );
}

