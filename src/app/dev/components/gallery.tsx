"use client";

import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Disclosure } from "@/components/ui/Disclosure";
import { ImportIcon, SearchIcon, SettingsIcon } from "@/components/ui/icons";
import { NavItem } from "@/components/ui/NavItem";
import { Poster } from "@/components/ui/Poster";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { useToast } from "@/components/ui/Toast";
import { TitleLoading } from "@/components/title/TitleLoading";

/** Living style page. Not linked, and not rendered in production. */
export function Gallery() {
  const t = useTranslations();
  const format = useFormatter();
  const { showToast } = useToast();
  const [pressed, setPressed] = useState(false);
  const [segment, setSegment] = useState<"service" | "country">("service");

  return (
    <div className="flex flex-col gap-8 pb-16">
      <h1 className="text-heading">{t("dev.title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.button")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<ImportIcon />}>{t("dev.buttonLabel")}</Button>
          <Button variant="secondary" icon={<ImportIcon />}>
            {t("dev.buttonLabel")}
          </Button>
          <Button size="small">{t("dev.buttonLabel")}</Button>
          <Button variant="secondary" size="small">
            {t("dev.buttonLabel")}
          </Button>
          <Button disabled>{t("dev.buttonLabel")}</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.navItem")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <NavItem
            href="/watchlist"
            icon={<ImportIcon />}
            label={t("header.importWatchlist")}
          />
          <NavItem
            href="/settings"
            icon={<SettingsIcon />}
            label={t("header.settings")}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.tooltip")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <NavItem
            iconOnly
            icon={<SearchIcon />}
            label={t("header.search")}
            onClick={() => undefined}
          />
          <NavItem
            iconOnly
            tooltipAlign="end"
            icon={<SettingsIcon />}
            label={t("header.settings")}
            onClick={() => undefined}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.chip")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Chip
            pressed={pressed}
            onPressedChange={setPressed}
            count={format.number(12)}
          >
            {t("dev.chipLabel")}
          </Chip>
          <Chip pressed={false} onPressedChange={() => undefined} disabled>
            {t("dev.chipLabel")}
          </Chip>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.toggle")}</h2>
        <SegmentedToggle
          label={t("toggle.group")}
          value={segment}
          onValueChange={setSegment}
          serviceLabel={t("toggle.service")}
          countryLabel={t("toggle.country")}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.card")}</h2>
        <Card>
          <p>{t("dev.cardBody")}</p>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.skeleton")}</h2>
        <Skeleton />
        <Skeleton className="h-10 w-24" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.serviceLogo")}</h2>
        <div className="flex flex-wrap items-end gap-4">
          <Figure caption={t("dev.plain")}>
            <ServiceLogo name="Netflix" />
          </Figure>
          <Figure caption={t("dev.mine")}>
            <ServiceLogo name="Netflix" marker="mine" />
          </Figure>
          <Figure caption={t("dev.plan")}>
            <ServiceLogo name="Netflix" marker="plan" />
          </Figure>
          <Figure caption={t("dev.plain")}>
            <ServiceLogo name="Netflix" size="small" />
          </Figure>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.disclosure")}</h2>
        <Disclosure label={t("dev.disclosureLabel")}>
          <p>{t("dev.disclosureBody")}</p>
        </Disclosure>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.messages")}</h2>
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          <MessageSample caption={t("dev.stateLoading")}>
            <StateMessage state="loading" />
          </MessageSample>
          <MessageSample caption={t("dev.stateNoResults")}>
            <StateMessage state="no-results" query="Fightclub" />
          </MessageSample>
          <MessageSample caption={t("dev.stateUnavailable")}>
            <StateMessage state="unavailable" />
          </MessageSample>
          <MessageSample caption={t("dev.stateBusy")}>
            <StateMessage state="busy" />
          </MessageSample>
          <MessageSample caption={t("dev.stateWrongFile")}>
            <StateMessage state="wrong-file" />
          </MessageSample>
          <MessageSample caption={t("dev.stateEmptyFile")}>
            <StateMessage state="empty-file" />
          </MessageSample>
          <MessageSample caption={t("dev.stateNotFound")}>
            <StateMessage state="not-found" />
          </MessageSample>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.titleLoading")}</h2>
        <TitleLoading status={t("states.loading.title")} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.poster")}</h2>
        <Poster alt={t("dev.posterTitle")} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-ui">{t("dev.toast")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => showToast(t("toast.saved"))}>
            {t("dev.showSaved")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast(t("toast.linkCopied"))}
          >
            {t("dev.showCopied")}
          </Button>
        </div>
      </section>
    </div>
  );
}

function MessageSample({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-body font-medium text-text-muted">{caption}</p>
      {children}
    </div>
  );
}

function Figure({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col items-center gap-2">
      {children}
      <figcaption className="text-small text-text-muted">{caption}</figcaption>
    </figure>
  );
}
