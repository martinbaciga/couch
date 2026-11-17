import { describe, expect, it } from "vitest";
import { countryServicesView } from "./country-services";

describe("countryServicesView", () => {
  it("shows the empty country field and no services when nothing is saved", () => {
    expect(countryServicesView(null, 0)).toEqual({
      helper: true,
      services: "hidden",
      showSelectedCount: false,
      search: false,
    });
  });

  it("shows the service list unticked once a country is chosen", () => {
    expect(countryServicesView("IE", 0)).toEqual({
      helper: false,
      services: "shown",
      showSelectedCount: false,
      search: true,
    });
  });

  it("shows the selected count only after a service is ticked", () => {
    expect(countryServicesView("IE", 2).showSelectedCount).toBe(true);
  });
});
