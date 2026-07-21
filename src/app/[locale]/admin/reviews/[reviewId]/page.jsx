import { setRequestLocale } from "next-intl/server";
import { AdminReviewScreen } from "@/components/screens/admin";
export default async function Page({ params }) {
  const { locale, reviewId } = await params;
  setRequestLocale(locale);
  return <AdminReviewScreen reviewId={reviewId} />;
}
