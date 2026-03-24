import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ensureUserInDb } from "@/server/actions/users";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sync Clerk user to DB on every dashboard visit (fast — single SELECT)
  await ensureUserInDb();

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-[15px] leading-relaxed">
          {children}
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
