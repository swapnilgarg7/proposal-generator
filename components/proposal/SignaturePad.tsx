"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface StrokePoint {
  x: number;
  y: number;
  /** Milliseconds since the first point of the signature. */
  t: number;
  /** Pointer pressure where the device reports it, else 0. */
  p: number;
}

export type Stroke = StrokePoint[];

/**
 * Canvas signature capture.
 *
 * Records raw stroke points with timestamps and pressure alongside the rendered
 * PNG. Stroke dynamics — speed, rhythm, pen-lifts — are far more probative than
 * a flat image if a signature is ever disputed, and they cost a few KB.
 */
export function SignaturePad({
  onChange,
  disabled = false,
}: {
  onChange: (result: { dataUrl: string | null; strokes: Stroke[] }) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const startedAtRef = useRef<number>(0);
  const [hasInk, setHasInk] = useState(false);

  // Redraw at device pixel ratio, otherwise the signature is a blurry mess on
  // exactly the phones clients will sign on.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
  }, []);

  useEffect(() => {
    setupCanvas();
    const onResize = () => {
      setupCanvas();
      redraw();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCanvas]);

  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const stroke of strokesRef.current) {
      ctx.beginPath();
      stroke.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }
  }

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ink = strokesRef.current.some((s) => s.length > 1);
    setHasInk(ink);
    onChange({
      dataUrl: ink ? canvas.toDataURL("image/png") : null,
      strokes: strokesRef.current,
    });
  }

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>): StrokePoint {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: startedAtRef.current ? Math.round(performance.now() - startedAtRef.current) : 0,
      p: Math.round((e.pressure ?? 0) * 100) / 100,
    };
  }

  function handleDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!startedAtRef.current) startedAtRef.current = performance.now();
    currentRef.current = [pointFrom(e)];
    strokesRef.current.push(currentRef.current);
  }

  function handleMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !currentRef.current) return;
    const pt = pointFrom(e);
    const stroke = currentRef.current;
    const prev = stroke[stroke.length - 1];
    // Skip sub-pixel jitter so stroke data stays meaningful rather than huge.
    if (prev && Math.hypot(pt.x - prev.x, pt.y - prev.y) < 1) return;
    stroke.push(pt);

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  }

  function handleUp() {
    if (!currentRef.current) return;
    currentRef.current = null;
    emit();
  }

  function clear() {
    strokesRef.current = [];
    currentRef.current = null;
    startedAtRef.current = 0;
    redraw();
    emit();
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-[var(--doc-border-strong)] bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          onPointerCancel={handleUp}
          className="block h-40 w-full touch-none"
          style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
          aria-label="Signature area. Draw your signature here."
        />
        {!hasInk ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-black/30">
            Draw your signature
          </span>
        ) : null}
        {/* Signing line, so the box reads as somewhere to sign. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 bottom-8 border-b border-black/15"
        />
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasInk}
          className="text-[0.8125rem] text-[var(--doc-fg-subtle)] transition-colors hover:text-[var(--doc-fg)] disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/**
 * Renders a typed name as a signature image, so both methods produce the same
 * artifact for the sealed PDF.
 */
export function renderTypedSignature(name: string): string | null {
  if (!name.trim()) return null;

  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  const width = 520;
  const height = 140;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111111";
  ctx.font = 'italic 46px "Segoe Script", "Bradley Hand", "Snell Roundhand", cursive';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(name.trim(), width / 2, height / 2, width - 40);

  return canvas.toDataURL("image/png");
}
