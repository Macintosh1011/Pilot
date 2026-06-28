import Link from "next/link";
import ReviewQueue from "../ReviewQueue";

export default function ReviewPage() {
  return (
    <main className="review-page">
      <nav className="top-nav">
        <Link href="/">← Dashboard</Link>
      </nav>
      <ReviewQueue />
    </main>
  );
}
