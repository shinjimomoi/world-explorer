import { countries, type Country } from "./countries";

export type Category =
  | "All World"
  | "Africa"
  | "Americas"
  | "Asia"
  | "Europe"
  | "Oceania"
  | "Microstates";

export const CATEGORIES: Category[] = [
  "All World",
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
  "Microstates",
];

export const CATEGORY_META: {
  id: Category;
  icon: string;
  label: string;
}[] = [
  { id: "All World", icon: "globe", label: "All World" },
  { id: "Africa", icon: "sun", label: "Africa" },
  { id: "Americas", icon: "compass", label: "Americas" },
  { id: "Asia", icon: "mountain", label: "Asia" },
  { id: "Europe", icon: "landmark", label: "Europe" },
  { id: "Oceania", icon: "waves", label: "Oceania" },
  { id: "Microstates", icon: "minimize2", label: "Microstates" },
];

// ─── continent lookup by ISO alpha-3 code ────────────────────────────────────

export const CONTINENT_MAP: Record<string, string> = {
  // Africa
  DZA: "Africa", AGO: "Africa", BEN: "Africa", BWA: "Africa", BFA: "Africa",
  BDI: "Africa", CPV: "Africa", CMR: "Africa", CAF: "Africa", TCD: "Africa",
  COM: "Africa", COG: "Africa", COD: "Africa", DJI: "Africa", EGY: "Africa",
  GNQ: "Africa", ERI: "Africa", SWZ: "Africa", ETH: "Africa", GAB: "Africa",
  GMB: "Africa", GHA: "Africa", GIN: "Africa", GNB: "Africa", CIV: "Africa",
  KEN: "Africa", LSO: "Africa", LBR: "Africa", LBY: "Africa", MDG: "Africa",
  MWI: "Africa", MLI: "Africa", MRT: "Africa", MUS: "Africa", MAR: "Africa",
  MOZ: "Africa", NAM: "Africa", NER: "Africa", NGA: "Africa", RWA: "Africa",
  STP: "Africa", SEN: "Africa", SYC: "Africa", SLE: "Africa", SOM: "Africa",
  ZAF: "Africa", SSD: "Africa", SDN: "Africa", TZA: "Africa", TGO: "Africa",
  TUN: "Africa", UGA: "Africa", ZMB: "Africa", ZWE: "Africa",
  // Americas
  ATG: "Americas", ARG: "Americas", BHS: "Americas", BRB: "Americas",
  BLZ: "Americas", BOL: "Americas", BRA: "Americas", CAN: "Americas",
  CHL: "Americas", COL: "Americas", CRI: "Americas", CUB: "Americas",
  DMA: "Americas", DOM: "Americas", ECU: "Americas", SLV: "Americas",
  GRD: "Americas", GTM: "Americas", GUY: "Americas", HTI: "Americas",
  HND: "Americas", JAM: "Americas", MEX: "Americas", NIC: "Americas",
  PAN: "Americas", PRY: "Americas", PER: "Americas", KNA: "Americas",
  LCA: "Americas", VCT: "Americas", SUR: "Americas", TTO: "Americas",
  USA: "Americas", URY: "Americas", VEN: "Americas",
  // Asia
  AFG: "Asia", ARM: "Asia", AZE: "Asia", BHR: "Asia", BGD: "Asia",
  BTN: "Asia", BRN: "Asia", KHM: "Asia", CHN: "Asia", CYP: "Asia",
  GEO: "Asia", IND: "Asia", IDN: "Asia", IRN: "Asia", IRQ: "Asia",
  ISR: "Asia", JPN: "Asia", JOR: "Asia", KAZ: "Asia", KWT: "Asia",
  KGZ: "Asia", LAO: "Asia", LBN: "Asia", MYS: "Asia", MDV: "Asia",
  MNG: "Asia", MMR: "Asia", NPL: "Asia", PRK: "Asia", OMN: "Asia",
  PAK: "Asia", PSE: "Asia", PHL: "Asia", QAT: "Asia", SAU: "Asia",
  SGP: "Asia", KOR: "Asia", LKA: "Asia", SYR: "Asia", TWN: "Asia",
  TJK: "Asia", THA: "Asia", TLS: "Asia", TUR: "Asia", TKM: "Asia",
  ARE: "Asia", UZB: "Asia", VNM: "Asia", YEM: "Asia",
  // Europe
  ALB: "Europe", AND: "Europe", AUT: "Europe", BLR: "Europe", BEL: "Europe",
  BIH: "Europe", BGR: "Europe", HRV: "Europe", CZE: "Europe", DNK: "Europe",
  EST: "Europe", FIN: "Europe", FRA: "Europe", DEU: "Europe", GRC: "Europe",
  HUN: "Europe", ISL: "Europe", IRL: "Europe", ITA: "Europe", XKX: "Europe",
  LVA: "Europe", LIE: "Europe", LTU: "Europe", LUX: "Europe", MLT: "Europe",
  MDA: "Europe", MCO: "Europe", MNE: "Europe", NLD: "Europe", MKD: "Europe",
  NOR: "Europe", POL: "Europe", PRT: "Europe", ROU: "Europe", RUS: "Europe",
  SMR: "Europe", SRB: "Europe", SVK: "Europe", SVN: "Europe", ESP: "Europe",
  SWE: "Europe", CHE: "Europe", UKR: "Europe", GBR: "Europe",
  // Oceania
  AUS: "Oceania", FJI: "Oceania", KIR: "Oceania", MHL: "Oceania",
  FSM: "Oceania", NRU: "Oceania", NZL: "Oceania", PLW: "Oceania",
  PNG: "Oceania", WSM: "Oceania", SLB: "Oceania", TON: "Oceania",
  TUV: "Oceania", VUT: "Oceania",
};

