// seed-emulator.mjs — Seeds 30 days of hold_logs into the local Firestore emulator
// Run with: node seed-emulator.mjs
// Requires: firebase emulators:start --only firestore

const PROJECT_ID = "cfa-hold-logger";
const BASE_URL = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents/hold_logs`;

const PRODUCTS = [
  "Nuggets",
  "Filets",
  "Strips",
  "Grilled Filets",
  "Spicy Filets",
  "Grilled Nuggets",
  "Fries",
];

// Traffic windows: [startHour, endHour, weight]
const TRAFFIC_WINDOWS = [
  [6, 8, 1],
  [7, 9, 3],
  [11, 13, 4],
  [14, 16, 1.5],
  [17, 21, 2],
];
const TOTAL_WEIGHT = TRAFFIC_WINDOWS.reduce((s, [, , w]) => s + w, 0);

const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Hawaii midnight (UTC) for a YYYY-MM-DD date string
const hawaiiMidnight = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 10, 0, 0));
};

const ts = (midnight, hour, min) =>
  new Date(midnight.getTime() + (hour * 60 + min) * 60000).toISOString();

// Get Hawaii date string for a day offset from today
const hawaiiDateOffset = (daysAgo) => {
  const todayHawaii = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Honolulu",
  }).format(new Date());
  const [y, m, d] = todayHawaii.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - daysAgo, 10, 0, 0));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Honolulu",
  }).format(date);
};

// Day-of-week in Hawaii (0=Sun..6=Sat)
const hawaiiDow = (dateStr) => {
  const midnight = hawaiiMidnight(dateStr);
  // Add 1ms so we're inside the day, subtract 10h to get Hawaii civil time
  const hDate = new Date(midnight.getTime() - 10 * 3600 * 1000 + 1);
  return hDate.getUTCDay();
};

function generateRandomDay(midnight, count) {
  const logs = [];
  for (let i = 0; i < count; i++) {
    let r = Math.random() * TOTAL_WEIGHT;
    let [startH, endH] = TRAFFIC_WINDOWS[0];
    for (const [s, e, w] of TRAFFIC_WINDOWS) {
      r -= w;
      if (r <= 0) {
        startH = s;
        endH = e;
        break;
      }
    }
    const offsetMin = Math.floor(Math.random() * (endH - startH) * 60);
    const h = startH + Math.floor(offsetMin / 60);
    const m = offsetMin % 60;
    logs.push({ button_type: pick(PRODUCTS), time: ts(midnight, h, m) });
  }
  logs.sort((a, b) => (a.time < b.time ? -1 : 1));
  return logs;
}

// Exact pattern from seed.mjs — used for one specific day
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

// seed.mjs day: 14 days ago (roughly 2 weeks back, a clear reference point)
const SEED_MJS_DAY_OFFSET = 14;

let totalOk = 0;
let totalFail = 0;

for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
  const dateStr = hawaiiDateOffset(daysAgo);
  const dow = hawaiiDow(dateStr);

  // Chick-fil-A closed Sundays
  if (dow === 0) {
    console.log(`\n  —  ${dateStr} (Sunday — closed)\n`);
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
  let dayNote = "";

  if (daysAgo === SEED_MJS_DAY_OFFSET) {
    // Use exact seed.mjs pattern
    logs = SEED_MJS_PATTERN.map(({ p, h, m }) => ({
      button_type: p,
      time: ts(midnight, h, m),
    }));
    dayNote = " ← seed.mjs pattern";
  } else {
    // Saturday slightly busier, weekdays normal
    const isSat = dow === 6;
    const count = isSat ? rand(30, 45) : rand(15, 35);
    logs = generateRandomDay(midnight, count);
  }

  console.log(`\n${label}${dayNote} — ${logs.length} logs`);

  let ok = 0;
  for (const { button_type, time } of logs) {
    try {
      await postLog(button_type, time);
      ok++;
      const h = new Date(time).getUTCHours();
      const hawaiiH = (h - 10 + 24) % 24;
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
