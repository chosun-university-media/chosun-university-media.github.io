const fs = require("node:fs/promises");
const path = require("node:path");
const { collectOfficialReleases } = require("../lib/monitoring.cjs");

const START_DATE = process.env.OFFICIAL_RELEASE_START_DATE || "2026-07-09";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "official-releases.json");
const VOLATILE_ITEM_FIELDS = new Set(["createdAt", "updatedAt", "syncedAt"]);

function stableItem(item) {
  return Object.fromEntries(
    Object.entries(item || {}).filter(([key]) => !VOLATILE_ITEM_FIELDS.has(key)),
  );
}

async function main() {
  const requestUrl = new URL("http://localhost/api/official-releases");
  requestUrl.searchParams.set("start", START_DATE);
  const result = await collectOfficialReleases(requestUrl);
  const items = Array.isArray(result.payload?.items) ? result.payload.items : [];
  if (result.status !== 200 || !items.length) {
    throw new Error(result.payload?.error || "공식 보도자료를 수집하지 못했습니다.");
  }

  const payload = {
    source: result.payload.source,
    startDate: START_DATE,
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  try {
    const previous = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
    const previousItems = Array.isArray(previous.items) ? previous.items : [];
    if (JSON.stringify(previousItems.map(stableItem)) === JSON.stringify(items.map(stableItem))) {
      console.log(`공식 보도자료 ${items.length}건, 변경 없음.`);
      return;
    }

    const previousByLink = new Map(
      previousItems.map((item) => [item.sourceUrl || item.url || item.id, item]),
    );
    payload.items = items.map((item) => {
      const previousItem = previousByLink.get(item.sourceUrl || item.url || item.id);
      return previousItem && JSON.stringify(stableItem(previousItem)) === JSON.stringify(stableItem(item))
        ? previousItem
        : item;
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`공식 보도자료 ${items.length}건을 저장했습니다.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
