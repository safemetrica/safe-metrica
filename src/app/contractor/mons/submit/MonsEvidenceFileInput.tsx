"use client";

import { useMemo, useRef, useState } from "react";

const MAX_FILES = 5;
const MAX_IMAGE_EDGE = 1280;
const JPEG_QUALITY = 0.72;

type SelectedFileInfo = {
  name: string;
  sizeKb: number;
  compressed: boolean;
};

async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const imageBitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(imageBitmap.width, imageBitmap.height));
  const width = Math.max(1, Math.round(imageBitmap.width * scale));
  const height = Math.max(1, Math.round(imageBitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(imageBitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });

  if (!blob) {
    return file;
  }

  const originalName = file.name.replace(/\.[^.]+$/, "");
  const compressedName = `${originalName || "evidence"}-compressed.jpg`;

  return new File([blob], compressedName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function compressFileList(files: File[]) {
  const limitedFiles = files.slice(0, MAX_FILES);
  const compressedFiles: File[] = [];

  for (const file of limitedFiles) {
    compressedFiles.push(await compressImageFile(file));
  }

  return compressedFiles;
}

function setInputFiles(input: HTMLInputElement | null, files: File[]) {
  if (!input) return;

  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  input.files = dataTransfer.files;
}

export default function MonsEvidenceFileInput() {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [notice, setNotice] = useState("");

  const totalSizeKb = useMemo(
    () => selectedFiles.reduce((sum, file) => sum + file.sizeKb, 0),
    [selectedFiles]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsProcessing(true);
    setNotice("");

    try {
      const compressedFiles = await compressFileList(files);
      setInputFiles(input, compressedFiles);

      setSelectedFiles(
        compressedFiles.map((file, index) => ({
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          compressed: file.type === "image/jpeg" || files[index]?.type?.startsWith("image/") === true,
        }))
      );

      if (files.length > MAX_FILES) {
        setNotice(`최대 ${MAX_FILES}장까지만 첨부됩니다. 초과 파일은 제외했습니다.`);
      } else {
        setNotice("사진 용량을 줄여 제출 준비를 완료했습니다.");
      }
    } catch {
      setNotice("사진 압축 중 문제가 발생했습니다. 파일을 다시 선택해 주세요.");
      input.value = "";
      setSelectedFiles([]);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black text-cyan-200">사진 촬영·파일 첨부</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            사진은 자동으로 용량을 줄여 저장합니다. 최대 {MAX_FILES}장까지 제출하세요.
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs font-black text-cyan-200">
          자동 압축
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold text-slate-300" htmlFor="cameraEvidenceFiles">
            카메라로 바로 촬영
          </label>
          <input
            ref={cameraInputRef}
            id="cameraEvidenceFiles"
            name="evidenceFiles"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-slate-950"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300" htmlFor="galleryEvidenceFiles">
            갤러리·파일에서 선택
          </label>
          <input
            ref={galleryInputRef}
            id="galleryEvidenceFiles"
            name="evidenceFiles"
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-black file:text-slate-950"
          />
        </div>
      </div>

      {isProcessing ? (
        <div className="mt-3 rounded-xl border border-blue-400/30 bg-blue-950/30 p-3 text-xs font-bold text-blue-200">
          사진 용량을 줄이는 중입니다. 잠시만 기다려 주세요.
        </div>
      ) : null}

      {notice ? (
        <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-950/20 p-3 text-xs font-bold text-emerald-200">
          {notice}
        </div>
      ) : null}

      {selectedFiles.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
          <p className="text-xs font-bold text-slate-300">
            선택된 파일 {selectedFiles.length}개 · 약 {totalSizeKb.toLocaleString()}KB
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-400">
            {selectedFiles.map((file) => (
              <li key={`${file.name}-${file.sizeKb}`}>
                • {file.name} ({file.sizeKb.toLocaleString()}KB)
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-slate-400">
        작업 전·후 사진, 서명지, 조치사진을 첨부하세요. 큰 사진은 세메앱이 줄여서 저장합니다.
      </p>
    </div>
  );
}
