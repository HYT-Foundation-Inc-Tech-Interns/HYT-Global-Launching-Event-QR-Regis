import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="brand-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <img src="/hyt-global-institute.png" alt="HYT logo" className="mx-auto h-16 w-16 rounded-full object-cover" />
        <h1 className="mt-4 text-2xl font-bold text-slate-800">Administrators access</h1>
        <p className="mt-2 text-sm text-slate-600">Enter administrator password to continue.</p>
        <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Loading sign-in form...</p>}>
          <LoginForm />
        </Suspense>
        <Link href="/" className="mt-5 inline-block text-sm font-medium text-[#0C005B] hover:underline">Back to guest site</Link>
      </section>
    </main>
  );
}
