import type { Id } from "@cvx/_generated/dataModel";
import DemoPageClient from "./DemoPageClient";

export const metadata = {
  title: "Acme Analytics Demo",
};

export default async function DemoPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <DemoPageClient sessionId={sessionId as Id<"sessions">} />;
}
