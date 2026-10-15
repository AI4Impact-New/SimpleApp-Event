"use client";
import { useEffect, useState, useRef } from "react";
import { billing, money, Price, Order } from "@/services/billing";
import { errorMessage } from "@/services/learning";
const input = "rounded-lg border border-gray-300 px-3 py-2 w-full";
export default function Fees() {
  const [prices, setPrices] = useState<Price[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(""),
    [course, setCourse] = useState(""),
    [link, setLink] = useState("");
  const retry = useRef<{ signature: string; id: string } | null>(null);
  async function load() {
    const [p, o] = await Promise.all([
      billing.adminCatalog(),
      billing.orders(true),
    ]);
    setPrices(p);
    setOrders(o);
    setCourse((v) => v || p[0]?.id || "");
  }
  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, []);
  async function act(fn: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Fees & payment links</h1>
        <p className="mt-2 text-sm text-gray-600">
          Edit marked prices and discounts. Existing orders keep their original
          quoted amounts.
        </p>
      </header>
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
        Demo checkout only — Paintly integration is pending. No money is
        collected and demo completion does not enrol a student. PDFs are pro
        forma invoices, not tax invoices or proof of payment.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">
          {notice}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {prices.map((p) => (
          <form
            key={p.id}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                v = Number(f.get("price"));
              void act(async () => {
                if (
                  !Number.isFinite(v) ||
                  v < 0 ||
                  Math.abs(v * 100 - Math.round(v * 100)) > 0.00001
                )
                  throw new Error(
                    "Enter a non-negative price with at most two decimals.",
                  );
                await billing.price(
                  p.id,
                  Math.round(v * 100),
                  String(f.get("discount")),
                );
                await load();
                setNotice(
                  "Pricing saved. New orders will use the updated amount.",
                );
              });
            }}
            className="rounded-xl border bg-white p-5 space-y-3"
          >
            <h2 className="font-semibold">{p.title}</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm">
                Marked price (INR)
                <input
                  aria-label={`Marked price for ${p.title}`}
                  name="price"
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  required
                  defaultValue={p.marked_price_paise / 100}
                  className={input}
                />
              </label>
              <label className="text-sm">
                Discount (%)
                <input
                  aria-label={`Discount for ${p.title}`}
                  name="discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  defaultValue={p.discount_percentage}
                  className={input}
                />
              </label>
            </div>
            <p className="text-sm">
              Current discount: {money(p.discount_paise)} · Total:{" "}
              <strong>{money(p.total_paise)}</strong>
            </p>
            <button
              disabled={busy}
              className="rounded-lg bg-primary-600 text-white px-4 py-2 disabled:opacity-50"
            >
              Save pricing
            </button>
          </form>
        ))}
      </div>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">Create a demo pay-by-link</h2>
        <p className="text-sm text-gray-600 my-2">
          Use an existing student account email. Only that student can complete
          the demo checkout.
        </p>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const signature = course + email.trim().toLowerCase();
              if (!retry.current || retry.current.signature !== signature)
                retry.current = { signature, id: crypto.randomUUID() };
              const o = await billing.create(
                course,
                retry.current.id,
                email.trim(),
              );
              setLink(o.checkout_url);
              retry.current = null;
              await load();
              setNotice(
                "Demo link created. Copy and share it manually; no message was sent.",
              );
            });
          }}
        >
          <label className="text-sm">
            Course
            <select
              aria-label="Payment link course"
              className={input}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              {prices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Student email
            <input
              aria-label="Payment link student email"
              type="email"
              required
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !course}
            className="self-end rounded-lg bg-primary-600 text-white px-4 py-2 disabled:opacity-50"
          >
            Create demo link
          </button>
        </form>
        {link && (
          <div className="mt-4">
            <label className="text-sm">
              Demo checkout link
              <input
                aria-label="Generated demo payment link"
                readOnly
                value={link}
                className={input}
              />
            </label>
            <button
              className="mt-2 underline text-sm"
              onClick={() =>
                void act(async () => {
                  await navigator.clipboard.writeText(link);
                  setNotice("Link copied.");
                })
              }
            >
              Copy link
            </button>
          </div>
        )}
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">Demo orders & invoices</h2>
        <p className="text-sm text-gray-500 mb-3">
          Latest 200 orders. All entries are demonstrations.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">Student / course</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="p-3">
                    {o.buyer_email}
                    <br />
                    {o.course_title}
                  </td>
                  <td className="p-3">{money(o.total_paise)}</td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">
                    <button
                      disabled={busy}
                      onClick={() => void act(() => billing.invoice(o.id))}
                      className="text-primary-700 underline"
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && (
            <p className="p-4 text-gray-500">No demo orders yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
