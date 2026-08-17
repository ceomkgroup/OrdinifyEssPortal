import { Suspense } from "react";
import { ResetPasswordView } from "@/components/auth/ResetPasswordView";
import { Spinner } from "@/components/ui/Spinner";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ResetPasswordView />
    </Suspense>
  );
}
