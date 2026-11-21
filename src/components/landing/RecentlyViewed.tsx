"use client";

import { useTranslations } from "next-intl";
import { logosFor, StatusText, TitleRow } from "@/components/search/TitleRow";
import { useRowStatus } from "@/components/search/useRowStatus";
import { titleUrl } from "@/lib/search/query";
import { RECENT_SHOWN, type RecentTitle } from "@/lib/storage/recent";

/** The last five titles opened on this device. The status line is loaded fresh. */
export function RecentlyViewed({ titles }: { titles: readonly RecentTitle[] }) {
  const t = useTranslations();
  const shown = titles.slice(0, RECENT_SHOWN);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="landing-label">{t("search.recent")}</h2>
      {shown.length === 0 ? (
        <p className="text-body text-text-muted">{t("landing.recentEmpty")}</p>
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {shown.map((title) => (
            <li key={`${title.kind}-${title.id}`}>
              <RecentHit title={title} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentHit({ title }: { title: RecentTitle }) {
  const status = useRowStatus(title.kind, title.id);

  return (
    <TitleRow
      density="card"
      href={titleUrl(title.kind, title.id, title.title)}
      title={title.title}
      year={title.year}
      kind={title.kind}
      posterPath={title.posterPath}
      status={
        <StatusText
          phase={status.phase}
          line={status.line}
          services={status.services}
        />
      }
      logos={logosFor(status.line, status.services)}
      rowRef={status.ref}
    />
  );
}
