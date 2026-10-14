import type { Metadata } from "next";
import { CertificateVerifier } from "./verifier";

export const metadata: Metadata = { title: "Verify a certificate · AI4Impact", description: "Check an AI4Impact certificate against its official issue record." };
export default function VerifyPage() { return <CertificateVerifier />; }
