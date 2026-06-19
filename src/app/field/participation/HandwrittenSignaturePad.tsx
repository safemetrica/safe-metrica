"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

const RICHI_COMPANY_CODE = "richi";
const SIGNATURE_METHOD = "finger_drawn_internal_confirmation_record_v1";
const PORTRAIT_CANVAS_HEIGHT = 196;
const LANDSCAPE_CANVAS_MIN_HEIGHT = 156;
const LANDSCAPE_CANVAS_MAX_HEIGHT = 220;

type SnapshotValue = string | string[] | boolean | null;

type HandwrittenSignaturePadProps = {
  enabled?: boolean;
};

const EXCLUDED_SNAPSHOT_KEYS = new Set([
  "handwritten_signature_data_url",
  "handwritten_signature_signed_at",
  "signature_confirmation_method",
  "signature_confirmation_label",
  "signature_confirmation_snapshot_json",
  "signature_client_source_route",
  "signature_client_user_agent",
  "signature_meta_company_code",
]);

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function appendSnapshotValue(
  snapshot: Record<string, SnapshotValue>,
  key: string,
  nextValue: string,
) {
  const currentValue = snapshot[key];

  if (currentValue === undefined) {
    snapshot[key] = nextValue;
    return;
  }

  if (Array.isArray(currentValue)) {
    snapshot[key] = [...currentValue, nextValue];
    return;
  }

  snapshot[key] = [String(currentValue), nextValue];
}

function buildFormSnapshot(form: HTMLFormElement, sourceRoute: string) {
  const formData = new FormData(form);
  const fields: Record<string, SnapshotValue> = {};

  formData.forEach((value, key) => {
    if (EXCLUDED_SNAPSHOT_KEYS.has(key)) {
      return;
    }

    if (value instanceof File) {
      appendSnapshotValue(fields, key, value.name ? "[file:" + value.name + "]" : "[file]");
      return;
    }

    appendSnapshotValue(fields, key, String(value));
  });

  return {
    schema: "richi_handwritten_confirmation_snapshot_v1",
    company_code: RICHI_COMPANY_CODE,
    captured_at: new Date().toISOString(),
    source_route: sourceRoute,
    visible_text_preview: normalizeText(form.innerText || "").slice(0, 1600),
    fields,
  };
}

function getResponsiveCanvasHeight() {
  if (typeof window === "undefined") {
    return PORTRAIT_CANVAS_HEIGHT;
  }

  const isLandscape = window.innerWidth > window.innerHeight;

  if (!isLandscape) {
    return PORTRAIT_CANVAS_HEIGHT;
  }

  return Math.min(
    LANDSCAPE_CANVAS_MAX_HEIGHT,
    Math.max(LANDSCAPE_CANVAS_MIN_HEIGHT, Math.floor(window.innerHeight * 0.48)),
  );
}

