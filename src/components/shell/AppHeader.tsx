import { connection } from "next/server";
import { getRegions } from "@/lib/tmdb/client";
import { Header, type RegionNames } from "./Header";

/**
 * Region names load here, inside the header suspense boundary, so a slow
 * catalogue request does not hold up the rest of the page.
 */
export async function AppHeader() {
  // The catalogue cache reads the clock, so this waits for the request.
  await connection();
  return <Header regions={await regionNames()} />;
}

async function regionNames(): Promise<RegionNames> {
  try {
    const regions = await getRegions();
    const names: Record<string, string> = {};
    for (const region of regions) {
      names[region.code.toUpperCase()] = region.englishName;
    }
    return names;
  } catch {
    // The settings label uses the ISO code when the catalogue is unavailable.
    return {};
  }
}
