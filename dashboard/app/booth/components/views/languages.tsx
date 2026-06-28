"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";
import ls from "./languages.module.css";

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_QUESTION =
  "How do I cancel my subscription before the next billing date?";

interface LangCard {
  lang: string;
  code: string;
  answer: string;
  dir?: "rtl" | "ltr";
}

const DEFAULT_LANGS: LangCard[] = [
  {
    lang: "English",
    code: "EN",
    answer:
      "You can cancel your subscription at any time from Settings → Billing. Your access continues until the end of the current billing period.",
  },
  {
    lang: "हिन्दी",
    code: "HI",
    answer:
      "आप अपनी सदस्यता कभी भी Settings → Billing से रद्द कर सकते हैं। आपकी वर्तमान बिलिंग अवधि समाप्त होने तक पहुँच जारी रहती है।",
  },
  {
    lang: "עברית",
    code: "HE",
    dir: "rtl",
    answer:
      "ניתן לבטל את המנוי בכל עת דרך הגדרות ← חיוב. הגישה תמשיך עד סוף תקופת החיוב הנוכחית.",
  },
  {
    lang: "Español",
    code: "ES",
    answer:
      "Puedes cancelar tu suscripción en cualquier momento desde Configuración → Facturación. El acceso continúa hasta el final del período de facturación actual.",
  },
  {
    lang: "中文",
    code: "ZH",
    answer:
      "您可以随时通过「设置 → 账单」取消订阅。您的访问权限将持续到当前计费周期结束。",
  },
  {
    lang: "Français",
    code: "FR",
    answer:
      "Vous pouvez annuler votre abonnement à tout moment depuis Paramètres → Facturation. L'accès se poursuit jusqu'à la fin de la période en cours.",
  },
  {
    lang: "Deutsch",
    code: "DE",
    answer:
      "Sie können Ihr Abonnement jederzeit über Einstellungen → Abrechnung kündigen. Der Zugang bleibt bis zum Ende des aktuellen Abrechnungszeitraums bestehen.",
  },
  {
    lang: "日本語",
    code: "JA",
    answer:
      "設定 → 請求からいつでもサブスクリプションをキャンセルできます。アクセスは現在の請求期間の終わりまで継続されます。",
  },
];

// Map incoming { lang, answer } to full LangCard, matching default if available
function buildLangCards(
  input: { lang: string; answer: string }[],
): LangCard[] {
  return input.map(({ lang, answer }) => {
    const def = DEFAULT_LANGS.find(
      (d) => d.lang.toLowerCase() === lang.toLowerCase() || d.code.toLowerCase() === lang.toLowerCase(),
    );
    return { lang: def?.lang ?? lang, code: def?.code ?? lang.slice(0, 2).toUpperCase(), answer, dir: def?.dir };
  });
}

// ─── Language card ────────────────────────────────────────────────────────────

function LangAnswerCard({
  card,
  index,
  hlClass,
}: {
  card: LangCard;
  index: number;
  hlClass: string;
}) {
  return (
    <div
      data-el="lang-card"
      className={cx(ls.langCard, hlClass)}
      style={{ animationDelay: `${index * 70}ms` }}
      lang={card.dir === "rtl" ? "he" : undefined}
      dir={card.dir}
    >
      <div className={ls.langHeader}>
        <span className={ls.langCode}>{card.code}</span>
        <span className={ls.langName}>{card.lang}</span>
      </div>
      <p className={ls.langText}>{card.answer}</p>
    </div>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function LanguagesView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const question = params?.question ?? DEFAULT_QUESTION;
  const cards: LangCard[] =
    params?.languages && params.languages.length > 0
      ? buildLangCards(params.languages)
      : DEFAULT_LANGS.slice(0, 4);

  // Show at most 8 cards in a 4-column grid (2 rows looks great on booth)
  const displayCards = cards.slice(0, 8);

  return (
    <QuillChrome active="languages" company={params?.company} highlight={highlight}>

      {/* ── Header ── */}
      <div className={s.sectionRow}>
        <div>
          <p className={s.eyebrow}>MULTILINGUAL SUPPORT</p>
          <h2 className={s.heading} style={{ marginBottom: 0 }}>Answer in any language.</h2>
        </div>
        <div
          data-el="language-count"
          className={cx(ls.langCountBadge, hl("language-count"))}
          aria-label="Quill supports 50+ languages"
        >
          <span className={ls.langCountNum}>50+</span>
          <span className={ls.langCountLabel}>languages</span>
        </div>
      </div>

      {/* ── Source question ── */}
      <div
        data-el="source-question"
        className={cx(ls.sourceQuestion, hl("source-question"))}
      >
        <p className={ls.sourceLabel}>
          <span className={ls.sourceDot} aria-hidden="true" />
          Customer question
        </p>
        <p className={ls.sourceText}>&ldquo;{question}&rdquo;</p>
      </div>

      {/* ── Language grid ── */}
      <div
        data-el="lang-grid"
        className={cx(ls.langGrid, hl("lang-grid"))}
        role="list"
        aria-label="Answers in multiple languages"
        style={{
          gridTemplateColumns:
            displayCards.length <= 2 ? "1fr 1fr" :
            displayCards.length <= 4 ? "1fr 1fr" :
            "1fr 1fr 1fr 1fr",
        }}
      >
        {displayCards.map((card, i) => (
          <LangAnswerCard
            key={`${card.lang}-${i}`}
            card={card}
            index={i}
            hlClass={hl("lang-card")}
          />
        ))}
      </div>

      {/* ── Footer stat ── */}
      <div className={ls.footerRow}>
        <div className={ls.footerStat}>
          <span className={ls.footerNum}>&lt; 80ms</span>
          <span className={ls.footerMeta}>translation latency</span>
        </div>
        <div className={ls.footerDivider} aria-hidden="true" />
        <div className={ls.footerStat}>
          <span className={ls.footerNum}>99.4%</span>
          <span className={ls.footerMeta}>accuracy vs native</span>
        </div>
        <div className={ls.footerDivider} aria-hidden="true" />
        <div className={ls.footerStat}>
          <span className={ls.footerNum}>RTL</span>
          <span className={ls.footerMeta}>Hebrew & Arabic</span>
        </div>
      </div>

    </QuillChrome>
  );
}
