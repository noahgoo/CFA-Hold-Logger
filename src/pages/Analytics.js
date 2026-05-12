import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  getLogsForDateRange,
  hawaiiDayBounds,
  isoWeekBounds,
  hawaiiToday,
  hawaiiCurrentWeek,
  hawaiiDayOfWeek,
} from "../services/analyticsService";
import "../App.css";

const ALL_PROTEINS = [
  "Nuggets",
  "Filets",
  "Spicy Filets",
  "Strips",
  "Grilled Nuggets",
  "Grilled Filets",
  "Fries",
  "Breakfast Filets",
  "Spicy Bkfst Filets",
  "Grilled Bkfst Filets",
  "Hashbrowns",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RED = "#e60e33";
const AMBER = "#f59e0b";
const DIM = "#3a3a3a";

const chartStyle = { background: "transparent" };
const tooltipStyle = {
  backgroundColor: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.75rem",
  color: "#f0f0f0",
};
const axisStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  fill: "#555",
};

// ── Helpers ───────────────────────────────────────────────
const hawaiiMinutes = (isoString) => {
  const local = new Date(
    new Date(isoString).toLocaleString("en-US", { timeZone: "Pacific/Honolulu" })
  );
  return local.getHours() * 60 + local.getMinutes();
};

const fmtTime = (isoString) =>
  new Date(isoString).toLocaleTimeString("en-US", {
    timeZone: "Pacific/Honolulu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const fmtHour = (mins) => {
  const h = Math.floor(mins / 60);
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
};

const fmtWeekLabel = (weekStart) => {
  if (!weekStart) return "";
  const end = new Date(weekStart);
  end.setUTCDate(weekStart.getUTCDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
};

// ── Dot Timeline ──────────────────────────────────────────
const DotTimeline = ({ logs }) => {
  const [activeDot, setActiveDot] = useState(null);

  if (logs.length === 0) return <p className="logs-empty">no holds logged for this date</p>;

  const activeProteins = ALL_PROTEINS.filter((p) => logs.some((l) => l.button_type === p));
  const allMins = logs.map((l) => hawaiiMinutes(l.start_time));
  const rawMin = Math.min(...allMins);
  const rawMax = Math.max(...allMins);

  const startMin = Math.max(0, Math.floor(rawMin / 60) * 60 - 30);
  const endMin = Math.min(1439, Math.ceil(rawMax / 60) * 60 + 30);
  const range = endMin - startMin || 1;

  const toPct = (mins) => `${((mins - startMin) / range) * 100}%`;
  const colWidthPct = `${(60 / range) * 100}%`;

  const ticks = [];
  for (let m = Math.ceil(startMin / 60) * 60; m <= endMin; m += 60) ticks.push(m);

  const handleDot = (e, log) => {
    e.stopPropagation();
    const key = `${log.button_type}-${log.start_time}`;
    setActiveDot((prev) => (prev?.key === key ? null : { key, protein: log.button_type, time: fmtTime(log.start_time) }));
  };

  return (
    <div className="dt-wrap" onClick={() => setActiveDot(null)}>
      {/* Tap info bar */}
      <div className={`dt-info ${activeDot ? "visible" : ""}`}>
        {activeDot && (
          <>
            <span className="dt-info-protein">{activeDot.protein}</span>
            <span className="dt-info-sep">·</span>
            <span className="dt-info-time">{activeDot.time}</span>
          </>
        )}
      </div>

      {/* Lanes */}
      {activeProteins.map((p) => {
        const count = logs.filter((l) => l.button_type === p).length;
        return (
          <div key={p} className="dt-row">
            {/* Label + count */}
            <div className="dt-label">
              <span className="dt-label-name">{p}</span>
              <span className="dt-count">{count}</span>
            </div>

            {/* Track */}
            <div className="dt-track">
              {/* Alternating column fills */}
              {ticks.slice(0, -1).map((m, i) => (
                <div
                  key={m}
                  className={`dt-col-fill ${i % 2 === 1 ? "alt" : ""}`}
                  style={{ left: toPct(m), width: colWidthPct }}
                />
              ))}
              {/* Hour grid lines */}
              {ticks.map((m) => (
                <div key={m} className="dt-gridline" style={{ left: toPct(m) }} />
              ))}
              {/* Dots */}
              {logs.filter((l) => l.button_type === p).map((log, i) => {
                const key = `${log.button_type}-${log.start_time}`;
                return (
                  <button
                    key={i}
                    className={`dt-dot ${activeDot?.key === key ? "active" : ""}`}
                    style={{ left: toPct(hawaiiMinutes(log.start_time)) }}
                    onClick={(e) => handleDot(e, log)}
                    aria-label={`${p} at ${fmtTime(log.start_time)}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* X axis */}
      <div className="dt-axis">
        <div className="dt-axis-track">
          {ticks.map((m) => (
            <span key={m} className="dt-tick" style={{ left: toPct(m) }}>
              {fmtHour(m)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────
const Section = ({ title, children, controls }) => (
  <div className="an-section">
    <div className="an-section-header">
      <span className="an-section-title">{title}</span>
      {controls && <div className="an-controls">{controls}</div>}
    </div>
    {children}
  </div>
);

const DarkTooltip = ({ active, payload, label, suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ color: AMBER }}>{payload[0].value}{suffix}</div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────
export default function Analytics() {
  const todayStr = hawaiiToday();
  const todayDate = new Date(todayStr + "T12:00:00");
  const { year: curYear, week: curWeek } = hawaiiCurrentWeek();

  const [dailyDate, setDailyDate] = useState(todayDate);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [weekYear, setWeekYear] = useState(curYear);
  const [weekNum, setWeekNum] = useState(curWeek);
  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weekLabel, setWeekLabel] = useState("");
  const [weekProtein, setWeekProtein] = useState("All");

  const dateToStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const fetchDaily = useCallback(async (date) => {
    setDailyLoading(true);
    try {
      const { start, end } = hawaiiDayBounds(dateToStr(date));
      setDailyLogs(await getLogsForDateRange(start, end));
    } catch (e) {
      console.error("Daily fetch failed:", e);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  useEffect(() => { fetchDaily(dailyDate); }, [dailyDate, fetchDaily]);

  const fetchWeekly = useCallback(async (year, week) => {
    setWeeklyLoading(true);
    try {
      const { start, end, weekStart } = isoWeekBounds(year, week);
      setWeeklyLogs(await getLogsForDateRange(start, end));
      setWeekLabel(fmtWeekLabel(weekStart));
    } catch (e) {
      console.error("Weekly fetch failed:", e);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeekly(weekYear, weekNum); }, [weekYear, weekNum, fetchWeekly]);

  // Weekly holds per day
  const filteredWeekly = weekProtein === "All"
    ? weeklyLogs
    : weeklyLogs.filter((l) => l.button_type === weekProtein);

  const dayCounts = DAYS.map((day, i) => ({
    day,
    count: filteredWeekly.filter((l) => hawaiiDayOfWeek(l.start_time) === i).length,
  }));

  const maxWeeks = 52;
  const weekNums = Array.from({ length: maxWeeks }, (_, i) => i + 1);
  const years = [curYear - 1, curYear, curYear + 1].filter((y) => y > 2020);

  return (
    <div className="an-page">
      <header className="an-header">
        <h1 className="an-title">ANALYTICS</h1>
        <span className="an-subtitle">hold time data</span>
      </header>

      {/* ── Daily Hold Timeline ── */}
      <Section
        title="HOLD TIMELINE"
        controls={
          <div className="an-control-row">
            <label className="an-label">DATE</label>
            <DatePicker
              selected={dailyDate}
              onChange={(d) => d && setDailyDate(d)}
              maxDate={todayDate}
              dateFormat="MMM d, yyyy"
              className="an-input an-datepicker"
              calendarClassName="an-calendar"
              popperPlacement="bottom-end"
            />
            {dateToStr(dailyDate) !== todayStr && (
              <button className="an-today-btn" onClick={() => setDailyDate(todayDate)}>
                today
              </button>
            )}
          </div>
        }
      >
        {dailyLoading ? (
          <div className="loading-wrap"><div className="loading-spinner" /></div>
        ) : (
          <DotTimeline logs={dailyLogs} />
        )}
      </Section>

      {/* ── Weekly: Holds per Day ── */}
      <div className="an-week-filter">
        <div className="an-control-row">
          <label className="an-label">YEAR</label>
          <select className="an-input" value={weekYear} onChange={(e) => setWeekYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="an-control-row">
          <label className="an-label">WEEK</label>
          <select className="an-input" value={weekNum} onChange={(e) => setWeekNum(Number(e.target.value))}>
            {weekNums.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        {weekLabel && <span className="an-week-label">{weekLabel}</span>}
      </div>

      <Section
        title="HOLDS PER DAY"
        controls={
          <div className="an-control-row">
            <label className="an-label">PROTEIN</label>
            <select className="an-input" value={weekProtein} onChange={(e) => setWeekProtein(e.target.value)}>
              <option value="All">All</option>
              {ALL_PROTEINS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        }
      >
        {weeklyLoading ? (
          <div className="loading-wrap"><div className="loading-spinner" /></div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayCounts} style={chartStyle} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#1f1f1f" />
              <XAxis dataKey="day" tick={{ ...axisStyle }} tickLine={false} axisLine={{ stroke: DIM }} />
              <YAxis tick={{ ...axisStyle }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip suffix=" holds" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {dayCounts.map((_, i) => <Cell key={i} fill={RED} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      <div style={{ height: 40 }} />
    </div>
  );
}
