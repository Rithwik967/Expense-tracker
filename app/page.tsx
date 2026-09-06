import { redirect } from "next/navigation";

/** The app proper starts at Home; there is no marketing page to show. */
export default function RootPage() {
  redirect("/home");
}
