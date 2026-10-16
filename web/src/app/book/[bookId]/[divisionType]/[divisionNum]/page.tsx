import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ bookId: string; divisionType: string; divisionNum: string }>;
}

export default async function LegacyChapterRoute({ params }: PageProps) {
  const { bookId, divisionType, divisionNum } = await params;
  redirect(`/volume/1/book/${bookId}/${divisionType}/${divisionNum}`);
}
