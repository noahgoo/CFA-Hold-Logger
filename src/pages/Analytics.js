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

// ── Chart theme ──────────────────────────────────────────
const chartStyle = {
  background: "transparent",
};

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
const fmtDuration = (ms) => {
  if (typeof ms !== "number" || ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const fmtWeekLabel = (weekStart) => {
  if (!weekStart) return "";
  const end = new Date(weekStart);
  end.setUTCDate(weekStart.getUTCDate() + 6);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(weekStart)} – ${fmt(end)}`;
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

// ── Custom tooltip ────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ color: AMBER }}>
        {payload[0].value}
        {suffix}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────
export default function Analytics() {
  const todayStr = hawaiiToday();
  const todayDate = new Date(todayStr + "T12:00:00"); // noon avoids TZ shift
  const { year: curYear, week: curWeek } = hawaiiCurrentWeek();

  // Section 1+2 shared: daily data
  const [dailyDate, setDailyDate] = useState(todayDate);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Section 3+4 shared: weekly data
  const [weekYear, setWeekYear] = useState(curYear);
  const [weekNum, setWeekNum] = useState(curWeek);
  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weekLabel, setWeekLabel] = useState("");

  // Section 3 protein filter
  const [weekProtein, setWeekProtein] = useState("All");

  // ── Fetch daily ──────────────────────────────────────────
  const dateToStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const fetchDaily = useCallback(async (date) => {
    setDailyLoading(true);
    try {
      const { start, end } = hawaiiDayBounds(dateToStr(date));
      const logs = await getLogsForDateRange(start, end);
      setDailyLogs(logs);
    } catch (e) {
      console.error("Daily fetch failed:", e);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDaily(dailyDate);
  }, [dailyDate, fetchDaily]);

  // ── Fetch weekly ─────────────────────────────────────────
  const fetchWeekly = useCallback(async (year, week) => {
    setWeeklyLoading(true);
    try {
      const { start, end, weekStart } = isoWeekBounds(year, week);
      const logs = await getLogsForDateRange(start, end);
      setWeeklyLogs(logs);
      setWeekLabel(fmtWeekLabel(weekStart));
    } catch (e) {
      console.error("Weekly fetch failed:", e);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeekly(weekYear, weekNum);
  }, [weekYear, weekNum, fetchWeekly]);

  // ── Derived: Section 1 — Holds per Protein ───────────────
  const proteinCounts = ALL_PROTEINS.map((p) => {
    const entries = dailyLogs.filter((l) => l.button_type === p);
    const count = entries.length;
    const avgMs =
      count > 0
        ? entries.reduce((s, l) => s + (l.duration_ms || 0), 0) / count
        : null;
    return { name: p, count, avgMs };
  }).filter((d) => d.count > 0 || true); // keep all for table

  const activeProteinCounts = proteinCounts.filter((d) => d.count > 0);

  // ── Derived: Section 2 — Holds per Hour ─────────────────
  const hourCounts = Array.from({ length: 24 }, (_, h) => {
    const inHour = dailyLogs.filter((l) => hawaiiHour(l.start_time) === h);
    const proteins = {};
    inHour.forEach((l) => {
      proteins[l.button_type] = (proteins[l.button_type] || 0) + 1;
    });
    return { hour: h, count: inHour.length, proteins };
  });
  const minHour = hourCounts.findIndex((h) => h.count > 0);
  const maxHour = hourCounts.reduce((max, h, i) => (h.count > 0 ? i : max), -1);
  const visibleHours =
    minHour === -1
      ? hourCounts
      : hourCounts.slice(Math.max(0, minHour - 1), maxHour + 2);

  // ── Derived: Section 3 — Holds per Day ──────────────────
  const filteredWeekly =
    weekProtein === "All"
      ? weeklyLogs
      : weeklyLogs.filter((l) => l.button_type === weekProtein);

  const dayCounts = DAYS.map((day, i) => ({
    day,
    count: filteredWeekly.filter((l) => hawaiiDayOfWeek(l.start_time) === i).length,
  }));

  // ── Derived: Section 4 — Avg Duration ───────────────────
  const avgDurations = ALL_PROTEINS.map((p) => {
    const entries = weeklyLogs.filter((l) => l.button_type === p);
    const avgMs =
      entries.length > 0
        ? entries.reduce((s, l) => s + (l.duration_ms || 0), 0) / entries.length
        : null;
    return { name: p, avgSec: avgMs !== null ? Math.round(avgMs / 1000) : null, avgMs };
  });

  const hasAvgData = avgDurations.some((d) => d.avgSec !== null);

  // ── Week selector helpers ────────────────────────────────
  const maxWeeks = 52;
  const weekNums = Array.from({ length: maxWeeks }, (_, i) => i + 1);
  const years = [curYear - 1, curYear, curYear + 1].filter((y) => y > 2020);

  return (
    <div className="an-page">
      {/* Header */}
      <header className="an-header">
        <h1 className="an-title">ANALYTICS</h1>
        <span className="an-subtitle">hold time data</span>
      </header>

      {/* ── Section 1: Hero — Holds per Protein (Daily) ── */}
      <Section
        title="HOLDS PER PROTEIN"
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
          </div>
        }
      >
        {dailyLoading ? (
          <div className="loading-wrap"><div className="loading-spinner" /></div>
        ) : activeProteinCounts.length === 0 ? (
          <p className="logs-empty">no holds logged for this date</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={activeProteinCounts} style={chartStyle} margin={{ top: 8, right: 12, left: -10, bottom: 40 }}>
                <CartesianGrid vertical={false} stroke="#1f1f1f" />
                <XAxis
                  dataKey="name"
                  tick={{ ...axisStyle }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: DIM }}
                />
                <YAxis
                  tick={{ ...axisStyle }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<DarkTooltip suffix=" holds" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {activeProteinCounts.map((_, i) => (
                    <Cell key={i} fill={RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary table */}
            <div className="an-table-wrap">
              <table className="an-table">
                <thead>
                  <tr>
                    <th>PROTEIN</th>
                    <th>COUNT</th>
                    <th>AVG HOLD</th>
                  </tr>
                </thead>
                <tbody>
                  {proteinCounts
                    .filter((d) => d.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map((d) => (
                      <tr key={d.name}>
                        <td>{d.name}</td>
                        <td style={{ color: AMBER }}>{d.count}</td>
                        <td>{fmtDuration(d.avgMs)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* ── Section 2: Holds per Hour ── */}
      <Section
        title="HOLDS PER HOUR"
        controls={
          <span className="an-label" style={{ color: "#555" }}>
            {dateToStr(dailyDate)}
          </span>
        }
      >
        {dailyLoading ? (
          <div className="loading-wrap"><div className="loading-spinner" /></div>
        ) : dailyLogs.length === 0 ? (
          <p className="logs-empty">no data for this date</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={visibleHours} style={chartStyle} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#1f1f1f" />
              <XAxis
                dataKey="hour"
                tick={{ ...axisStyle }}
                tickLine={false}
                axisLine={{ stroke: DIM }}
                tickFormatter={(h) => `${h}:00`}
              />
              <YAxis
                tick={{ ...axisStyle }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const { proteins, count } = payload[0].payload;
                  const sorted = Object.entries(proteins).sort((a, b) => b[1] - a[1]);
                  return (
                    <div style={tooltipStyle}>
                      <div style={{ color: "#888", marginBottom: 6, letterSpacing: "0.05em" }}>
                        {label}:00 — {count} hold{count !== 1 ? "s" : ""}
                      </div>
                      {sorted.map(([protein, cnt]) => (
                        <div key={protein} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 2 }}>
                          <span style={{ color: "#ccc" }}>{protein}</span>
                          <span style={{ color: AMBER }}>×{cnt}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {visibleHours.map((_, i) => (
                  <Cell key={i} fill={RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Section 3+4 shared week filter ── */}
      <div className="an-week-filter">
        <div className="an-control-row">
          <label className="an-label">YEAR</label>
          <select
            className="an-input"
            value={weekYear}
            onChange={(e) => setWeekYear(Number(e.target.value))}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="an-control-row">
          <label className="an-label">WEEK</label>
          <select
            className="an-input"
            value={weekNum}
            onChange={(e) => setWeekNum(Number(e.target.value))}
          >
            {weekNums.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        {weekLabel && (
          <span className="an-week-label">{weekLabel}</span>
        )}
      </div>

      {/* ── Section 3: Holds per Day (Weekly) ── */}
      <Section
        title="HOLDS PER DAY"
        controls={
          <div className="an-control-row">
            <label className="an-label">PROTEIN</label>
            <select
              className="an-input"
              value={weekProtein}
              onChange={(e) => setWeekProtein(e.target.value)}
            >
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
              <XAxis
                dataKey="day"
                tick={{ ...axisStyle }}
                tickLine={false}
                axisLine={{ stroke: DIM }}
              />
              <YAxis
                tick={{ ...axisStyle }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<DarkTooltip suffix=" holds" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {dayCounts.map((_, i) => (
                  <Cell key={i} fill={RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Section 4: Avg Hold Duration (Weekly) ── */}
      <Section title="AVG HOLD DURATION">
        {weeklyLoading ? (
          <div className="loading-wrap"><div className="loading-spinner" /></div>
        ) : !hasAvgData ? (
          <p className="logs-empty">no data for this week</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={avgDurations.filter((d) => d.avgSec !== null)}
                style={chartStyle}
                margin={{ top: 8, right: 12, left: -10, bottom: 48 }}
              >
                <CartesianGrid vertical={false} stroke="#1f1f1f" />
                <XAxis
                  dataKey="name"
                  tick={{ ...axisStyle }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: DIM }}
                />
                <YAxis
                  tick={{ ...axisStyle }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}s`}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div style={tooltipStyle}>
                        <div style={{ color: "#888", marginBottom: 2 }}>{label}</div>
                        <div style={{ color: AMBER }}>{fmtDuration(payload[0].value * 1000)}</div>
                      </div>
                    ) : null
                  }
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="avgSec" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {avgDurations
                    .filter((d) => d.avgSec !== null)
                    .map((_, i) => (
                      <Cell key={i} fill={RED} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Duration table */}
            <div className="an-table-wrap">
              <table className="an-table">
                <thead>
                  <tr>
                    <th>PROTEIN</th>
                    <th>AVG HOLD TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {avgDurations.map((d) => (
                    <tr key={d.name}>
                      <td>{d.name}</td>
                      <td style={{ color: d.avgMs ? AMBER : "#3a3a3a" }}>
                        {d.avgMs ? fmtDuration(d.avgMs) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <div style={{ height: 40 }} />
    </div>
  );
}
