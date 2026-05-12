// One-time test data seed — creates ~30 logs for yesterday in Hawaii time
// Run with: node seed.mjs

const PROJECT_ID = "cfa-hold-logger";
const API_KEY = "AIzaSyAP7CMB9wWnWuPhmM9nPDrsHeajihjTRiE";
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/hold_logs?key=${API_KEY}`;

// Yesterday in Hawaii (UTC-10, no DST)
const todayHawaii = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Honolulu" }).format(new Date());
const [y, m, d] = todayHawaii.split("-").map(Number);
const hawaiiMidnight = new Date(Date.UTC(y, m - 1, d - 1, 10, 0, 0)); // Hawaii midnight = UTC 10:00

const ts = (hour, min) =>
  new Date(hawaiiMidnight.getTime() + (hour * 60 + min) * 60000).toISOString();

// Spread across the day — morning rush, midday cluster, afternoon
const LOGS = [
  // Early morning
  { p: "Nuggets",        h: 6,  m: 12 },
  { p: "Filets",         h: 6,  m: 28 },
  { p: "Nuggets",        h: 6,  m: 44 },
  // Morning rush
  { p: "Strips",         h: 7,  m: 5  },
  { p: "Nuggets",        h: 7,  m: 9  },
  { p: "Filets",         h: 7,  m: 11 }, // tight cluster
  { p: "Grilled Filets", h: 7,  m: 13 }, // tight cluster
  { p: "Spicy Filets",   h: 7,  m: 14 }, // tight cluster
  { p: "Nuggets",        h: 7,  m: 33 },
  { p: "Grilled Nuggets",h: 7,  m: 48 },
  { p: "Strips",         h: 7,  m: 52 },
  { p: "Fries",          h: 8,  m: 3  },
  { p: "Nuggets",        h: 8,  m: 20 },
  { p: "Filets",         h: 8,  m: 37 },
  // Mid-morning
  { p: "Grilled Filets", h: 9,  m: 15 },
  { p: "Nuggets",        h: 9,  m: 44 },
  // Lunch rush — dense cluster
  { p: "Nuggets",        h: 11, m: 8  },
  { p: "Filets",         h: 11, m: 9  },
  { p: "Strips",         h: 11, m: 10 },
  { p: "Grilled Filets", h: 11, m: 10 }, // same minute
  { p: "Spicy Filets",   h: 11, m: 12 },
  { p: "Grilled Nuggets",h: 11, m: 25 },
  { p: "Fries",          h: 11, m: 38 },
  { p: "Nuggets",        h: 12, m: 5  },
  { p: "Filets",         h: 12, m: 19 },
  { p: "Strips",         h: 12, m: 41 },
  { p: "Grilled Filets", h: 12, m: 55 },
  // Afternoon
  { p: "Nuggets",        h: 14, m: 10 },
  { p: "Fries",          h: 15, m: 22 },
  { p: "Spicy Filets",   h: 16, m: 7  },
  { p: "Grilled Filets", h: 16, m: 44 },
  { p: "Nuggets",        h: 17, m: 30 },
  { p: "Filets",         h: 18, m: 5  },
  { p: "Grilled Filets", h: 18, m: 42 },
  { p: "Strips",         h: 19, m: 15 },
  { p: "Nuggets",        h: 19, m: 50 },
  { p: "Spicy Filets",   h: 20, m: 22 },
  { p: "Fries",          h: 20, m: 48 },
  { p: "Nuggets",        h: 21, m: 0  },
  // 2-3 min apart cluster
  { p: "Nuggets",        h: 13, m: 0  },
  { p: "Filets",         h: 13, m: 2  },
  { p: "Grilled Filets", h: 13, m: 4  },
  { p: "Strips",         h: 13, m: 7  },
  { p: "Nuggets",        h: 13, m: 9  },
];

const dateLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "Pacific/Honolulu",
  weekday: "long", month: "short", day: "numeric", year: "numeric",
}).format(hawaiiMidnight);

console.log(`\nSeeding ${LOGS.length} logs for: ${dateLabel} (Hawaii)\n`);

let ok = 0;
for (const { p, h, m } of LOGS) {
  const startTime = ts(h, m);
  const body = {
    fields: {
      button_type: { stringValue: p },
      start_time:  { stringValue: startTime },
      created_at:  { timestampValue: startTime },
    },
  };

  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    ok++;
    console.log(`  ✓  ${p.padEnd(20)} ${h}:${String(m).padStart(2, "0")} Hawaii`);
  } else {
    const err = await res.text();
    console.error(`  ✗  ${p} — ${err}`);
  }
}

console.log(`\nDone: ${ok}/${LOGS.length} logs created.\n`);
