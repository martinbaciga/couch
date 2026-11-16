import { StateMessage } from "@/components/ui/StateMessage";

/** Unknown title, or a link that is not a film or series id. */
export default function TitleNotFound() {
  return <StateMessage state="not-found" heading="h1" />;
}
