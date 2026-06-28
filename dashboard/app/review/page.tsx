import Link from "next/link";
import { PaperBackground } from "../components/PaperBackground";
import { Wordmark } from "../components/Wordmark";
import ReviewQueue from "../ReviewQueue";
import styles from "./page.module.css";

export default function ReviewPage() {
  return (
    <main className="review-page">
      <PaperBackground />
      <header className={styles.pageHeader}>
        <Wordmark size={14} color="var(--clay)" />
        <nav>
          {/* top-nav provides the mono/clay/uppercase treatment */}
          <Link href="/" className="top-nav" style={{ marginBottom: 0 }}>
            ← Dashboard
          </Link>
        </nav>
      </header>
      <ReviewQueue />
    </main>
  );
}