export default function HandwrittenSignaturePad({ enabled = false }: HandwrittenSignaturePadProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const signedRef = useRef(false);
  const canvasReadyRef = useRef(false);
  const signatureDataUrlRef = useRef("");
  const signedAtRef = useRef("");
  const bodyOverflowRef = useRef<string | null>(null);

  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const signedAtInputRef = useRef<HTMLInputElement | null>(null);
  const snapshotInputRef = useRef<HTMLInputElement | null>(null);
  const sourceRouteInputRef = useRef<HTMLInputElement | null>(null);
  const userAgentInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(PORTRAIT_CANVAS_HEIGHT);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState("");
  const [sourceRoute, setSourceRoute] = useState("");
  const [clientUserAgent, setClientUserAgent] = useState("");

  function lockBodyScroll() {
    if (bodyOverflowRef.current !== null) {
      return;
    }

    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function unlockBodyScroll() {
    if (bodyOverflowRef.current === null) {
      return;
    }

    document.body.style.overflow = bodyOverflowRef.current;
    bodyOverflowRef.current = null;
  }

  function syncHiddenFields() {
    if (signatureInputRef.current) {
      signatureInputRef.current.value = signatureDataUrlRef.current;
    }

    if (signedAtInputRef.current) {
      signedAtInputRef.current.value = signedAtRef.current;
    }

    if (sourceRouteInputRef.current) {
      sourceRouteInputRef.current.value = sourceRoute || window.location.pathname + window.location.search;
    }

    if (userAgentInputRef.current) {
      userAgentInputRef.current.value = clientUserAgent || window.navigator.userAgent || "";
    }
  }

  function syncOrientationState() {
    const nextIsLandscape = window.innerWidth > window.innerHeight;
    const nextHeight = getResponsiveCanvasHeight();

    setIsLandscape(nextIsLandscape);
    setCanvasHeight(nextHeight);

    return nextHeight;
  }

  function prepareCanvas() {
    const canvas = canvasRef.current;

    if (!canvas || drawingRef.current) {
      return;
    }

    const nextHeight = syncOrientationState();
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(280, Math.floor(rect.width || 320));
    const height = nextHeight;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.height = height + "px";

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#0B2742";
    context.fillStyle = "#0B2742";
    context.lineWidth = nextHeight >= PORTRAIT_CANVAS_HEIGHT ? 3.2 : 2.8;
    context.lineCap = "round";
    context.lineJoin = "round";

    canvasContextRef.current = context;
    canvasReadyRef.current = true;
    setIsCanvasReady(true);
  }

  function updateSignatureData() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    const now = new Date().toISOString();

    signatureDataUrlRef.current = dataUrl;
    signedAtRef.current = now;
    signedRef.current = true;

    setSignaturePreview(dataUrl);
    setHasSignature(true);
    setErrorMessage("");
    syncHiddenFields();
  }

  function clearSignature() {
    canvasReadyRef.current = false;
    setIsCanvasReady(false);
    prepareCanvas();

    signatureDataUrlRef.current = "";
    signedAtRef.current = "";
    signedRef.current = false;

    setSignaturePreview("");
    setHasSignature(false);
    setErrorMessage("");
    syncHiddenFields();
  }

  function openSignatureSheet() {
    setIsOpen(true);
    setErrorMessage("");
    canvasReadyRef.current = false;
    setIsCanvasReady(false);
  }

  function closeSignatureSheet() {
    setIsOpen(false);
  }

  function completeSignature() {
    if (!signedRef.current || !signatureDataUrlRef.current) {
      setErrorMessage("손가락으로 이름을 적어 확인서명을 남겨주세요.");
      return;
    }

    closeSignatureSheet();
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvasContextRef.current;

    if (!context || !canvasReadyRef.current) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    drawingRef.current = true;

    context.beginPath();
    context.arc(point.x, point.y, 1.6, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    const canvas = event.currentTarget;
    const context = canvasContextRef.current;

    if (!context) {
      return;
    }

    event.preventDefault();

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released by the browser.
    }

    updateSignatureData();
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const nextSourceRoute = window.location.pathname + window.location.search;
    const nextUserAgent = window.navigator.userAgent || "";

    setSourceRoute(nextSourceRoute);
    setClientUserAgent(nextUserAgent);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isOpen) {
      unlockBodyScroll();
      return;
    }

    lockBodyScroll();
    syncOrientationState();

    const frame = window.requestAnimationFrame(() => {
      prepareCanvas();
    });

    const handleResize = () => {
      if (drawingRef.current) {
        return;
      }

      canvasReadyRef.current = false;
      setIsCanvasReady(false);

      window.requestAnimationFrame(() => {
        prepareCanvas();
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      unlockBodyScroll();
    };
  }, [enabled, isOpen]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const root = rootRef.current;
    const form = root?.closest("form");

    if (!root || !form) {
      setErrorMessage("확인서명 영역을 제출 양식 안에서 불러오지 못했습니다.");
      return;
    }

    const handleSubmit = (event: SubmitEvent) => {
      const nextSourceRoute = window.location.pathname + window.location.search;
      const nextUserAgent = window.navigator.userAgent || "";

      if (sourceRouteInputRef.current) {
        sourceRouteInputRef.current.value = nextSourceRoute;
      }

      if (userAgentInputRef.current) {
        userAgentInputRef.current.value = nextUserAgent;
      }

      if (snapshotInputRef.current) {
        snapshotInputRef.current.value = JSON.stringify(buildFormSnapshot(form, nextSourceRoute));
      }

      syncHiddenFields();

      if (!signedRef.current || !signatureDataUrlRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setErrorMessage("확인서명을 먼저 남겨주세요.");
        openSignatureSheet();
      }
    };

    form.addEventListener("submit", handleSubmit, true);

    return () => {
      form.removeEventListener("submit", handleSubmit, true);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <section ref={rootRef} aria-label="모바일 자필 확인서명" className="my-3">
      <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-black text-emerald-600">
            ✓
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-950">필수 자필 확인서명</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              확인사항을 읽고 확인했다는 회사 내부 기록입니다.
            </p>
          </div>

          <button
            type="button"
            onClick={openSignatureSheet}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-800"
          >
            {hasSignature ? "수정" : "서명"}
          </button>
        </div>

        {hasSignature ? (
          <button
            type="button"
            onClick={openSignatureSheet}
            className="mt-3 flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2 text-left"
          >
            <div className="h-10 w-24 overflow-hidden rounded-lg border border-emerald-100 bg-white">
              {signaturePreview ? (
                <img
                  src={signaturePreview}
                  alt="입력된 확인서명 미리보기"
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700">확인서명이 입력되었습니다.</p>
              <p className="mt-0.5 text-[11px] text-slate-500">눌러서 다시 작성할 수 있습니다.</p>
            </div>
          </button>
        ) : (
          <p className="mt-2 text-xs font-bold text-red-600">
            제출 전 확인서명이 필요합니다.
          </p>
        )}

        {errorMessage ? (
          <p className="mt-2 text-xs font-black text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="확인서명 작성"
          className={[
            "fixed inset-0 z-50 flex bg-slate-950/45 px-3 py-3",
            isLandscape ? "items-center" : "items-end",
          ].join(" ")}
          style={{
            overscrollBehavior: "contain",
          }}
        >
          <div
            className="mx-auto w-full max-w-[760px] rounded-3xl bg-white p-4 shadow-2xl"
            style={{
              maxHeight: "calc(100dvh - 24px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">확인서명 작성</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  아래 흰색 칸에 손가락으로 이름을 적어주세요.
                </p>
              </div>

              <button
                type="button"
                onClick={closeSignatureSheet}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"
              >
                닫기
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-black text-blue-900">
                장갑을 착용했거나 칸이 좁으면 휴대폰을 가로로 돌려 크게 작성하세요.
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                가로 화면에서는 서명칸이 더 넓게 표시됩니다.
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <canvas
                ref={canvasRef}
                aria-label="손가락으로 확인서명을 입력하는 영역"
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onPointerLeave={stopDrawing}
                className="block w-full bg-white"
                style={{
                  height: canvasHeight,
                  touchAction: "none",
                  overscrollBehavior: "contain",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  cursor: "crosshair",
                }}
              />
            </div>

            {!isCanvasReady ? (
              <p className="mt-3 text-sm font-black text-slate-500">
                서명칸을 준비 중입니다. 잠시 후 작성해 주세요.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-3 text-sm font-black text-red-600" role="alert">
                {errorMessage}
              </p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                본인인증 API나 외부 인증서 기능이 아닌, QR 기반 내부 확인기록입니다.
              </p>
            )}

            <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <button
                type="button"
                onClick={clearSignature}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
              >
                다시 쓰기
              </button>
              <button
                type="button"
                onClick={completeSignature}
                className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
              >
                서명 완료
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <input ref={signatureInputRef} type="hidden" name="handwritten_signature_data_url" defaultValue="" />
      <input ref={signedAtInputRef} type="hidden" name="handwritten_signature_signed_at" defaultValue="" />
      <input type="hidden" name="signature_confirmation_method" value={SIGNATURE_METHOD} readOnly />
      <input type="hidden" name="signature_confirmation_label" value="모바일 자필 확인서명" readOnly />
      <input ref={snapshotInputRef} type="hidden" name="signature_confirmation_snapshot_json" defaultValue="" />
      <input ref={sourceRouteInputRef} type="hidden" name="signature_client_source_route" defaultValue="" />
      <input ref={userAgentInputRef} type="hidden" name="signature_client_user_agent" defaultValue="" />
      <input type="hidden" name="signature_meta_company_code" value={RICHI_COMPANY_CODE} readOnly />
    </section>
  );
}
