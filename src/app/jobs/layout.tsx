import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes offres",
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
