import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const COLLECTION_NAME = "hold_logs";

// Returns UTC ISO boundaries for a Hawaii calendar day
export const hawaiiDayBounds = (dateStr) => {
  // dateStr = "YYYY-MM-DD" in Hawaii time (UTC-10, no DST)
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 10, 0, 0)); // Hawaii midnight = UTC 10:00
  const end = new Date(Date.UTC(y, m - 1, d + 1, 10, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
};

// Returns UTC ISO boundaries for an ISO week (Mon–Sun) in a given year
export const isoWeekBounds = (year, week) => {
  // Jan 4 is always in week 1 per ISO 8601
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = (jan4.getUTCDay() + 6) % 7; // 0=Mon
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - dayOfWeek);

  const weekStart = new Date(week1Mon);
  weekStart.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  // Shift by Hawaii offset (+10h): Hawaii Mon 00:00 = UTC Mon 10:00
  const start = new Date(weekStart.getTime() + 10 * 3600 * 1000);
  const end = new Date(weekEnd.getTime() + 10 * 3600 * 1000);

  return { start: start.toISOString(), end: end.toISOString(), weekStart };
};

export const getLogsForDateRange = async (startISO, endISO) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("start_time", ">=", startISO),
    where("start_time", "<", endISO)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Returns today's date string in Hawaii time (YYYY-MM-DD)
export const hawaiiToday = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Honolulu" }).format(new Date());
};

// Returns current ISO week number and year in Hawaii time
export const hawaiiCurrentWeek = () => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Honolulu" }));
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - dayOfWeek);
  const diff = now - week1Mon;
  const week = Math.floor(diff / (7 * 86400000)) + 1;
  return { year: now.getFullYear(), week };
};

// Returns hour in Hawaii time (0-23) from an ISO string
export const hawaiiHour = (isoString) => {
  const date = new Date(isoString);
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Pacific/Honolulu",
      hour: "numeric",
      hour12: false,
    }).format(date),
    10
  );
};

// Returns YYYY-MM-DD calendar date in Hawaii time from an ISO string
export const hawaiiDateString = (isoString) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Honolulu" }).format(new Date(isoString));

// Shifts an ISO week by delta weeks; handles year-boundary wraparound
export const shiftISOWeek = (year, week, delta) => {
  const { weekStart } = isoWeekBounds(year, week);
  const newMon = new Date(weekStart.getTime() + delta * 7 * 86400000);
  const y = newMon.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const dow = (jan4.getUTCDay() + 6) % 7;
  const week1Mon = new Date(Date.UTC(y, 0, 4 - dow));
  const diff = newMon - week1Mon;
  const w = Math.floor(diff / (7 * 86400000)) + 1;
  if (w < 1) {
    const yp = y - 1;
    const jan4p = new Date(Date.UTC(yp, 0, 4));
    const dowp = (jan4p.getUTCDay() + 6) % 7;
    const wk1p = new Date(Date.UTC(yp, 0, 4 - dowp));
    return { year: yp, week: Math.floor((newMon - wk1p) / (7 * 86400000)) + 1 };
  }
  const jan4n = new Date(Date.UTC(y + 1, 0, 4));
  const down = (jan4n.getUTCDay() + 6) % 7;
  const wk1n = new Date(Date.UTC(y + 1, 0, 4 - down));
  if (newMon >= wk1n) return { year: y + 1, week: 1 };
  return { year: y, week: w };
};

// Returns UTC ISO start/end covering numWeeks consecutive weeks ending at (endYear, endWeek)
export const getMultiWeekRangeBounds = (endYear, endWeek, numWeeks) => {
  const { year: sy, week: sw } = shiftISOWeek(endYear, endWeek, -(numWeeks - 1));
  const { start } = isoWeekBounds(sy, sw);
  const { end } = isoWeekBounds(endYear, endWeek);
  return { startISO: start, endISO: end };
};

// Returns day of week index 0=Mon in Hawaii time from an ISO string
export const hawaiiDayOfWeek = (isoString) => {
  const date = new Date(isoString);
  // getDay() returns 0=Sun..6=Sat; we want 0=Mon..6=Sun
  const hDay = new Date(
    date.toLocaleString("en-US", { timeZone: "Pacific/Honolulu" })
  ).getDay();
  return (hDay + 6) % 7;
};
