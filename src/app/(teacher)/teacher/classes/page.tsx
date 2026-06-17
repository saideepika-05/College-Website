import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/kit/empty-state";
import { PageHeader } from "@/components/kit/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTeacherScope } from "@/lib/authz";
import { YEAR_LABELS } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { listTeacherAssignments } from "@/modules/teaching/queries";

export const metadata: Metadata = { title: "My Classes" };

export default async function TeacherClassesPage() {
  const user = await requireRole("TEACHER");
  const scope = await getTeacherScope(user.id);

  const rows = scope ? await listTeacherAssignments() : [];
  const mine = rows.filter((r) => r.teacherId === scope?.teacherId);

  return (
    <>
      <PageHeader
        title="My Classes"
        description="Subjects and sections assigned to you this session"
      />
      {mine.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No classes assigned yet"
          description="Your assigned subjects and sections will appear here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-1">
                <p className="font-mono text-xs text-muted-foreground">
                  {a.subjectCode}
                </p>
                <p className="font-medium">{a.subjectName}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary">{a.sectionName}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {YEAR_LABELS[a.yearLevel]}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
