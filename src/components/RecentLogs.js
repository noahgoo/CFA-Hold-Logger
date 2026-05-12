import React, { useState, useEffect } from "react";
import {
  getPaginatedLogs,
  getTotalLogsCount,
  deleteLog,
} from "../services/firebaseService";

const RecentLogs = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [pageSize] = useState(20);
  const [pageHistory, setPageHistory] = useState([]); // Store lastDoc for each page

  const fetchLogs = async (page = 1, useHistory = true) => {
    try {
      setLoading(true);
      setError(null);

      let targetLastDoc = null;

      if (page === 1) {
        // First page - no lastDoc needed
        targetLastDoc = null;
        setPageHistory([]);
      } else if (useHistory && pageHistory[page - 2]) {
        // Use stored lastDoc from history
        targetLastDoc = pageHistory[page - 2];
      } else {
        // Need to navigate from page 1 to target page
        const result = await getPaginatedLogs(pageSize, null);
        let currentLastDoc = result.lastDoc;
        const newHistory = [currentLastDoc];

        for (let i = 2; i < page; i++) {
          if (currentLastDoc) {
            const nextResult = await getPaginatedLogs(pageSize, currentLastDoc);
            currentLastDoc = nextResult.lastDoc;
            newHistory.push(currentLastDoc);
          }
        }

        targetLastDoc = currentLastDoc;
        setPageHistory(newHistory);
      }

      const result = await getPaginatedLogs(pageSize, targetLastDoc);
      setLogs(result.logs);

      // Update page history if needed
      if (page > 1 && useHistory && !pageHistory[page - 2]) {
        setPageHistory((prev) => [...prev, targetLastDoc]);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load recent logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const count = await getTotalLogsCount();
      setTotalLogs(count);
      setTotalPages(Math.ceil(count / pageSize));
    } catch (err) {
      console.error("Error fetching total count:", err);
    }
  };

  useEffect(() => {
    fetchTotalCount();
    fetchLogs(1, false);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleDelete = async (logId) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      try {
        setProcessingId(logId);
        await deleteLog(logId);

        // Refresh total count first
        await fetchTotalCount();

        // Check if this was the last log on the current page
        if (logs.length === 1 && currentPage > 1) {
          // This was the only log on the page, go back to previous page
          await goToPage(currentPage - 1);
        } else {
          // Refresh current page
          await fetchLogs(currentPage, true);
        }
      } catch (err) {
        console.error("Error deleting log:", err);
        alert("Failed to delete log");
      } finally {
        setProcessingId(null);
      }
    }
  };

  const goToPage = async (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    await fetchLogs(page, true);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        timeZone: "Pacific/Honolulu",
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatDuration = (durationMs) => {
    if (typeof durationMs !== "number") return "N/A";
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 m-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Logs</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chickfila-red"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 m-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Logs</h2>
        <div className="text-red-600 text-center py-4">
          {error}
          <button
            onClick={fetchLogs}
            className="ml-2 text-chickfila-red underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 m-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Recent Logs</h2>
        <button
          onClick={() => {
            setCurrentPage(1);
            setPageHistory([]);
            fetchLogs(1, false);
          }}
          className="text-chickfila-red hover:text-red-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No logs found. Press a button to start a 'hold'!
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-chickfila-red flex items-center">
                {log.button_type}
                {log.auto_released && (
                  <span className="ml-2 text-xs font-bold rounded px-2 py-1 bg-orange-100 text-orange-700 border border-orange-400">
                    AUTO
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-gray-800 text-center">
                {formatDuration(log.duration_ms)}
              </div>
              <div className="flex justify-end items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {formatTimestamp(log.start_time)}
                </span>
                <button
                  onClick={() => handleDelete(log.id)}
                  disabled={processingId === log.id}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete"
                >
                  {processingId === log.id ? "⏳" : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} • {totalLogs} total logs
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-chickfila-red hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed border border-gray-300 rounded-md hover:bg-gray-50 disabled:hover:bg-transparent"
            >
              ← Previous
            </button>

            <div className="flex items-center space-x-1">
              {/* Show page numbers around current page */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-2 py-1 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? "bg-chickfila-red text-white"
                        : "text-gray-600 hover:text-chickfila-red hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-chickfila-red hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed border border-gray-300 rounded-md hover:bg-gray-50 disabled:hover:bg-transparent"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {logs.length} logs on page {currentPage} of {totalPages}
      </div>
    </div>
  );
};

export default RecentLogs;
