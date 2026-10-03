import { Suspense } from "react";
import { LoginPageContent } from "@/components/login-page-content";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-[#757575]">
      <p className="text-sm">Loading…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
