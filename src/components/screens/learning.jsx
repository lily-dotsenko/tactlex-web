// Compatibility exports for the original route-level screen names. All of
// these implementations use server APIs and never score answers in-browser.
export {
  CatalogLearnScreen as LearnScreen,
  CategoryLiveScreen as CategoryScreen,
  LessonLiveScreen as LessonScreen,
} from "@/components/screens/catalog-live";
export { ResultLiveScreen as ResultScreen } from "@/components/screens/learning-session";
export { ReviewLiveScreen as ReviewScreen } from "@/components/screens/review-live";
