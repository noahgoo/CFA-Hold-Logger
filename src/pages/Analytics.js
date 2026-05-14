import React, { useState, useEffect, useCallback, useRef } from "react";
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
  hawaiiDateString,
  shiftISOWeek,
  getMultiWeekRangeBounds,
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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

// ── Multi-Week Heatmap ────────────────────────────────────
const MW_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const mwCellColor = (count, max) => {
  if (!count) return "transparent";
  const r = count / max;
  if (r >= 1)    return "#f59e0b";
  if (r >= 0.75) return "#e60e33";
  if (r >= 0.5)  return "rgba(230,14,51,0.75)";
  if (r >= 0.25) return "rgba(230,14,51,0.5)";
  return "rgba(230,14,51,0.28)";
};

const fmtShortRange = (weekStart) => {
  const sat = new Date(weekStart.getTime() + 5 * 86400000);
  const fmt = (d) => d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
  return `${fmt(weekStart)}–${fmt(sat)}`;
};

const MultiWeekHeatmap = ({ logs, numWeeks, endYear, endWeek, protein, dailyDateStr, onDayClick }) => {
  const filtered = protein === "All" ? logs : logs.filter((l) => l.button_type === protein);

  const countMap = {};
  filtered.forEach((l) => {
    const d = hawaiiDateString(l.start_time);
    countMap[d] = (countMap[d] ?? 0) + 1;
  });

  const weekRows = [];
  for (let i = -(numWeeks - 1); i <= 0; i++) {
    const { year: y, week: w } = shiftISOWeek(endYear, endWeek, i);
    const { weekStart } = isoWeekBounds(y, w);
    const cells = MW_DAYS.map((_, dayIdx) => {
      const dateStr = new Date(weekStart.getTime() + dayIdx * 86400000)
        .toISOString()
        .slice(0, 10);
      return { dateStr, count: countMap[dateStr] ?? 0 };
    });
    weekRows.push({ label: fmtShortRange(weekStart), cells });
  }

  const allCounts = weekRows.flatMap((r) => r.cells.map((c) => c.count));
  const maxCount = Math.max(1, ...allCounts);

  return (
    <div className="mw-scroll">
      <div className="mw-grid" style={{ "--mw-cols": MW_DAYS.length }}>
        <div />
        {MW_DAYS.map((d) => (
          <div key={d} className="mw-col-header">{d}</div>
        ))}
        {weekRows.map(({ label, cells }, wi) => (
          <React.Fragment key={wi}>
            <div className="mw-day-label" style={{ fontSize: "0.6rem" }}>{label}</div>
            {cells.map(({ dateStr, count }, di) => (
              <button
                key={di}
                className={`mw-cell${count ? " has-data" : ""}${count && dateStr === dailyDateStr ? " selected" : ""}`}
                style={{ backgroundColor: mwCellColor(count, maxCount) }}
                disabled={!count}
                onClick={() => onDayClick(dateStr)}
              >
                {count > 0 && <span className="mw-cell-num">{count}</span>}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
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

// ── Animated height wrapper ───────────────────────────────
const AnimatedHeight = ({ children, style }) => {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(null);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{
      height: height !== null ? height : "auto",
      overflow: "hidden",
      transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      ...style,
    }}>
      <div ref={innerRef}>{children}</div>
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
  const prevDailyLogsRef = useRef([]);

  const [weekYear, setWeekYear] = useState(curYear);
  const [weekNum, setWeekNum] = useState(curWeek);
  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weekLabel, setWeekLabel] = useState("");
  const [weekProtein, setWeekProtein] = useState("All");

  const [mwNumWeeks, setMwNumWeeks] = useState(4);
  const [mwEndYear, setMwEndYear] = useState(curYear);
  const [mwEndWeek, setMwEndWeek] = useState(curWeek);
  const [mwLogs, setMwLogs] = useState([]);
  const [mwLoading, setMwLoading] = useState(false);
  const [mwProtein, setMwProtein] = useState("All");

  const dailySectionRef = useRef(null);

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
  useEffect(() => { if (dailyLogs.length > 0) prevDailyLogsRef.current = dailyLogs; }, [dailyLogs]);

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

  const fetchMultiWeek = useCallback(async (endYear, endWeek, numWeeks) => {
    setMwLoading(true);
    try {
      const { startISO, endISO } = getMultiWeekRangeBounds(endYear, endWeek, numWeeks);
      setMwLogs(await getLogsForDateRange(startISO, endISO));
    } catch (e) {
      console.error("Multi-week fetch failed:", e);
    } finally {
      setMwLoading(false);
    }
  }, []);

  useEffect(() => { fetchMultiWeek(mwEndYear, mwEndWeek, mwNumWeeks); },
    [mwEndYear, mwEndWeek, mwNumWeeks, fetchMultiWeek]);

  const handleMwDayClick = useCallback((dateStr) => {
    setDailyDate(new Date(dateStr + "T12:00:00"));
    dailySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
      <div ref={dailySectionRef}>
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
          <AnimatedHeight style={{ opacity: dailyLoading ? 0.4 : 1, transition: "height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.15s" }}>
            {dailyLogs.length === 0 && prevDailyLogsRef.current.length > 0 ? (
              <div style={{ position: "relative" }}>
                <div style={{ visibility: "hidden" }}>
                  <HeatmapGrid logs={prevDailyLogsRef.current} />
                </div>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p className="logs-empty">no holds logged for this date</p>
                </div>
              </div>
            ) : (
              <HeatmapGrid logs={dailyLogs} />
            )}
          </AnimatedHeight>
        </Section>
      </div>

      {/* ── Multi-Week Overview ── */}
      <Section
        title="MULTI-WEEK OVERVIEW"
        controls={
          <div className="an-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="an-label">WEEKS</label>
            <select className="an-input" value={mwNumWeeks} onChange={(e) => setMwNumWeeks(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button
              className="an-nav-btn"
              onClick={() => { const s = shiftISOWeek(mwEndYear, mwEndWeek, -1); setMwEndYear(s.year); setMwEndWeek(s.week); }}
            >‹</button>
            <button
              className="an-nav-btn"
              disabled={mwEndYear === curYear && mwEndWeek === curWeek}
              onClick={() => { const s = shiftISOWeek(mwEndYear, mwEndWeek, 1); setMwEndYear(s.year); setMwEndWeek(s.week); }}
            >›</button>
            {(mwEndYear !== curYear || mwEndWeek !== curWeek) && (
              <button className="an-today-btn" onClick={() => { setMwEndYear(curYear); setMwEndWeek(curWeek); }}>
                now
              </button>
            )}
            <label className="an-label" style={{ marginLeft: 4 }}>PROTEIN</label>
            <select className="an-input" value={mwProtein} onChange={(e) => setMwProtein(e.target.value)}>
              <option value="All">All</option>
              {ALL_PROTEINS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        }
      >
        {mwLoading ? (
          <div className="loading-wrap"><div className="loading-spinner" /></div>
        ) : (
          <MultiWeekHeatmap
            logs={mwLogs}
            numWeeks={mwNumWeeks}
            endYear={mwEndYear}
            endWeek={mwEndWeek}
            protein={mwProtein}
            dailyDateStr={dateToStr(dailyDate)}
            onDayClick={handleMwDayClick}
          />
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
        <div style={{ opacity: weeklyLoading ? 0.4 : 1, transition: "opacity 0.15s" }}>
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
        </div>
      </Section>

      <div style={{ height: 40 }} />
    </div>
  );
}
