"use client";

import { useEffect, useRef, useState } from "react";

const RICHI_COMPANY_CODE = "richi";
const SIGNATURE_METHOD = "finger_drawn_internal_confirmation_record_v1";

type SnapshotValue = string | string[] | boolean | null;

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
      appendSnapshotValue(fields, key, value.name ? `[file:${value.name}]` : "[file]");
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

export default function HandwrittenSignaturePad() {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const signedRef = useRef(false);
  const signatureDataUrlRef = useRef("");
  const signedAtRef = useRef("");

  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const signedAtInputRef = useRef<HTMLInputElement | null>(null);
  const snapshotInputRef = useRef<HTMLInputElement | null>(null);
  const sourceRouteInputRef = useRef<HTMLInputElement | null>(null);
  const userAgentInputRef = useRef<HTMLInputElement | null>(null);

  const [isRichi, setIsRichi] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [sourceRoute, setSourceRoute] = useState("");
  const [clientUserAgent, setClientUserAgent] = useState("");

  function syncHiddenFields() {
    if (signatureInputRef.current) {
      signatureInputRef.current.value = signatureDataUrlRef.current;
    }

    if (signedAtInputRef.current) {
      signedAtInputRef.current.value = signedAtRef.current;
    }

    if (sourceRouteInputRef.current) {
      sourceRouteInputRef.current.value = sourceRoute || `${window.location.pathname}${window.location.search}`;
    }

    if (userAgentInputRef.current) {
      userAgentInputRef.current.value = clientUserAgent || window.navigator.userAgent || "";
    }
  }

  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 320));
    const height = 180;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#0B2742";
    context.fillStyle = "#0B2742";
    context.lineWidth = 2.6;
    context.lineCap = "round";
    context.lineJoin = "round";

    canvasContextRef.current = context;
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

    setHasSignature(true);
    setErrorMessage("");
    syncHiddenFields();
  }

  function clearSignature() {
    prepareCanvas();

    signatureDataUrlRef.current = "";
    signedAtRef.current = "";
    signedRef.current = false;

    setHasSignature(false);
    setErrorMessage("");
    syncHiddenFields();
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvasContextRef.current;

    if (!context) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    drawingRef.current = true;

    context.beginPath();
    context.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
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

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
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
    const params = new URLSearchParams(window.location.search);
    const companyCode = (params.get("company") || params.get("companyCode") || "")
      .trim()
      .toLowerCase();

    const enabled = companyCode === RICHI_COMPANY_CODE;
    setIsRichi(enabled);

    if (!enabled) {
      return;
    }

    const nextSourceRoute = `${window.location.pathname}${window.location.search}`;
    const nextUserAgent = window.navigator.userAgent || "";

    setSourceRoute(nextSourceRoute);
    setClientUserAgent(nextUserAgent);
  }, []);

  useEffect(() => {
    if (!isRichi) {
      return;
    }

    prepareCanvas();
    syncHiddenFields();

    const handleResize = () => {
      if (!signedRef.current) {
        prepareCanvas();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isRichi, sourceRoute, clientUserAgent]);

  useEffect(() => {
    if (!isRichi) {
      return;
    }

    const root = rootRef.current;
    const form = root?.closest("form");

    if (!root || !form) {
      setErrorMessage("확인서명 영역을 제출 양식 안에서 불러오지 못했습니다.");
      return;
    }

    const handleSubmit = (event: SubmitEvent) => {
      const nextSourceRoute = `${window.location.pathname}${window.location.search}`;
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
        setErrorMessage("손가락으로 이름을 적어 확인서명을 남겨주세요.");
        root.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };

    form.addEventListener("submit", handleSubmit, true);

    return () => {
      form.removeEventListener("submit", handleSubmit, true);
    };
  }, [isRichi]);

  if (!isRichi) {
    return null;
  }

  return (
    <section
      ref={rootRef}
      aria-label="모바일 자필 확인서명"
      style={{
        marginTop: 18,
        marginBottom: 18,
        border: "1px solid #BFE9DC",
        background: "#F7FCFA",
        borderRadius: 20,
        padding: 16,
        boxShadow: "0 10px 28px rgba(11, 39, 66, 0.08)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "#EAF8F3",
            display: "grid",
            placeItems: "center",
            color: "#16A085",
            fontWeight: 800,
            flex: "0 0 auto",
          }}
        >
          ✓
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              color: "#0B2742",
              fontSize: 18,
              lineHeight: 1.3,
              fontWeight: 800,
            }}
          >
            모바일 자필 확인서명
          </h3>
          <p
            style={{
              margin: "6px 0 0",
              color: "#64748B",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            위 확인사항을 읽고 확인했다는 회사 내부 기록으로 남깁니다.
            아래 칸에 손가락으로 이름을 적어주세요.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 16,
          background: "#FFFFFF",
          border: errorMessage ? "2px solid #DC2626" : "1px solid #D8EEE7",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="손가락으로 확인서명을 입력하는 영역"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          style={{
            width: "100%",
            height: 180,
            display: "block",
            touchAction: "none",
            background: "#FFFFFF",
            cursor: "crosshair",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            color: hasSignature ? "#16A085" : "#64748B",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {hasSignature ? "확인서명이 입력되었습니다." : "서명 전입니다."}
        </span>

        <button
          type="button"
          onClick={clearSignature}
          style={{
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#0B2742",
            borderRadius: 999,
            padding: "9px 13px",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          다시 쓰기
        </button>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          style={{
            margin: "10px 0 0",
            color: "#B91C1C",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {errorMessage}
        </p>
      ) : null}

      <p
        style={{
          margin: "10px 0 0",
          color: "#64748B",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        이 기록은 본인인증 API나 외부 인증서 기반 기능이 아니라, QR 기반 확인 흐름에서 사용하는 내부 확인기록입니다.
      </p>

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
