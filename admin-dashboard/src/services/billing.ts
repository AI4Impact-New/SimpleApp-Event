import api from "./api";
export interface Price {
  id: string;
  title: string;
  slug: string;
  marked_price_paise: number;
  discount_percentage: number;
  discount_paise: number;
  total_paise: number;
  currency: string;
}
export interface Order {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
  buyer_name: string;
  buyer_email: string;
  marked_price_paise: number;
  discount_bps: number;
  discount_paise: number;
  total_paise: number;
  status: "pending" | "demo_completed" | "cancelled";
  created_at: string;
  expires_at: string;
  checkout_url: string;
  demo: true;
}
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    paise / 100,
  );
export const billing = {
  catalog: () => api.learningRequest<Price[]>("GET", "/billing/catalog"),
  adminCatalog: () =>
    api.learningRequest<Price[]>("GET", "/admin/billing/courses"),
  price: (id: string, marked: number, discount: string) =>
    api.learningRequest<Price>("PUT", `/admin/billing/courses/${id}`, {
      marked_price_paise: marked,
      discount_percentage: discount,
    }),
  orders: (admin = false) =>
    api.learningRequest<Order[]>(
      "GET",
      admin ? "/admin/billing/orders" : "/me/purchases",
    ),
  create: (course_id: string, request_id: string, buyer_email?: string) =>
    api.learningRequest<Order>(
      "POST",
      buyer_email ? "/admin/billing/orders" : "/billing/orders",
      { course_id, request_id, ...(buyer_email ? { buyer_email } : {}) },
    ),
  order: (id: string) =>
    api.learningRequest<Order>("GET", `/billing/orders/${id}`),
  finish: (id: string, action: "complete_demo" | "cancel") =>
    api.learningRequest<Order>("POST", `/billing/orders/${id}/demo-checkout`, {
      action,
    }),
  async invoice(id: string) {
    const token =
      localStorage.getItem("auth_id_token") ||
      localStorage.getItem("auth_token");
    const base =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com";
    const r = await fetch(`${base}/billing/orders/${id}/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 401) {
      const studentPage = ["/student", "/checkout"].includes(
        window.location.pathname,
      );
      if (studentPage)
        sessionStorage.setItem(
          "post_login_path",
          window.location.pathname + window.location.search,
        );
      window.location.assign(studentPage ? "/login?portal=student" : "/login");
    }
    if (!r.ok)
      throw new Error(
        "Invoice could not be downloaded. Please sign in again or retry.",
      );
    const blob = await r.blob(),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `AI4Impact-demo-invoice-${id}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
