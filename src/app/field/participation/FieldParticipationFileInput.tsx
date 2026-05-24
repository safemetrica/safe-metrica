"use client";

import { useRef, useState } from "react";

type SelectedFileView = {
  name: string;
  size: number;
};

const MAX_FILES_PER_INPUT = 5;
const MAX_IMAGE_SIZE = 1600;
const IMAGE_QUALITY = 0.72;

function formatKb(size: number) {
  return `${Math.max(1, Math.round(size / 1024))}KB`;
}

function getCompressedFileName(fileName: string) {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  return `${withoutExt || "field-photo"}-compressed.jpg`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
    image.src = src;
  });
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const dataUrl = await readAsDataUrl(file);
    const image = await loadImage(dataUrl);

    const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], getCompressedFileName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

async function compressInputFiles(input: HTMLInputElement) {
  const originalFiles = Array.from(input.files ?? []).slice(0, MAX_FILES_PER_INPUT);
  const compressedFiles = await Promise.all(originalFiles.map(compressImageFile));

  try {
    const dataTransfer = new DataTransfer();
    compressedFiles.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  } catch {
    // 일부 브라우저에서 DataTransfer 대입이 막히면 원본 파일로 제출합니다.
  }

  return Array.from(input.files ?? compressedFiles).map((file) => ({
    name: file.name,
    size: file.size,
  }));
}

export default function FieldParticipationFileInput() {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraFiles, setCameraFiles] = useState<SelectedFileView[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<SelectedFileView[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  async function handleFileChange(
    input: HTMLInputElement | null,
    setFiles: (files: SelectedFileView[]) => void
  ) {
    if (!input?.files?.length) {
      setFiles([]);
      return;
    }

    setIsCompressing(true);

    try {
      const files = await compressInputFiles(input);
      setFiles(files);
    } finally {
      setIsCompressing(false);
    }
  }

  const selectedFiles = [...cameraFiles, ...galleryFiles];

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-blue-700">사진 촬영·파일 첨부</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            사진은 업로드 전에 자동으로 용량을 줄입니다. 최대 5장까지 권장합니다.
          </p>
        </div>
        <span className="w-fit rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-black text-blue-700">
          자동 압축
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-bold text-slate-700" htmlFor="cameraFiles">
            카메라로 바로 촬영
          </label>
          <input
            ref={cameraInputRef}
            id="cameraFiles"
            name="evidenceFiles"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={() => handleFileChange(cameraInputRef.current, setCameraFiles)}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700" htmlFor="galleryFiles">
            갤러리·파일에서 선택
          </label>
          <input
            ref={galleryInputRef}
            id="galleryFiles"
            name="evidenceFiles"
            type="file"
            accept="image/*"
            multiple
            onChange={() => handleFileChange(galleryInputRef.current, setGalleryFiles)}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
          />
        </div>
      </div>

      {isCompressing ? (
        <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3 text-sm font-bold text-blue-700">
          사진 용량을 줄이는 중입니다...
        </div>
      ) : null}

      {selectedFiles.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-bold text-slate-700">
            선택된 파일 {selectedFiles.length}개
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                • {file.name} ({formatKb(file.size)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-slate-500">
        위험 위치, 바닥 상태, 장비 이상, 보호구·안전조치 상태를 촬영해 첨부하세요.
      </p>
    </section>
  );
}
