"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { billing, money, Price, Order } from "@/services/billing";
import { errorMessage } from "@/services/learning";
import { decodeJwtPayload } from "@/utils/jwt";

export function StudentCommerce({ checkout = false }: { checkout?: boolean }) {
  const params = useSearchParams(),
    selectedSlug = params?.get("course"),
    oid = checkout ? params?.get("order") : null;
  const [ready, setReady] = useState(false),
    [authenticated, setAuthenticated] = useState(false),
    [prices, setPrices] = useState<Price[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const retry = useRef<{ course: string; id: string } | null>(null);
  async function load() {
    if (checkout) {
      if (!oid) throw new Error("This payment link is missing its order ID.");
      setOrder(await billing.order(oid));
    } else {
      const [p, o] = await Promise.all([billing.catalog(), billing.orders()]);
      setPrices(
        selectedSlug
          ? [...p].sort(
              (a, b) =>
                Number(b.slug === selectedSlug) -
                Number(a.slug === selectedSlug),
            )
          : p,
      );
      setOrders(o);
    }
  }
  useEffect(() => {
    const token =
        localStorage.getItem("auth_id_token") ||
        localStorage.getItem("auth_token"),
      payload = token ? decodeJwtPayload(token) : null;
    const ok = !!payload && Number(payload.exp) * 1000 > Date.now();
    setAuthenticated(ok);
    setReady(true);
    if (ok) void load().catch((e) => setError(errorMessage(e)));
  }, [oid, checkout]); // eslint-disable-line react-hooks/exhaustive-deps
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function signIn() {
    sessionStorage.setItem(
      "post_login_path",
      checkout && oid
        ? "/checkout?order=" + encodeURIComponent(oid)
        : selectedSlug
          ? "/student?course=" + encodeURIComponent(selectedSlug)
          : "/student",
    );
    window.location.assign("/login?portal=student");
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto p-5 flex flex-wrap justify-between gap-4">
          <Link href="/student" className="font-bold text-xl">
            AI4Impact{" "}
            <span className="text-sm font-normal">Student portal</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/student">Courses & purchase history</Link>
            <Link href="/login">Admin sign in</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-5 sm:p-8 space-y-6">
        <div>
          <p className="text-sm text-primary-700 font-semibold">
            Paintly · DEMO
          </p>
          <h1 className="text-3xl font-bold mt-2">
            {checkout ? "Demo checkout" : "Courses & purchase history"}
          </h1>
        </div>
        <p className="border border-amber-300 bg-amber-50 rounded-xl p-4 text-sm">
          Checkout is a demonstration. No card or bank details are requested. No
          money is collected; completing it does not grant course access.
          Downloaded PDFs are demo/pro forma invoices, not proof of payment.
        </p>
        {error && (
          <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">
            {error}{" "}
            <button onClick={() => void act(load)} className="underline">
              Retry
            </button>
          </p>
        )}
        {!ready ? (
          <p>Loading…</p>
        ) : !authenticated ? (
          <section className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-lg">
              Sign in to your student account
            </h2>
            <p className="text-sm text-slate-600 my-3">
              Payment links and purchase history belong to your account. A link
              cannot be used to view another student’s order.
            </p>
            <button
              onClick={signIn}
              className="bg-primary-600 text-white px-5 py-3 rounded-lg"
            >
              Sign in with Cognito
            </button>
          </section>
        ) : checkout ? (
          order && (
            <section className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="text-xl font-semibold">{order.course_title}</h2>
              <p className="text-sm text-gray-500">Order {order.id}</p>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt>Marked price</dt>
                  <dd>{money(order.marked_price_paise)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Discount ({order.discount_bps / 100}%)</dt>
                  <dd>−{money(order.discount_paise)}</dd>
                </div>
                <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                  <dt>Total</dt>
                  <dd>{money(order.total_paise)}</dd>
                </div>
              </dl>
              <p className="text-sm">
                Status: <strong>{order.status}</strong> · Link expires{" "}
                {new Date(order.expires_at).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-4">
                {order.status === "pending" && (
                  <>
                    <button
                      disabled={
                        busy ||
                        new Date(order.expires_at).getTime() <= Date.now()
                      }
                      onClick={() =>
                        void act(async () => {
                          setOrder(
                            await billing.finish(order.id, "complete_demo"),
                          );
                        })
                      }
                      className="bg-primary-600 text-white px-4 py-3 rounded-lg disabled:opacity-50"
                    >
                      Complete demo — no charge
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          setOrder(await billing.finish(order.id, "cancel"));
                        })
                      }
                      className="border px-4 py-3 rounded-lg"
                    >
                      Cancel demo order
                    </button>
                  </>
                )}
                <button
                  disabled={busy}
                  onClick={() => void act(() => billing.invoice(order.id))}
                  className="underline text-primary-700"
                >
                  Download demo invoice PDF
                </button>
              </div>
              {order.status === "demo_completed" && (
                <p
                  role="status"
                  className="bg-green-50 text-green-800 p-4 rounded-lg"
                >
                  Demo completed. No payment was made. Your invoice is available
                  in purchase history.
                </p>
              )}
            </section>
          )
        ) : (
          <>
            <section>
              <h2 className="text-xl font-semibold mb-4">Courses</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {prices.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-xl border bg-white p-5 space-y-3"
                  >
                    <h3 className="font-semibold">{p.title}</h3>
                    <p>
                      {p.discount_percentage > 0 && (
                        <>
                          <del className="text-gray-500">
                            {money(p.marked_price_paise)}
                          </del>{" "}
                          <span>{p.discount_percentage}% off</span>
                          <br />
                        </>
                      )}
                      <strong className="text-xl">
                        {money(p.total_paise)}
                      </strong>
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          if (!retry.current || retry.current.course !== p.id)
                            retry.current = {
                              course: p.id,
                              id: crypto.randomUUID(),
                            };
                          const result = await billing.create(
                            p.id,
                            retry.current.id,
                          );
                          window.location.assign(
                            "/checkout?order=" + encodeURIComponent(result.id),
                          );
                        })
                      }
                      className="bg-primary-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
                    >
                      Open demo checkout
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <section className="bg-white rounded-xl border p-5">
              <h2 className="text-xl font-semibold">Purchase history — demo</h2>
              <p className="text-sm text-gray-500 my-2">
                Latest 200 orders. Pending and cancelled orders are included;
                none represent real payments.
              </p>
              {!orders.length ? (
                <p className="py-5">No orders yet.</p>
              ) : (
                <ul className="divide-y">
                  {orders.map((o) => (
                    <li
                      key={o.id}
                      className="py-4 flex flex-wrap justify-between gap-4"
                    >
                      <div>
                        <strong>{o.course_title}</strong>
                        <p className="text-sm text-gray-600">
                          {money(o.total_paise)} · {o.status} ·{" "}
                          {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-4 items-center text-sm">
                        <Link
                          className="underline"
                          href={"/checkout?order=" + o.id}
                        >
                          View order
                        </Link>
                        <button
                          className="underline text-primary-700"
                          disabled={busy}
                          onClick={() => void act(() => billing.invoice(o.id))}
                        >
                          Invoice PDF
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
