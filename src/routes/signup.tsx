import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Get started free — Workly" }, { name: "description", content: "Create a free Workly account with full access." }, { property: "og:title", content: "Get started free — Workly" }, { property: "og:description", content: "Create a free Workly account with full access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <AuthForm mode="signup" />,
});
