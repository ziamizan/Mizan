import React, { useRef, useState } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CompletionEvidenceUploadProps {
  value?: { dataUrl: string; fileName: string } | null;
  onChange: (value: { dataUrl: string; fileName: string } | null) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024; // 5MB

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        if (compressed.length > 520000) {
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else {
          resolve(compressed);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function CompletionEvidenceUpload({
  value,
  onChange,
}: CompletionEvidenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WebP images are supported.');
      return;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      setError('Image size must be 5 MB or smaller.');
      return;
    }

    setProcessing(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      onChange({ dataUrl, fileName: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process image.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Supporting Photo <span className="font-normal text-slate-500">(optional)</span>
        </span>
        <span className="text-xs text-slate-500">JPG, PNG, WebP · max 5 MB</span>
      </div>

      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <img
            src={value.dataUrl}
            alt="Supporting completion evidence"
            className="w-full max-h-48 object-cover"
          />
          <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-700">
            <span className="inline-flex items-center gap-1.5 truncate">
              <ImageIcon size={14} className="text-brand-blue shrink-0" />
              <span className="truncate">{value.fileName}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold shrink-0"
            >
              <X size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="w-full py-5 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors flex flex-col items-center gap-1.5 text-center"
        >
          <UploadCloud size={22} className="text-brand-blue" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {processing ? 'Processing image…' : 'Upload optional supporting photo'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Never required. Stored privately for verification review only.
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  );
}
