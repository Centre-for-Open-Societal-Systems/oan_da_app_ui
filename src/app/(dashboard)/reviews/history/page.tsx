import type { Metadata } from "next";
import { ReviewHistory } from "../components/ReviewHistory";

export const metadata: Metadata = {
  title: "Review History | OpenAgriNet",
  description: "An agent's complete performance record: reviews, coaching, goals, training and recognition.",
};

export default function ReviewHistoryPage() {
  return <ReviewHistory />;
}
