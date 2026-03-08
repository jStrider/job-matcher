"use client";

import { SessionProvider } from "next-auth/react";
import { ToastContextProvider } from "@/components/use-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastContextProvider>{children}</ToastContextProvider>
    </SessionProvider>
  );
}
