import { setRequestLocale } from "next-intl/server";
import { ReviewLiveScreen } from "@/components/screens/review-live";

export default async function ReviewPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReviewLiveScreen />;
}
