import type { Id } from "@cvx/_generated/dataModel";
import { PaperBackground } from "../../../components/PaperBackground";
import { ConnectForm } from "./ConnectForm";

export const metadata = {
  title: "Connect · BoothPilot",
  description: "Drop your LinkedIn or email so we can follow up.",
};

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem 1rem",
      }}
    >
      <PaperBackground />
      <ConnectForm sessionId={sessionId as Id<"sessions">} />
    </main>
  );
}
