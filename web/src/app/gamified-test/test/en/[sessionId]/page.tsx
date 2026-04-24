import { redirect } from "next/navigation";

export default async function EnglishTestEntryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(`/gamified-test/test/${sessionId}?lang=en`);
}
