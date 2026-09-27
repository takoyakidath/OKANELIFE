import { redirect } from "next/navigation";

export default function NewIncomePage() {
  // Quick-add is a global sheet reachable from the bottom nav on every
  // page — there is no separate full-page form for the fast path.
  redirect("/");
}
