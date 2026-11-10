import api from "./api";
export type Installment = {
  id?: string;
  number: number;
  amount_paise: number;
  adjusted_amount_paise: number;
  due_on: string;
  paid_paise: number;
  outstanding_paise: number;
  overdue_days: number;
};
export type FeeAccount = {
  id: string;
  user_id: string;
  course_id: string;
  name: string;
  email: string;
  course_title: string;
  batch_code?: string;
  batch_start?: string;
  trainer_name?: string;
  trainer_id?: string;
  mode: "test" | "live";
  version: number;
  source_order_id?: string;
  total_paise: number;
  marked_price_paise: number;
  discount_bps: number;
  billed_on: string;
  billed_paise: number;
  paid_paise: number;
  outstanding_paise: number;
  credit_paise: number;
  overdue_paise: number;
  overdue_days: number;
  status: string;
  failed_attempts: number;
  next_due: {
    date: string;
    number: number;
    amount_paise: number;
    id: string;
  } | null;
  aging: Record<string, number>;
  installments: Installment[];
};
export type Entry = {
  id: string;
  kind: string;
  amount_paise: number;
  reference: string;
  effective_at: string;
  created_at: string;
  note: string;
};
export type Receipt = {
  id: string;
  method: string;
  amount_paise: number;
  reference: string;
  received_on: string;
  status: string;
};
export type FeeDetail = FeeAccount & {
  entries: Entry[];
  receipts: Receipt[];
  orders: {
    id: string;
    status: string;
    total_paise: number;
    provider_payment_id?: string;
    provider_order_id?: string;
  }[];
  audit: {
    action: string;
    created_at: string;
    actor_id: string;
    details: unknown;
  }[];
  as_of: string;
  emails: {
    title: string;
    created_at: string;
    status: string;
    error_code?: string;
  }[];
};
export type Batch = {
  id: string;
  course_id: string;
  code: string;
  trainer_id?: string;
  trainer_name?: string;
  starts_on: string;
};
export type LedgerReport = {
  as_of: string;
  mode: "test" | "live";
  currency: string;
  totals: Record<string, number>;
  aging: { key: string; amount_paise: number; students: number }[];
  accounts: FeeAccount[];
  courses: { id: string; title: string }[];
  batches: Batch[];
  attempts?: {
    provider_payment_id: string;
    buyer_name: string;
    buyer_email: string;
    course_title: string;
    reason: string;
    attempted_at: string;
  }[];
  attempt_count?: number;
  scope: string;
};
const base = "/admin/billing/ledger";
export const feeLedger = {
  report: (q: URLSearchParams) =>
    api.learningRequest<LedgerReport>("GET", base + "?" + q),
  detail: (id: string, asOf: string) =>
    api.learningRequest<FeeDetail>(
      "GET",
      `${base}/accounts/${id}?as_of=${encodeURIComponent(asOf)}`,
    ),
  create: (body: unknown) =>
    api.learningRequest<{ id: string }>("POST", base + "/accounts", body),
  batch: (body: unknown) =>
    api.learningRequest<{ id: string }>("POST", base + "/batches", body),
  plan: (id: string, body: unknown) =>
    api.learningRequest("PUT", `${base}/accounts/${id}/plan`, body),
  receipt: (id: string, body: unknown) =>
    api.learningRequest("POST", `${base}/accounts/${id}/receipts`, body),
  changeReceipt: (id: string, rid: string, body: unknown) =>
    api.learningRequest(
      "PATCH",
      `${base}/accounts/${id}/receipts/${rid}`,
      body,
    ),
  link: (id: string, body: unknown) =>
    api.learningRequest<{
      id: string;
      checkout_url: string;
      total_paise: number;
    }>("POST", `${base}/accounts/${id}/pay-link`, body),
  preview: (id: string, kind: string, asOf: string, fromOn: string) =>
    api.learningRequest<{
      recipient: string;
      subject: string;
      body: string;
      template: string;
      attachment: string;
    }>(
      "GET",
      `${base}/accounts/${id}/preview?kind=${kind}&as_of=${asOf}&from_on=${fromOn}`,
    ),
  email: (id: string, body: unknown) =>
    api.learningRequest("POST", `${base}/accounts/${id}/email`, body),
  async download(path: string, name: string) {
    const response = await fetch(
      (process.env.NEXT_PUBLIC_API_URL ||
        "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com") +
        base +
        path,
      {
        headers: {
          Authorization:
            "Bearer " + (localStorage.getItem("auth_id_token") || ""),
        },
      },
    );
    if (!response.ok) throw Error("Download failed. Sign in again or retry.");
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
