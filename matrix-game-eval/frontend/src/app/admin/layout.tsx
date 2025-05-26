import { stackServerApp } from "@/stack";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if Stack Auth is configured
  const isStackAuthConfigured = 
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID && 
    process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY && 
    process.env.STACK_SECRET_SERVER_KEY;

  // Dev mode: Skip authentication if Stack Auth is not configured
  if (!isStackAuthConfigured) {
    console.warn("⚠️  Stack Auth not configured - running in DEV MODE without authentication");
    return (
      <>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Development Mode</p>
          <p className="text-sm">Authentication is disabled. Configure Stack Auth environment variables for production.</p>
        </div>
        {children}
      </>
    );
  }

  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in?redirect=/admin");
  }

  const isAdmin = user.serverMetadata?.isAdmin === true;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">You don't have admin permissions to access this page.</p>
        <div className="text-sm text-gray-500 space-y-1">
          <p>User ID: {user.id}</p>
          <p>Email: {user.primaryEmail}</p>
        </div>
        <a href="/handler/sign-out" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Sign Out
        </a>
      </div>
    );
  }

  return <>{children}</>;
}