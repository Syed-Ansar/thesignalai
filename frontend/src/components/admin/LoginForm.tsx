import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { errorDetail } from "@/lib/errors";
import { beginSession } from "@/lib/session";
import type { Me } from "@/lib/types";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => apiPost<Me>("/auth/login", { email, password }),
    onSuccess: () => {
      // beginSession wipes the cache (orphaning the mounted ["me"] observer), so reload into the studio.
      beginSession();
      window.location.assign("/admin");
    },
  });

  return (
    <div className="grid min-h-screen bg-[#F4F2EE] lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-[#1C1917] p-12 text-[#FAF8F5] lg:flex">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-[#FBBF24]" /> Review Studio
        </div>
        <div>
          <p className="font-heading text-[40px] leading-[1.1] tracking-[-0.02em]">Happy guests on Google.<br />Unhappy ones, straight to you.</p>
          <p className="mt-4 max-w-md text-[15px] text-[#D6D3D1]">Menus, themes, review logs and private complaints for every outlet, in one calm workspace.</p>
        </div>
        <p className="text-xs text-[#A8A29E]">Owner logins are created by your platform admin.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form
          data-testid="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate();
          }}
          className="w-full max-w-[380px] rounded-2xl border border-[#E7E2DA] bg-white p-7 shadow-sm"
        >
          <h1 className="text-xl font-semibold text-[#1C1917]">Sign in to the studio</h1>
          <p className="mt-1 text-sm text-[#78716C]">Use the email and password you were given.</p>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" data-testid="login-email-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" data-testid="login-password-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          {login.isError && (
            <p data-testid="login-error" className="mt-4 rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
              {errorDetail(login.error, "Couldn't sign in")}
            </p>
          )}
          <Button data-testid="login-submit-button" type="submit" disabled={login.isPending} className="mt-6 h-11 w-full bg-[#EA580C] text-[15px] hover:bg-[#C2410C]">
            {login.isPending ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
