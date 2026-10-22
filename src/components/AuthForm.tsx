import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/dashboard" });
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error(r.error.message ?? "Google sign-in failed"); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-10 block w-fit"><Logo /></Link>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{mode === "signup" ? "Create your free account" : "Welcome back"}</h1>
        <p className="mb-8 text-muted-foreground">{mode === "signup" ? "Full access, instantly. No card, no catch." : "Log in to continue your search."}</p>
        {sent ? (
          <div className="rounded-lg border bg-card p-5">Check <b>{email}</b> for a confirmation link, then come back and log in.</div>
        ) : (
          <>
            <Button variant="outline" className="h-11 w-full" onClick={google}>Continue with Google</Button>
            <div className="my-6 text-center text-xs uppercase text-muted-foreground">or</div>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Get Started Free" : "Log in"}</Button>
            </form>
          </>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          {mode === "signup" ? <>Have an account? <Link to="/login" className="text-primary">Log in</Link></> : <>New here? <Link to="/signup" className="text-primary">Create a free account</Link></>}
        </p>
      </div>
    </main>
  );
}