// Microstates: population under 1 million or area under 1,000 km²
const MICROSTATE_CODES = new Set([
  "AND", "ATG", "BHR", "BRB", "BTN", "BRN", "CPV", "COM", "DJI", "DMA",
  "FJI", "GRD", "ISL", "KIR", "LIE", "LUX", "MDV", "MLT", "MHL", "FSM",
  "MCO", "MNE", "NRU", "PLW", "KNA", "LCA", "VCT", "WSM", "SMR", "STP",
  "SYC", "SGP", "SLB", "SUR", "TON", "TTO", "TUV", "VUT",
]);

// ─── difficulty ranks for survival mode ───────────────────────────────────────

// Rank 1 (Easy): well-known capitals
const RANK1_CODES = new Set([
  "USA", "CAN", "BRA", "ARG", "MEX", "GBR", "FRA", "DEU", "ITA", "ESP",
  "PRT", "JPN", "CHN", "IND", "AUS", "RUS", "ZAF", "EGY", "NGA", "KOR",
  "NLD", "SWE", "NOR", "CHE", "POL", "TUR", "SAU", "ARE", "THA", "IDN",
  "NZL", "GRC", "AUT", "BEL", "DNK", "FIN", "IRL", "CZE", "HUN", "ROU",
  "UKR", "CHL", "COL", "PER", "VEN", "MAR", "KEN", "ETH", "GHA", "TZA",
]);

// Rank 3 (Hard): obscure capitals, microstates, islands
const RANK3_CODES = new Set([
  // African nations not in rank 1
  "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD",
  "COM", "COG", "COD", "DJI", "GNQ", "ERI", "SWZ", "GAB", "GMB", "GIN",
  "GNB", "CIV", "LSO", "LBR", "LBY", "MDG", "MWI", "MLI", "MRT", "MUS",
  "MOZ", "NAM", "NER", "RWA", "STP", "SEN", "SYC", "SLE", "SOM", "SSD",
  "SDN", "TGO", "TUN", "UGA", "ZMB", "ZWE",
  // Pacific islands
  "FJI", "KIR", "MHL", "FSM", "NRU", "PLW", "WSM", "SLB", "TON", "TUV",
  "VUT", "PNG",
  // Central Asia
  "KAZ", "UZB", "TKM", "TJK", "KGZ",
  // Caribbean microstates
  "ATG", "BRB", "DMA", "GRD", "KNA", "LCA", "VCT",
  // Microstates & small states
  "AND", "SMR", "MCO", "LIE", "LUX", "MLT", "MDV", "BTN", "TLS", "BHR",
  "BRN", "MNE", "SGP",
]);

export function countryRank(code: string): 1 | 2 | 3 {
  if (RANK1_CODES.has(code)) return 1;
  if (RANK3_CODES.has(code)) return 3;
  return 2;
}

export function countriesByMaxRank(maxRank: 1 | 2 | 3): Country[] {
  return countries.filter((c) => countryRank(c.code) <= maxRank);
}

// ─── filtering ───────────────────────────────────────────────────────────────

export function filterCountries(category: Category): Country[] {
  if (category === "All World") return countries;
  if (category === "Microstates") {
    return countries.filter((c) => MICROSTATE_CODES.has(c.code));
  }
  return countries.filter((c) => CONTINENT_MAP[c.code] === category);
}

export function categoryCount(category: Category): number {
  return filterCountries(category).length;
}
