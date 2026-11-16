import { describe, expect, it } from "vitest";
import { countryFromLanguage } from "./language";

const regions = ["IE", "FR", "BR", "US"];

describe("countryFromLanguage", () => {
  it("uses the region in a language tag", () => {
    expect(countryFromLanguage("en-IE", regions)).toBe("IE");
    expect(countryFromLanguage("zh-Hans-CN", ["CN"])).toBe("CN");
    expect(countryFromLanguage("en_IE", regions)).toBe("IE");
    expect(countryFromLanguage("pt-BR", regions)).toBe("BR");
    expect(countryFromLanguage("fr-FR", regions)).toBe("FR");
  });

  it("is empty when the tag has no region or the region is not offered", () => {
    expect(countryFromLanguage("en", regions)).toBeNull();
    expect(countryFromLanguage("zh-Hans", regions)).toBeNull();
    expect(countryFromLanguage("en-ZZ", regions)).toBeNull();
    expect(countryFromLanguage("", regions)).toBeNull();
  });
});
