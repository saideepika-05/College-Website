/* eslint-disable no-console */
/**
 * Development/demo seed. Run with: pnpm db:seed
 * Idempotent: refuses to run if an admin user already exists.
 *
 * Demo logins (password for ALL: Passw0rd!):
 *   admin@college.edu    — Admin
 *   hod.cse@college.edu  — HOD (CSE)
 *   rao@college.edu      — Teacher
 *   meera@college.edu    — Teacher
 *   cse26001@college.edu … cse26012@college.edu — Students (CSE-2A)
 */
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import {
  academicSessions,
  account,
  assignments,
  assignmentTargets,
  branches,
  departments,
  enrollments,
  hodAssignments,
  notices,
  sections,
  students,
  subjects,
  teacherAssignments,
  teachers,
  timetableEntries,
  user,
} from "@/db/schema";

const PASSWORD = "Passw0rd!";

async function createUser(
  name: string,
  email: string,
  role: "ADMIN" | "HOD" | "TEACHER" | "STUDENT",
  passwordHash: string,
) {
  const id = uuidv7();
  await db.insert(user).values({
    id,
    name,
    email,
    emailVerified: true,
    role,
    isActive: true,
  });
  await db.insert(account).values({
    id: uuidv7(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: passwordHash,
  });
  return id;
}

async function main() {
  const [existingAdmin] = await db
    .select()
    .from(user)
    .where(eq(user.role, "ADMIN"))
    .limit(1);
  if (existingAdmin) {
    console.log("Seed skipped: an admin user already exists.");
    process.exit(0);
  }

  console.log("Seeding…");
  const passwordHash = await hashPassword(PASSWORD);

  // Admin
  await createUser("Institution Admin", "admin@college.edu", "ADMIN", passwordHash);

  // Branch + departments
  const [hyd] = await db
    .insert(branches)
    .values({ name: "Hyderabad Branch", code: "HYD", address: "Gachibowli, Hyderabad" })
    .returning();
  const [cse] = await db
    .insert(departments)
    .values({ name: "Computer Science", code: "CSE", branchId: hyd!.id })
    .returning();
  const [ece] = await db
    .insert(departments)
    .values({ name: "Electronics", code: "ECE", branchId: hyd!.id })
    .returning();

  // Academic session (active)
  const [session] = await db
    .insert(academicSessions)
    .values({
      label: "2026-2027",
      startDate: "2026-06-01",
      endDate: "2027-04-30",
      isActive: true,
    })
    .returning();

  // Sections
  const [cse1a] = await db
    .insert(sections)
    .values({
      name: "CSE-1A",
      departmentId: cse!.id,
      yearLevel: "YEAR_1",
      academicSessionId: session!.id,
    })
    .returning();
  const [cse2a] = await db
    .insert(sections)
    .values({
      name: "CSE-2A",
      departmentId: cse!.id,
      yearLevel: "YEAR_2",
      academicSessionId: session!.id,
    })
    .returning();
  await db.insert(sections).values({
    name: "ECE-1A",
    departmentId: ece!.id,
    yearLevel: "YEAR_1",
    academicSessionId: session!.id,
  });

  // Subjects
  const [maths] = await db
    .insert(subjects)
    .values({
      name: "Mathematics-I",
      code: "MA101",
      departmentId: cse!.id,
      yearLevel: "YEAR_1",
    })
    .returning();
  const [ds] = await db
    .insert(subjects)
    .values({
      name: "Data Structures",
      code: "CS201",
      departmentId: cse!.id,
      yearLevel: "YEAR_2",
    })
    .returning();
  const [dbms] = await db
    .insert(subjects)
    .values({
      name: "Database Management Systems",
      code: "CS202",
      departmentId: cse!.id,
      yearLevel: "YEAR_2",
    })
    .returning();

  // HOD
  const hodUserId = await createUser(
    "Dr. Lakshmi Devi",
    "hod.cse@college.edu",
    "HOD",
    passwordHash,
  );
  await db
    .insert(hodAssignments)
    .values({ userId: hodUserId, departmentId: cse!.id });

  // Teachers
  const raoUserId = await createUser(
    "Prof. Rao",
    "rao@college.edu",
    "TEACHER",
    passwordHash,
  );
  const [rao] = await db
    .insert(teachers)
    .values({ userId: raoUserId, departmentId: cse!.id })
    .returning();
  const meeraUserId = await createUser(
    "Prof. Meera",
    "meera@college.edu",
    "TEACHER",
    passwordHash,
  );
  const [meera] = await db
    .insert(teachers)
    .values({ userId: meeraUserId, departmentId: cse!.id })
    .returning();

  // Teacher assignments
  await db.insert(teacherAssignments).values([
    {
      teacherId: rao!.id,
      subjectId: ds!.id,
      sectionId: cse2a!.id,
      academicSessionId: session!.id,
    },
    {
      teacherId: rao!.id,
      subjectId: maths!.id,
      sectionId: cse1a!.id,
      academicSessionId: session!.id,
    },
    {
      teacherId: meera!.id,
      subjectId: dbms!.id,
      sectionId: cse2a!.id,
      academicSessionId: session!.id,
    },
  ]);

  // Timetable: Mon–Fri, periods 1-2 for CSE-2A
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
  for (const day of days) {
    await db.insert(timetableEntries).values([
      {
        academicSessionId: session!.id,
        sectionId: cse2a!.id,
        subjectId: ds!.id,
        teacherId: rao!.id,
        dayOfWeek: day,
        periodNo: 1,
        startTime: "09:00",
        endTime: "10:00",
      },
      {
        academicSessionId: session!.id,
        sectionId: cse2a!.id,
        subjectId: dbms!.id,
        teacherId: meera!.id,
        dayOfWeek: day,
        periodNo: 2,
        startTime: "10:00",
        endTime: "11:00",
      },
    ]);
  }

  // Students enrolled in CSE-2A
  for (let i = 1; i <= 12; i++) {
    const roll = `CSE26${String(i).padStart(3, "0")}`;
    const userId = await createUser(
      `Student ${roll}`,
      `${roll.toLowerCase()}@college.edu`,
      "STUDENT",
      passwordHash,
    );
    const [student] = await db
      .insert(students)
      .values({ userId, rollNumber: roll, departmentId: cse!.id })
      .returning();
    await db.insert(enrollments).values({
      studentId: student!.id,
      academicSessionId: session!.id,
      sectionId: cse2a!.id,
      yearLevel: "YEAR_2",
      status: "ACTIVE",
    });
  }

  // Sample assignment + notice
  const [assignment] = await db
    .insert(assignments)
    .values({
      title: "Linked List Exercises",
      description: "Solve problems 1–10 from the worksheet. Submit on paper in class.",
      subjectId: ds!.id,
      academicSessionId: session!.id,
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      createdById: raoUserId,
    })
    .returning();
  await db
    .insert(assignmentTargets)
    .values({ assignmentId: assignment!.id, sectionId: cse2a!.id });

  await db.insert(notices).values({
    title: "Welcome to the 2026-2027 academic session",
    body: "Classes begin June 15th. Check your timetable in the portal.",
    type: "INSTITUTION",
    createdById: (
      await db.select({ id: user.id }).from(user).where(eq(user.role, "ADMIN"))
    )[0]!.id,
  });

  console.log("Seed complete.");
  console.log(`All demo accounts use password: ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
