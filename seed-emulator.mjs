// seed-emulator.mjs — Seeds 3 months of hold_logs into the local Firestore emulator
// Run with: node seed-emulator.mjs
// Requires: firebase emulators:start --only firestore
//
// Trends baked in (dow: 0=Sun..6=Sat):
//   Sun      — closed (Chick-fil-A)
//   Mon (1)  — evening surge (5-9pm dominates)
//   Tue (2)  — Nuggets Tuesday (~70% Nuggets/Grilled Nuggets)
//   Wed (3)  — 11am-2pm lunch crush (~65% of volume)
//   Thu (4)  — Spicy Thursday (Spicy Filets ~35%)
//   Fri (5)  — busiest weekday, balanced mix
//   Sat (6)  — busiest day overall, strong morning + lunch

const PROJECT_ID = "cfa-hold-logger";
const BASE_URL = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents/hold_logs`;

// Log count ranges [lo, hi] per day of week
const COUNT_RANGE = {
  1: [12, 22],  // Mon — slow
  2: [18, 28],  // Tue — Nuggets day
  3: [18, 28],  // Wed — lunch crush
  4: [20, 32],  // Thu — Spicy day
  5: [30, 45],  // Fri — busy
  6: [42, 58],  // Sat — busiest
};

// Product weight tables [name, weight] per dow (fall back to "default")
const PRODUCT_TABLES = {
  default: [
    ["Nuggets", 3],
    ["Filets", 2.5],
    ["Strips", 1.5],
    ["Grilled Filets", 1.5],
    ["Spicy Filets", 1],
    ["Grilled Nuggets", 1],
    ["Fries", 0.5],
  ],
  2: [ // Tuesday: Nuggets dominate
    ["Nuggets", 8],
    ["Grilled Nuggets", 3],
    ["Filets", 1],
    ["Strips", 0.5],
    ["Grilled Filets", 0.5],
    ["Spicy Filets", 0.2],
    ["Fries", 0.2],
  ],
  4: [ // Thursday: Spicy Filets spike
    ["Nuggets", 2],
    ["Filets", 2],
    ["Strips", 1.5],
    ["Grilled Filets", 1],
    ["Spicy Filets", 5],
    ["Grilled Nuggets", 1],
    ["Fries", 0.5],
  ],
};

// Traffic window tables [startH, endH, weight] per dow
const TRAFFIC_TABLES = {
  default: [
    [6, 8, 1],
    [7, 9, 3],
    [11, 13, 4],
    [14, 16, 1.5],
    [17, 21, 2],
  ],
  1: [ // Monday: evening dominant
    [6, 8, 0.5],
    [7, 9, 1],
    [11, 13, 2],
    [14, 16, 2],
    [17, 21, 5],
  ],
  3: [ // Wednesday: 11am-2pm crush
    [6, 8, 0.3],
    [7, 9, 0.5],
    [11, 14, 9],
    [14, 16, 0.5],
    [17, 21, 0.7],
  ],
  6: [ // Saturday: all-day volume, big morning + lunch
    [7, 9, 5],
    [9, 11, 2],
    [11, 14, 6],
    [14, 17, 3],
    [17, 21, 3],
  ],
};

const DAY_NOTES = {
  1: "evening surge",
  2: "Nuggets Tuesday",
  3: "11am-2pm lunch crush",
  4: "Spicy Thursday",
  5: "busy Friday",
  6: "Saturday rush",
};

const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

function weightedPick(table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of table) {
    r -= w;
    if (r <= 0) return item;
  }
  return table[table.length - 1][0];
}

// Hawaii midnight (UTC) for a YYYY-MM-DD date string
const hawaiiMidnight = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 10, 0, 0));
};

const ts = (midnight, hour, min) =>
  new Date(midnight.getTime() + (hour * 60 + min) * 60000).toISOString();

// Hawaii date string for N days ago
const hawaiiDateOffset = (daysAgo) => {
  const todayHawaii = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Honolulu",
  }).format(new Date());
  const [y, m, d] = todayHawaii.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - daysAgo, 10, 0, 0));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Honolulu" }).format(date);
};

// Day-of-week in Hawaii (0=Sun..6=Sat)
const hawaiiDow = (dateStr) => {
  const midnight = hawaiiMidnight(dateStr);
  const hDate = new Date(midnight.getTime() - 10 * 3600 * 1000 + 1);
  return hDate.getUTCDay();
};

function generateDay(midnight, count, dow) {
  const productTable = PRODUCT_TABLES[dow] ?? PRODUCT_TABLES.default;
  const trafficTable = TRAFFIC_TABLES[dow] ?? TRAFFIC_TABLES.default;
  const trafficTotal = trafficTable.reduce((s, [, , w]) => s + w, 0);

  const logs = [];
  for (let i = 0; i < count; i++) {
    let r = Math.random() * trafficTotal;
    let [startH, endH] = trafficTable[0];
    for (const [s, e, w] of trafficTable) {
      r -= w;
      if (r <= 0) { startH = s; endH = e; break; }
    }
    const offsetMin = Math.floor(Math.random() * (endH - startH) * 60);
    const h = startH + Math.floor(offsetMin / 60);
    const m = offsetMin % 60;
    logs.push({ button_type: weightedPick(productTable), time: ts(midnight, h, m) });
  }
  logs.sort((a, b) => (a.time < b.time ? -1 : 1));
  return logs;
}

// Exact pattern from seed.mjs — planted 45 days ago
const SEED_MJS_PATTERN = [
  { p: "Nuggets", h: 6, m: 12 },
  { p: "Filets", h: 6, m: 28 },
  { p: "Nuggets", h: 6, m: 44 },
  { p: "Strips", h: 7, m: 5 },
  { p: "Nuggets", h: 7, m: 9 },
  { p: "Filets", h: 7, m: 11 },
  { p: "Grilled Filets", h: 7, m: 13 },
  { p: "Spicy Filets", h: 7, m: 14 },
  { p: "Nuggets", h: 7, m: 33 },
  { p: "Grilled Nuggets", h: 7, m: 48 },
  { p: "Strips", h: 7, m: 52 },
  { p: "Fries", h: 8, m: 3 },
  { p: "Nuggets", h: 8, m: 20 },
  { p: "Filets", h: 8, m: 37 },
  { p: "Grilled Filets", h: 9, m: 15 },
  { p: "Nuggets", h: 9, m: 44 },
  { p: "Nuggets", h: 11, m: 8 },
  { p: "Filets", h: 11, m: 9 },
  { p: "Strips", h: 11, m: 10 },
  { p: "Grilled Filets", h: 11, m: 10 },
  { p: "Spicy Filets", h: 11, m: 12 },
  { p: "Grilled Nuggets", h: 11, m: 25 },
  { p: "Fries", h: 11, m: 38 },
  { p: "Nuggets", h: 12, m: 5 },
  { p: "Filets", h: 12, m: 19 },
  { p: "Strips", h: 12, m: 41 },
  { p: "Grilled Filets", h: 12, m: 55 },
  { p: "Nuggets", h: 13, m: 0 },
  { p: "Filets", h: 13, m: 2 },
  { p: "Grilled Filets", h: 13, m: 4 },
  { p: "Strips", h: 13, m: 7 },
  { p: "Nuggets", h: 13, m: 9 },
  { p: "Nuggets", h: 14, m: 10 },
  { p: "Fries", h: 15, m: 22 },
  { p: "Spicy Filets", h: 16, m: 7 },
  { p: "Grilled Filets", h: 16, m: 44 },
  { p: "Nuggets", h: 17, m: 30 },
  { p: "Filets", h: 18, m: 5 },
  { p: "Grilled Filets", h: 18, m: 42 },
  { p: "Strips", h: 19, m: 15 },
  { p: "Nuggets", h: 19, m: 50 },
  { p: "Spicy Filets", h: 20, m: 22 },
  { p: "Fries", h: 20, m: 48 },
  { p: "Nuggets", h: 21, m: 0 },
];

async function postLog(buttonType, timeISO) {
  const body = {
    fields: {
      button_type: { stringValue: buttonType },
      start_time: { stringValue: timeISO },
      created_at: { timestampValue: timeISO },
    },
  };
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

const SEED_MJS_DAY_OFFSET = 45;

let totalOk = 0;
let totalFail = 0;

for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
  const dateStr = hawaiiDateOffset(daysAgo);
  const dow = hawaiiDow(dateStr);

  if (dow === 0) {
    console.log(`  —  ${dateStr} (Sunday — closed)`);
    continue;
  }

  const midnight = hawaiiMidnight(dateStr);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(midnight);

  let logs;
  let dayNote = DAY_NOTES[dow] ? ` [${DAY_NOTES[dow]}]` : "";

  if (daysAgo === SEED_MJS_DAY_OFFSET) {
    logs = SEED_MJS_PATTERN.map(({ p, h, m }) => ({
      button_type: p,
      time: ts(midnight, h, m),
    }));
    dayNote += " ← seed.mjs pattern";
  } else {
    const [lo, hi] = COUNT_RANGE[dow] ?? [15, 30];
    logs = generateDay(midnight, rand(lo, hi), dow);
  }

  console.log(`\n${label}${dayNote} — ${logs.length} logs`);

  let ok = 0;
  for (const { button_type, time } of logs) {
    try {
      await postLog(button_type, time);
      ok++;
      const utcH = new Date(time).getUTCHours();
      const hawaiiH = (utcH - 10 + 24) % 24;
      const hawaiiM = new Date(time).getUTCMinutes();
      console.log(
        `  ✓  ${button_type.padEnd(20)} ${String(hawaiiH).padStart(2, "0")}:${String(hawaiiM).padStart(2, "0")} Hawaii`
      );
    } catch (err) {
      console.error(`  ✗  ${button_type} — ${err.message}`);
      totalFail++;
    }
  }
  totalOk += ok;
}

console.log(`\nDone: ${totalOk} logs created, ${totalFail} failed.\n`);
