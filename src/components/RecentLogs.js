import React, { useState, useEffect } from "react";
import { getRecentLogs, deleteLog } from "../services/firebaseService";

const RecentLogs = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Fetch recent logs from Firebase
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const recentLogs = await getRecentLogs(20); // Get last 20 logs
      setLogs(recentLogs);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load recent logs");
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger]);

  // Handle delete log
  const handleDelete = async (logId) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      try {
        setProcessingId(logId);
        await deleteLog(logId);
        await fetchLogs(); // Refresh the logs
      } catch (err) {
        console.error("Error deleting log:", err);
        alert("Failed to delete log");
      } finally {
        setProcessingId(null);
      }
    }
  };

  // Format timestamp for display in Hawaii time
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        timeZone: "Pacific/Honolulu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
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
          onClick={fetchLogs}
          className="text-chickfila-red hover:text-red-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No logs found. Press a button to start logging!
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <span className="font-semibold text-chickfila-red">
                  {log.button_type}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {formatTimestamp(log.timestamp)}
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

      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing last {logs.length} button presses
      </div>
    </div>
  );
};

export default RecentLogs;
