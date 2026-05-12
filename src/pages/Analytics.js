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
  hawaiiHour,
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
const fmtTime = (isoString) =>
  new Date(isoString).toLocaleTimeString("en-US", {
    timeZone: "Pacific/Honolulu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const fmtHourLabel = (h) => {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
};

const fmtWeekLabel = (weekStart) => {
  if (!weekStart) return "";
  const end = new Date(weekStart);
  end.setUTCDate(weekStart.getUTCDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
};

// ── Heatmap Grid ─────────────────────────────────────────
const cellColor = (count) => {
  if (count === 0) return "transparent";
  if (count >= 5)  return "#f59e0b";                 // amber  — 5+
  if (count >= 4)  return "#e60e33";                 // red    — 4
  if (count >= 3)  return "rgba(230,14,51,0.75)";   //         — 3
  if (count >= 2)  return "rgba(230,14,51,0.5)";    //         — 2
  return "rgba(230,14,51,0.28)";                     // dim    — 1
};

const HeatmapGrid = ({ logs }) => {
  const [activeCell, setActiveCell] = useState(null);

  if (logs.length === 0) return <p className="logs-empty">no holds logged for this date</p>;

  const activeProteins = ALL_PROTEINS.filter((p) => logs.some((l) => l.button_type === p));

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm fixed

  // Build cell data
  const cells = {};
  for (const p of activeProteins) {
    for (const h of hours) {
      const matching = logs
        .filter((l) => l.button_type === p && hawaiiHour(l.start_time) === h)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      cells[`${p}-${h}`] = { count: matching.length, times: matching.map((l) => fmtTime(l.start_time)) };
    }
  }

  const handleCell = (e, protein, hour) => {
    e.stopPropagation();
    const cell = cells[`${protein}-${hour}`];
    if (!cell?.count) return;
    const key = `${protein}-${hour}`;
    setActiveCell((prev) => (prev?.key === key ? null : { key, protein, hour, ...cell }));
  };

  return (
    <div className="hm-wrap" onClick={() => setActiveCell(null)}>
      {/* Info bar */}
      <div className={`dt-info ${activeCell ? "visible" : ""}`}>
        {activeCell && (
          <>
            <span className="dt-info-protein">{activeCell.protein}</span>
            <span className="dt-info-sep">·</span>
            <span className="dt-info-time" style={{ color: "var(--text-muted)" }}>
              {fmtHourLabel(activeCell.hour)}–{fmtHourLabel(activeCell.hour + 1)}
            </span>
            <span className="dt-info-sep">·</span>
            <span className="dt-info-time">{activeCell.times.join("  ·  ")}</span>
          </>
        )}
      </div>

      {/* Column headers */}
      <div className="hm-header">
        <div className="hm-label-col" />
        {hours.map((h) => (
          <div key={h} className="hm-cell-col hm-hour-label">{fmtHourLabel(h)}</div>
        ))}
        <div className="hm-total-col hm-col-label">ALL</div>
      </div>

      {/* Protein rows */}
      {activeProteins.map((p) => {
        const total = logs.filter((l) => l.button_type === p).length;
        return (
          <div key={p} className="hm-row">
            <div className="hm-label-col hm-protein-label">{p}</div>
            {hours.map((h) => {
              const key = `${p}-${h}`;
              const cell = cells[key];
              const isActive = activeCell?.key === key;
              return (
                <div key={h} className="hm-cell-col">
                  <button
                    className={`hm-cell ${cell.count > 0 ? "has-data" : ""} ${isActive ? "active" : ""}`}
                    style={{ background: cellColor(cell.count) }}
                    onClick={(e) => handleCell(e, p, h)}
                    disabled={cell.count === 0}
                  >
                    {cell.count > 0 && <span className="hm-cell-num">{cell.count}</span>}
                  </button>
                </div>
              );
            })}
            <div className="hm-total-col hm-total-val">{total}</div>
          </div>
        );
      })}

      {/* Hour totals footer */}
      <div className="hm-row hm-footer-row">
        <div className="hm-label-col hm-footer-label">TOTAL</div>
        {hours.map((h) => {
          const n = logs.filter((l) => hawaiiHour(l.start_time) === h).length;
          return (
            <div key={h} className="hm-cell-col hm-hour-total">{n || ""}</div>
          );
        })}
        <div className="hm-total-col hm-total-val" style={{ color: AMBER, fontWeight: 700 }}>
          {logs.length}
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
          <HeatmapGrid logs={dailyLogs} />
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
