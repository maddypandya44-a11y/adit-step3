import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — Workly" }, { name: "description", content: "Log in to your free Workly account." }, { property: "og:title", content: "Log in — Workly" }, { property: "og:description", content: "Log in to your free Workly account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <AuthForm mode="login" />,
});
