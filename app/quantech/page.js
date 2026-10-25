import { redirect } from "next/navigation";

export const metadata = {
  title: "Quantech — A school system that works like an Organiser",
  description: "Admissions, automated fee collection, marksheet generation, and parent WhatsApp updates. Built for modern schools.",
};

export default function QuantechPage() {
  redirect("/landing.html");
}
