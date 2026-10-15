"use client";
import { useEffect, useState } from "react";
type Price = {
  slug: string;
  total_paise: number;
  marked_price_paise: number;
  discount_percentage: number;
};
let request: Promise<Price[]> | undefined;
export function LivePrice({
  slug,
  initial,
}: {
  slug: string;
  initial: string;
}) {
  const [price, setPrice] = useState<Price | null>(null);
  useEffect(() => {
    request ??= fetch(
      (process.env.NEXT_PUBLIC_API_URL ||
        "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com") +
        "/billing/catalog",
    ).then((r) => {
      if (!r.ok) throw new Error("Pricing unavailable");
      return r.json();
    });
    void request
      .then((rows) => setPrice(rows.find((p) => p.slug === slug) || null))
      .catch(() => {
        request = undefined;
      });
  }, [slug]);
  const format = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(v / 100);
  return (
    <span>
      {price ? format(price.total_paise) : initial}
      {price && price.discount_percentage > 0 && (
        <span className="ml-2 text-sm font-normal">
          ({price.discount_percentage}% off)
        </span>
      )}
    </span>
  );
}
