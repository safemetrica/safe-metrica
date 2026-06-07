import { redirect } from "next/navigation";

export default function CeoHomePage() {
  redirect("/home?role=ceo");
}
