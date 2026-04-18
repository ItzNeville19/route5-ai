import { redirect } from "next/navigation";

/** Legacy index — Overview dashboard lives at /overview. */
export default function ProjectsIndexRedirect() {
  redirect("/overview");
}
