import { useRef, useState } from "react";
import { Upload, ImageIcon, X, RefreshCw } from "lucide-react";
import { cn } from "@/components/utils";
import { validateImageFile } from "@/adminFunctions/validation";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  onClear?: () => void;
  label?: string;
  hint?: string;
  className?: string;
  error?: string;
}

export default function ImageUploadField({
  value,
  onChange,
  onClear,
  label = "صورة المنتج",
  hint = "PNG أو JPG — حتى 5 ميغابايت",
  className,
  error,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFile = (file: File | undefined) => {
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.valid) {
      toast.error(check.message || "ملف غير صالح");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    setFileName("");
    onClear?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)} dir="rtl">
      {label && (
        <label className="text-xs font-bold text-slate-500 block text-right">{label}</label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleInput}
        aria-hidden
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "min-h-[140px] sm:min-h-[160px] flex flex-col items-center justify-center gap-3 p-4 sm:p-6",
          dragOver
            ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
            : error
              ? "border-red-300 bg-red-50/30"
              : value
                ? "border-blue-200 bg-slate-50"
                : "border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/40"
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="معاينة"
              className="absolute inset-0 w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-2 mt-auto w-full">
              {fileName && (
                <p className="text-xs font-bold text-white/90 truncate max-w-full px-2">
                  {fileName}
                </p>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/95 text-slate-800 text-xs font-bold shadow-md">
                  <RefreshCw className="h-3.5 w-3.5" />
                  تغيير الصورة
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clear();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/90 text-white text-xs font-bold shadow-md hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                  حذف
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Upload className="h-7 w-7 text-white" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-700">
                اضغط لاختيار صورة أو اسحبها هنا
              </p>
              <p className="text-xs text-slate-400 font-medium">{hint}</p>
            </div>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors">
              <ImageIcon className="h-4 w-4" />
              اختيار ملف
            </span>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 font-bold text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
