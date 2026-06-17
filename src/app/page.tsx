import { redirect } from "next/navigation";
import { getSession, PORTAL_HOME } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(PORTAL_HOME[session.user.role]);
}
