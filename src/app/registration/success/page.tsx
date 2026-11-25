import type { Metadata } from "next";
import RegistrationSuccess from "@/components/registration/RegistrationSuccess";
import { REGISTRATION_PAGE } from "@/lib/cms/pages";
import { getPublishedContent } from "@/lib/cms/server";

export async function generateMetadata(): Promise<Metadata> {
  const { success } = await getPublishedContent(REGISTRATION_PAGE);
  return { title: "Expression of interest received", description: success.heading };
}

export default async function RegistrationSuccessPage() {
  const content = await getPublishedContent(REGISTRATION_PAGE);
  return <RegistrationSuccess content={content} />;
}
