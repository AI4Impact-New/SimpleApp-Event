import type { Metadata } from "next";
import { VerifyRedirect } from "./redirect";

// Verification now lives in the Professional certificate card on /certification. This route stays because
// issued certificates print a QR code to /verify?id=<credential-id>; it forwards there with the id intact.
export const metadata: Metadata = { title: "Verify a certificate · AI4Impact", robots: { index: false } };
export default function VerifyPage() { return <VerifyRedirect />; }
