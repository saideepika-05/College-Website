import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { requireRole } from "@/lib/session";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scan Attendance" };

export default async function ScanPage() {
  await requireRole("STUDENT");
  return (
    <>
      <PageHeader
        title="Scan attendance"
        description="Point your camera at the QR code on the class screen"
      />
      <Scanner />
    </>
  );
}
