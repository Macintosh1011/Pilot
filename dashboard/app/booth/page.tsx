import type { Metadata } from "next";
import { BoothKiosk } from "./BoothKiosk";

export const metadata: Metadata = {
  title: "BoothPilot — Live Booth",
  description: "Step up and talk to the Quill booth concierge.",
};

export default function BoothPage() {
  return <BoothKiosk />;
}
