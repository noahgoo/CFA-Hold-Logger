import React, { useState, useEffect } from "react";
import {
  getPaginatedLogs,
  getTotalLogsCount,
  deleteLog,
} from "../services/firebaseService";

const PAGE_SIZE = 20;

const RecentLogs = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [pageHistory, setPageHistory] = useState([]);

  const fetchLogs = async (page = 1, useHistory = true) => {
    try {
      setLoading(true);
      setError(null);

      let lastDoc = null;

      if (page === 1) {
        setPageHistory([]);
      } else if (useHistory && pageHistory[page - 2]) {
        lastDoc = pageHistory[page - 2];
      } else {
        const first = await getPaginatedLogs(PAGE_SIZE, null);
        let cursor = first.lastDoc;
        const hist = [cursor];
        for (let i = 2; i < page; i++) {
          if (cursor) {
            const next = await getPaginatedLogs(PAGE_SIZE, cursor);
            cursor = next.lastDoc;
            hist.push(cursor);
          }
        }
        lastDoc = cursor;
        setPageHistory(hist);
      }

      const result = await getPaginatedLogs(PAGE_SIZE, lastDoc);
      setLogs(result.logs);

      if (page > 1 && useHistory && !pageHistory[page - 2]) {
        setPageHistory((prev) => [...prev, lastDoc]);
      }
    } catch {
      setError("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchCount = async () => {
    try {
      const count = await getTotalLogsCount();
      setTotalLogs(count);
      setTotalPages(Math.ceil(count / PAGE_SIZE));
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    fetchLogs(1, false);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const goToPage = async (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    await fetchLogs(page, true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      setProcessingId(id);
      await deleteLog(id);
      await fetchCount();
      if (logs.length === 1 && currentPage > 1) {
        await goToPage(currentPage - 1);
      } else {
        await fetchLogs(currentPage, true);
      }
    } catch {
      alert("Failed to delete log");
    } finally {
      setProcessingId(null);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString("en-US", {
        timeZone: "Pacific/Honolulu",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const formatDuration = (ms) => {
    if (typeof ms !== "number") return "—";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  const pageNums = (() => {
    const total = Math.min(5, totalPages);
    let start = 1;
    if (totalPages > 5) {
      if (currentPage <= 3) start = 1;
      else if (currentPage >= totalPages - 2) start = totalPages - 4;
      else start = currentPage - 2;
    }
    return Array.from({ length: total }, (_, i) => start + i);
  })();

  return (
    <div className="logs-panel">
      <div className="logs-header">
        <span className="logs-title">RECENT HOLDS</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="logs-meta">{totalLogs} total</span>
          <button
            className="logs-refresh"
            onClick={() => {
              setCurrentPage(1);
              setPageHistory([]);
              fetchCount();
              fetchLogs(1, false);
            }}
          >
            refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <div className="loading-spinner" />
        </div>
      ) : error ? (
        <p className="logs-empty">
          {error} —{" "}
          <button
            onClick={() => fetchLogs(currentPage, true)}
            style={{ color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            retry
          </button>
        </p>
      ) : logs.length === 0 ? (
        <p className="logs-empty">no holds yet — press a button to start</p>
      ) : (
        <div className="logs-scroll">
          {logs.map((log) => (
            <div key={log.id} className="log-row">
              <span className="log-item">
                {log.button_type}
                {log.auto_released && <span className="auto-badge">AUTO</span>}
              </span>
              <span className="log-duration">{formatDuration(log.duration_ms)}</span>
              <span className="log-time">{formatTime(log.start_time)}</span>
              <button
                className="log-delete"
                onClick={() => handleDelete(log.id)}
                disabled={processingId === log.id}
                title="Delete"
              >
                {processingId === log.id ? "…" : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">pg {currentPage} / {totalPages}</span>
          <div className="page-buttons">
            <button
              className="page-btn"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ←
            </button>
            {pageNums.map((n) => (
              <button
                key={n}
                className={`page-btn ${currentPage === n ? "current" : ""}`}
                onClick={() => goToPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="page-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentLogs;
