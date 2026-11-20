"use client";

import { useSearch } from "@/components/shell/search-context";
import { StateMessage } from "@/components/ui/StateMessage";

/** Unknown title, or a link that is not a film or series id. */
export default function TitleNotFound() {
  const { openSearch } = useSearch();
  return (
    <StateMessage state="not-found" heading="h1" onSearch={openSearch} />
  );
}
