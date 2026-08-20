import { useCallback, useRef, useState } from 'react';

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.2;

export function useCamera(initial: Camera = { x: 0, y: 0, scale: 0.85 }) {
  const [camera, setCamera] = useState<Camera>(initial);
  const dragState = useRef<{
    startX: number;
    startY: number;
    camX: number;
    camY: number;
    lastX: number;
    lastY: number;
    lastT: number;
    vx: number;
    vy: number;
  } | null>(null);
  const momentumFrame = useRef<number | null>(null);

  const stopMomentum = useCallback(() => {
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current);
      momentumFrame.current = null;
    }
  }, []);

  const onPanStart = useCallback(
    (clientX: number, clientY: number) => {
      stopMomentum();
      const now = performance.now();
      dragState.current = {
        startX: clientX,
        startY: clientY,
        camX: camera.x,
        camY: camera.y,
        lastX: clientX,
        lastY: clientY,
        lastT: now,
        vx: 0,
        vy: 0,
      };
    },
    [camera.x, camera.y, stopMomentum],
  );

  const onPanMove = useCallback((clientX: number, clientY: number) => {
    const drag = dragState.current;
    if (!drag) return;
    const now = performance.now();
    const dt = Math.max(now - drag.lastT, 1);
    drag.vx = (clientX - drag.lastX) / dt;
    drag.vy = (clientY - drag.lastY) / dt;
    drag.lastX = clientX;
    drag.lastY = clientY;
    drag.lastT = now;

    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    setCamera((c) => ({ ...c, x: drag.camX + dx, y: drag.camY + dy }));
  }, []);

  const onPanEnd = useCallback(() => {
    const drag = dragState.current;
    dragState.current = null;
    if (!drag) return;

    let vx = drag.vx * 16;
    let vy = drag.vy * 16;
    const friction = 0.92;

    const step = () => {
      vx *= friction;
      vy *= friction;
      if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) {
        momentumFrame.current = null;
        return;
      }
      setCamera((c) => ({ ...c, x: c.x + vx, y: c.y + vy }));
      momentumFrame.current = requestAnimationFrame(step);
    };
    momentumFrame.current = requestAnimationFrame(step);
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number, delta: number) => {
    setCamera((c) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, c.scale * (1 - delta * 0.0015)));
      const scaleRatio = nextScale / c.scale;
      const nextX = clientX - (clientX - c.x) * scaleRatio;
      const nextY = clientY - (clientY - c.y) * scaleRatio;
      return { x: nextX, y: nextY, scale: nextScale };
    });
  }, []);

  const zoomBy = useCallback((factor: number, centerX: number, centerY: number) => {
    setCamera((c) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, c.scale * factor));
      const scaleRatio = nextScale / c.scale;
      const nextX = centerX - (centerX - c.x) * scaleRatio;
      const nextY = centerY - (centerY - c.y) * scaleRatio;
      return { x: nextX, y: nextY, scale: nextScale };
    });
  }, []);

  const resetCamera = useCallback(
    (target: Camera = initial) => {
      stopMomentum();
      setCamera(target);
    },
    [initial, stopMomentum],
  );

  return { camera, setCamera, onPanStart, onPanMove, onPanEnd, zoomAt, zoomBy, resetCamera };
}
