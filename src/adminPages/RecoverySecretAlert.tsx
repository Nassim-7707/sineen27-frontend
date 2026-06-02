import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  ADMIN_RECOVERY_QUESTION,
  ADMIN_RECOVERY_QUESTION_HINT,
} from "@/adminFunctions/auth";

export default function RecoverySecretAlert() {
  return (
    <div
      className="mb-4 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4 sm:p-5 shadow-sm"
      role="alert"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-black text-destructive">
            تنبيه: لم تُضبط كلمة استرداد الحساب
          </p>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            اختر كلمة سرية لا يعرفها أحد غيرك (ليست لقباً عائلياً). إذا نسيت كلمة
            المرور وليس لديكها، <strong>لن تستطيع الدخول</strong> على هذا الجهاز.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">السؤال: </span>
            {ADMIN_RECOVERY_QUESTION}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {ADMIN_RECOVERY_QUESTION_HINT}
          </p>
          <Link
            to="/dashboard#settings"
            className="inline-flex items-center gap-2 mt-1 text-xs sm:text-sm font-bold text-accent hover:underline"
          >
            <ShieldCheck className="h-4 w-4" />
            اضبط رمز الاسترداد من الإعدادات
          </Link>
        </div>
      </div>
    </div>
  );
}
