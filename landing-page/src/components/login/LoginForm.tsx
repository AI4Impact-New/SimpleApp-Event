import { LogIn } from "lucide-react";
import { Button } from "@/components/core/Button";

/** Authentication lives in the shared student web/mobile application. */
export function LoginForm() {
  const portal = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL || "https://main.d26ztc5gxt79re.amplifyapp.com";
  return (
    <div className="flex flex-col gap-(--space-5)">
      <p className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
        Open your student portal to sign in, view your courses and manage your account.
        If you received an invitation, use your email and temporary password, then choose your own password.
      </p>
      <Button variant="primary" fullWidth leadingIcon={LogIn} href={portal}>
        Open student portal
      </Button>
      <p className="text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
        New here? You can also create an account in the portal. Course access depends on your enrollment.
      </p>
    </div>
  );
}
