import { Suspense } from "react";
import { StudentCommerce } from "@/components/StudentCommerce";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading demo checkout…</p>}>
      <StudentCommerce checkout />
    </Suspense>
  );
}
