import type { Metadata } from "next";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = {
  title: "تواصل معنا — سهلة درج",
  description: "تواصل مع فريق سهلة درج للاستفسارات والدعم.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
