import { Suspense } from "react";
import { ResetPasswordView } from "@/components/auth/ResetPasswordView";
import { FullScreenLoader } from "@/components/ui/Spinner";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <FullScreenLoader label="Loading" hint="Preparing password reset…" />
      }
    >
      <ResetPasswordView />
    </Suspense>
  );
}
