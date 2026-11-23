import { LogIn } from "lucide-react";
import { Button } from "@/components/core/Button";
import { STUDENT_PORTAL_URL } from "@/content/site";

/** Authentication lives in the shared student web/mobile application. */
export function LoginForm() {
  return (
    <div className="flex flex-col gap-(--space-5)">
      <p className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
        Open your student portal to sign in, view your courses and manage your account.
        If you received an invitation, use your email and temporary password, then choose your own password.
      </p>
      <Button variant="primary" fullWidth leadingIcon={LogIn} href={`${STUDENT_PORTAL_URL}/login`}>
        Open student portal
      </Button>
      <p className="text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
        New here? You can also create an account in the portal. Course access depends on your enrollment.
      </p>
    </div>
  );
}
