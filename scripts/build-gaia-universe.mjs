import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const DEFAULT_COUNT = 32000;
const OUTPUT_JSON = resolve(repoRoot, "data/universe-stars.json");
const OUTPUT_JS = resolve(repoRoot, "data/universe-stars.js");
const SOURCE_URL = "https://gea.esac.esa.int/archive/";
const TAP_URL = "https://gea.esac.esa.int/tap-server/tap/sync";

const options = parseArgs(process.argv.slice(2));
const count = Math.max(1, Number(options.count || DEFAULT_COUNT));
const csv = options.input
  ? await readFile(resolve(process.cwd(), options.input), "utf8")
  : await fetchGaiaCsv(count);

const stars = parseCsv(csv)
  .map(gaiaRowToStar)
  .filter(Boolean)
  .slice(0, count);

if (!stars.length) {
  throw new Error("No Gaia rows were parsed.");
}

const payload = {
  source: "Gaia DR3",
  sourceUrl: SOURCE_URL,
  license: "ESA Gaia Archive public data",
  licenseUrl: "https://www.cosmos.esa.int/web/gaia-users/archive/conditions-of-use",
  generatedFrom: options.input ? basename(options.input) : "Gaia Archive TAP ADQL query",
  selection: [
    `Brightest ${stars.length.toLocaleString("en-US")} Gaia DR3 sources`,
    "positive parallax",
    "parallax_over_error > 10",
    "G-band photometry present",
  ].join("; "),
  query: gaiaQuery(count),
  count: stars.length,
  stars,
};

const json = `${JSON.stringify(payload)}\n`;
await writeFile(OUTPUT_JSON, json);
await writeFile(OUTPUT_JS, `window.UNIVERSE_STARS_DATA=${json.replace(/\n$/, "")};\n`);
console.log(`Wrote ${stars.length.toLocaleString("en-US")} Gaia DR3 stars.`);

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input") parsed.input = args[index += 1];
    else if (arg === "--count") parsed.count = args[index += 1];
  }
  return parsed;
}

async function fetchGaiaCsv(limit) {
  const url = new URL(TAP_URL);
  url.searchParams.set("REQUEST", "doQuery");
  url.searchParams.set("LANG", "ADQL");
  url.searchParams.set("FORMAT", "csv");
  url.searchParams.set("QUERY", gaiaQuery(limit));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gaia TAP request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function gaiaQuery(limit) {
  return [
    `SELECT TOP ${limit}`,
    "source_id,ra,dec,parallax,phot_g_mean_mag,bp_rp",
    "FROM gaiadr3.gaia_source",
    "WHERE parallax > 0",
    "AND parallax_over_error > 10",
    "AND phot_g_mean_mag IS NOT NULL",
    "ORDER BY phot_g_mean_mag ASC",
  ].join(" ");
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/);
  const header = rows.shift()?.split(",") || [];
  return rows.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });
}

function gaiaRowToStar(row) {
  const ra = Number(row.ra);
  const dec = Number(row.dec);
  const parallax = Number(row.parallax);
  const mag = Number(row.phot_g_mean_mag);
  const ci = row.bp_rp === "" ? null : Number(row.bp_rp);
  if (![ra, dec, parallax, mag].every(Number.isFinite) || parallax <= 0) return null;

  const distance = 1000 / parallax;
  const raRad = degreesToRadians(ra);
  const decRad = degreesToRadians(dec);
  const cosDec = Math.cos(decRad);

  return {
    id: row.source_id,
    x: round(distance * cosDec * Math.cos(raRad), 5),
    y: round(distance * cosDec * Math.sin(raRad), 5),
    z: round(distance * Math.sin(decRad), 5),
    mag: round(mag, 4),
    ci: Number.isFinite(ci) ? round(ci, 4) : null,
    dist: round(distance, 4),
  };
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
