import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { LoginForm } from "@/components/admin/LoginForm";
import { Studio } from "@/components/admin/Studio";
import { ApiError, apiGet } from "@/lib/api";
import type { Me } from "@/lib/types";

export default function Admin() {
  useEffect(() => {
    document.title = "Review Studio · Admin";
  }, []);
  const me = useQuery({
    queryKey: ["me"],
    retry: false,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await apiGet<Me>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });

  return (
    <>
      {me.isPending ? (
        <div className="grid min-h-screen place-items-center bg-[#F4F2EE]">
          <Loader2 className="size-6 animate-spin text-[#A8A29E]" />
        </div>
      ) : me.data ? (
        <Studio me={me.data} />
      ) : (
        <LoginForm />
      )}
      <Toaster richColors />
    </>
  );
}
