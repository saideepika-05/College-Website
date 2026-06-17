import type { Metadata } from "next";
import { PageHeader } from "@/components/kit/page-header";
import { listAcademicSessions } from "@/modules/academic/queries";
import { CreateSessionButton, SessionsTable } from "./sessions-client";

export const metadata: Metadata = { title: "Academic Sessions" };

export default async function AcademicSessionsPage() {
  const sessions = await listAcademicSessions();
  return (
    <>
      <PageHeader
        title="Academic Sessions"
        description="Yearly academic sessions — exactly one is active at a time"
        actions={<CreateSessionButton />}
      />
      <SessionsTable sessions={sessions} />
    </>
  );
}
