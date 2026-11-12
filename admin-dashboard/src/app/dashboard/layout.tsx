import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { AdminGuard } from "@/components/AdminGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1 flex-col min-h-0 sm:flex-row">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-x-clip bg-gray-50/80">
            <div
              className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
              data-dashboard-content
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
