import { redirect } from "next/navigation";

export default function WorkerHomePage() {
  redirect("/home?role=worker");
}
