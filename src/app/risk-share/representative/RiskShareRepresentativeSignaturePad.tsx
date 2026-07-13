"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

const SIGNATURE_FIELD_NAME = "signatureFile";
const CANVAS_HEIGHT = 180;

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

type RiskShareRepresentativeSignaturePadProps = {
  title: string;
  optionalTag: string;
  hint: string;
  clearLabel: string;
};

export default function RiskShareRepresentativeSignaturePad({
  title,
  optionalTag,
  hint,
  clearLabel,
}: RiskShareRepresentativeSignaturePadProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = canvas.clientWidth || 320;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(CANVAS_HEIGHT * ratio);
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.scale(ratio, ratio);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0B2742";
    contextRef.current = context;
  }, []);

  function syncCanvasToFileInput() {
    const canvas = canvasRef.current;
    const fileInput = fileInputRef.current;
    if (!canvas || !fileInput) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], "signature.png", { type: "image/png" });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    }, "image/png");
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawingRef.current = true;
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    context.lineTo(point.x, point.y);
    context.stroke();
    hasDrawnRef.current = true;
    setHasSignature(true);
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    syncCanvasToFileInput();
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const fileInput = fileInputRef.current;

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (fileInput) {
      fileInput.value = "";
    }

    hasDrawnRef.current = false;
    setHasSignature(false);
  }

  return (
    <div ref={rootRef} className="rsx-pub-field-card rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="rsx-pub-label text-sm font-black">
          {title} <span className="rsx-pub-muted font-bold">· {optionalTag}</span>
        </p>
        {hasSignature ? (
          <button
            type="button"
            onClick={clearSignature}
            className="rsx-pub-chip rounded-full px-3 py-1 text-[0.68rem] font-black"
          >
            {clearLabel}
          </button>
        ) : null}
      </div>
      <p className="rsx-pub-muted mt-1 text-xs font-semibold leading-5">{hint}</p>

      <div className="rsx-pub-signature-frame mt-3 overflow-hidden rounded-xl">
        <canvas
          ref={canvasRef}
          className="rsx-pub-signature-canvas block w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <input ref={fileInputRef} type="file" name={SIGNATURE_FIELD_NAME} accept="image/png" className="hidden" />
    </div>
  );
}
