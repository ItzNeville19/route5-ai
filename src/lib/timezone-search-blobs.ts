/**
 * Search text for IANA zones: path, city tokens, curated region labels, and
 * geography keywords (US states, DC, Colombia vs US “Columbia”, etc.).
 */
import { REGIONS_BY_IANA } from "@/lib/workspace-regions";

/**
 * Extra lowercase tokens per zone — disambiguation and “search like a human”.
 * (IANA IDs + region labels already cover many cities.)
 */
const EXTRA_KEYWORDS: Record<string, string> = {
  UTC: "gmt utc zulu universal coordinated greenwich",

  "America/New_York":
    "eastern et est east coast usa united states america washington dc district of columbia dc federal capital maryland virginia new england northeast mid atlantic new york pennsylvania new jersey massachusetts connecticut rhode island vermont new hampshire maine delaware florida georgia north carolina south carolina west virginia ohio michigan indiana eastern kentucky eastern tennessee south carolina columbia sc carolina not colombia bogota",
  "America/Detroit": "michigan eastern detroit lansing grand rapids",
  "America/Kentucky/Louisville": "kentucky louisville eastern",
  "America/Kentucky/Monticello": "kentucky monticello eastern",
  "America/Indiana/Indianapolis": "indiana indianapolis fort wayne evansville most of indiana",
  "America/Indiana/Vincennes": "indiana vincennes",
  "America/Indiana/Tell_City": "indiana tell city central",
  "America/Indiana/Knox": "indiana knox central",
  "America/Indiana/Winamac": "indiana winamac eastern",
  "America/Indiana/Marengo": "indiana marengo eastern",
  "America/Indiana/Petersburg": "indiana petersburg eastern",
  "America/Indiana/Vevay": "indiana vevay eastern",
  "America/Chicago":
    "central ct cst usa texas illinois wisconsin iowa minnesota missouri oklahoma kansas nebraska louisiana arkansas north dakota south dakota alabama mississippi western tennessee western kentucky kansas city st louis dallas houston austin san antonio fort worth chicago minneapolis new orleans baton rouge columbia missouri mo springfield missouri des moines omaha wichita tulsa",
  "America/North_Dakota/Center": "north dakota center central",
  "America/North_Dakota/New_Salem": "north dakota new salem central",
  "America/North_Dakota/Beulah": "north dakota beulah central",
  "America/Denver":
    "mountain mt mst usa colorado wyoming montana new mexico utah idaho boise denver albuquerque santa fe cheyenne billings el paso texas western texas arizona navajo partial salt lake city utah denver boulder",
  "America/Boise": "idaho boise mountain",
  "America/Phoenix": "arizona az phoenix tucson mesa scottsdale no dst arizona",
  "America/Los_Angeles":
    "pacific pt pst usa california oregon washington nevada los angeles san francisco seattle portland san diego sacramento san jose las vegas reno vancouver washington state british columbia partial",
  "America/Anchorage": "alaska ak anchorage fairbanks juneau",
  "America/Juneau": "alaska juneau",
  "America/Nome": "alaska nome",
  "America/Metlakatla": "alaska metlakatla",
  "America/Sitka": "alaska sitka",
  "America/Yakutat": "alaska yakutat",
  "America/Adak": "alaska aleutian adak",
  "America/Honolulu": "hawaii hi honolulu maui kauai oahu",
  "America/Puerto_Rico": "puerto rico pr caribbean san juan",
  "America/St_Johns": "newfoundland labrador st johns nl canada atlantic",
  "America/Halifax": "nova scotia halifax maritime atlantic canada",
  "America/Glace_Bay": "nova scotia cape breton",
  "America/Moncton": "new brunswick moncton",
  "America/Toronto": "ontario toronto ottawa canada eastern quebec montreal",
  "America/Montreal": "quebec montreal canada eastern",
  "America/Winnipeg": "manitoba winnipeg central canada",
  "America/Edmonton": "alberta edmonton calgary mountain canada",
  "America/Vancouver": "british columbia vancouver canada pacific",
  "America/Regina": "saskatchewan regina saskatoon central canada",
  "America/Mexico_City": "mexico mexican guadalajara monterrey cdmx",
  "America/Bogota":
    "colombia colombian south america bogota medellin cali cartagena barranquilla spanish speaking andes not columbia us not south carolina not missouri",
  "America/Lima": "peru peruvian lima cusco arequipa",
  "America/Santiago": "chile chilean santiago valparaiso",
  "America/Buenos_Aires": "argentina argentine buenos aires cordoba rosario",
  "America/Argentina/Buenos_Aires": "argentina buenos aires legacy",
  "America/Sao_Paulo": "brazil brazilian sao paulo rio brasilia",
  "America/Caracas": "venezuela caracas",
  "America/La_Paz": "bolivia la paz",
  "America/Guatemala": "guatemala guate",
  "America/Costa_Rica": "costa rica san jose",
  "America/Panama": "panama panama city",
  "America/Jamaica": "jamaica kingston",
  "Europe/London":
    "uk united kingdom britain british england scotland wales northern ireland london edinburgh belfast cardiff gmt bst",
  "Europe/Dublin": "ireland irish dublin cork",
  "Europe/Paris": "france french paris lyon marseille",
  "Europe/Berlin": "germany german berlin munich hamburg",
  "Europe/Madrid": "spain spanish madrid barcelona",
  "Europe/Rome": "italy italian rome milan",
  "Europe/Amsterdam": "netherlands dutch amsterdam rotterdam",
  "Europe/Brussels": "belgium belgian brussels",
  "Europe/Zurich": "switzerland swiss zurich geneva",
  "Europe/Stockholm": "sweden swedish stockholm",
  "Europe/Warsaw": "poland polish warsaw krakow",
  "Europe/Athens": "greece greek athens",
  "Europe/Istanbul": "turkey turkish istanbul ankara",
  "Europe/Moscow": "russia russian moscow st petersburg",
  "Asia/Dubai": "uae emirates dubai abu dhabi gulf",
  "Asia/Riyadh": "saudi arabia riyadh",
  "Asia/Tel_Aviv": "israel israeli tel aviv jerusalem",
  "Asia/Kolkata": "india indian mumbai delhi bengaluru bangalore chennai kolkata hyderabad pune ist",
  "Asia/Bangkok": "thailand thai bangkok phuket",
  "Asia/Singapore": "singapore sg",
  "Asia/Hong_Kong": "hong kong hk china sar",
  "Asia/Shanghai": "china chinese shanghai beijing shenzhen guangzhou cst",
  "Asia/Tokyo": "japan japanese tokyo osaka kyoto jst",
  "Asia/Seoul": "korea korean seoul busan kst",
  "Australia/Sydney": "australia australian sydney melbourne canberra brisbane adelaide perth aest",
  "Pacific/Auckland": "new zealand auckland wellington nz",
  "Pacific/Honolulu": "hawaii pacific honolulu",
};

let blobCache: Map<string, string> | null = null;

function buildBlob(zone: string): string {
  const z = zone.trim();
  const parts = z.toLowerCase().split("/");
  const leaf = parts[parts.length - 1]?.replace(/_/g, " ") ?? "";
  const chunks: string[] = [z.toLowerCase(), parts.join(" "), leaf];

  const regions = REGIONS_BY_IANA[z];
  if (regions) {
    for (const r of regions) {
      chunks.push(r.label.toLowerCase());
      chunks.push(r.key.replace(/_/g, " "));
    }
  }

  const extra = EXTRA_KEYWORDS[z];
  if (extra) chunks.push(extra);

  return Array.from(new Set(chunks.join(" ").split(/\s+/).filter(Boolean))).join(" ");
}

/** Lowercase search blob for substring matching (418 zones; cache once). */
export function getTimezoneSearchBlob(zone: string): string {
  if (!blobCache) {
    blobCache = new Map();
  }
  const cached = blobCache.get(zone);
  if (cached !== undefined) return cached;
  const b = buildBlob(zone);
  blobCache.set(zone, b);
  return b;
}

export function warmTimezoneSearchBlobs(zones: readonly string[]): void {
  for (const z of zones) {
    getTimezoneSearchBlob(z);
  }
}
