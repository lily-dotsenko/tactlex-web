import { setRequestLocale } from "next-intl/server";
import { LessonLiveScreen } from "@/components/screens/catalog-live";

export default async function LessonPage({ params }) {
  const { locale, categorySlug, lessonId } = await params;
  setRequestLocale(locale);
  return <LessonLiveScreen lessonId={lessonId} categorySlug={categorySlug} />;
}
