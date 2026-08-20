import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
}

const PARTICLE_COUNT = 90;
const GRID_SPACING = 64;

/** Deep-space canvas backdrop: faint magnetic field-line grid + drifting particle dust. */
export function MagneticField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      radius: Math.random() * 1.6 + 0.4,
      hue: Math.random() > 0.5 ? 190 : 300,
    }));

    let raf = 0;
    let t = 0;

    const draw = () => {
      t += 0.004;
      ctx.clearRect(0, 0, width, height);

      // magnetic field-line grid, gently warped by a sine wave
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.055)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width + GRID_SPACING; gx += GRID_SPACING) {
        ctx.beginPath();
        for (let gy = 0; gy <= height; gy += 20) {
          const warp = Math.sin(gy * 0.01 + t + gx * 0.002) * 6;
          if (gy === 0) ctx.moveTo(gx + warp, gy);
          else ctx.lineTo(gx + warp, gy);
        }
        ctx.stroke();
      }
      for (let gy = 0; gy < height + GRID_SPACING; gy += GRID_SPACING) {
        ctx.beginPath();
        for (let gx = 0; gx <= width; gx += 20) {
          const warp = Math.sin(gx * 0.01 + t + gy * 0.002) * 6;
          if (gx === 0) ctx.moveTo(gx, gy + warp);
          else ctx.lineTo(gx, gy + warp);
        }
        ctx.stroke();
      }
      ctx.restore();

      // particle dust
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 6);
        glow.addColorStop(0, `hsla(${p.hue}, 90%, 70%, 0.5)`);
        glow.addColorStop(1, `hsla(${p.hue}, 90%, 70%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${p.hue}, 90%, 85%, 0.8)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.06), transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(232,121,249,0.05), transparent 55%), #09090b',
      }}
    />
  );
}
