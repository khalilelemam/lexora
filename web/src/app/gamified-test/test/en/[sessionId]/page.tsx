import { redirect } from "next/navigation";

export default async function EnglishTestEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId } = await params;
  const resolved = await searchParams;
  const theme = typeof resolved.theme === "string" ? resolved.theme : "";
  const themeParam = theme ? `&theme=${theme}` : "";
  redirect(`/gamified-test/test/${sessionId}?lang=en${themeParam}`);
}
