"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

const SIGNATURE_FIELD_NAME = "signatureFile";
const CANVAS_HEIGHT = 180;

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

export default function RiskShareRepresentativeSignaturePad() {
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
    <div ref={rootRef} className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-800">
          모바일 서명 <span className="font-bold text-slate-400">· 선택</span>
        </p>
        {hasSignature ? (
          <button
            type="button"
            onClick={clearSignature}
            className="rounded-full bg-slate-100 px-3 py-1 text-[0.68rem] font-black text-slate-600"
          >
            서명 지우기
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        원하시면 아래 칸에 손가락으로 서명을 남길 수 있습니다. 서명이 없어도 제출할 수 있습니다.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none bg-white"
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
