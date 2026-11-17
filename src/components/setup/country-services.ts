export type CountryServicesView = {
  /** The line under the country field, only while nothing is saved. */
  helper: boolean;
  /** Hidden until a country is chosen. Then the list is shown, unticked. */
  services: "hidden" | "shown";
  /** "N selected" appears only after at least one service is ticked. */
  showSelectedCount: boolean;
  /** Search stays hidden with the service list. */
  search: boolean;
};

/** What the shared country and services block shows. It does not write storage. */
export function countryServicesView(
  country: string | null,
  selectedCount: number,
): CountryServicesView {
  if (!country) {
    return {
      helper: true,
      services: "hidden",
      showSelectedCount: false,
      search: false,
    };
  }
  return {
    helper: false,
    services: "shown",
    showSelectedCount: selectedCount > 0,
    search: true,
  };
}
