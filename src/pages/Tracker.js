import React, { useState } from "react";
import "../App.css";
import ButtonGrid from "../components/ButtonGrid";
import RecentLogs from "../components/RecentLogs";
import { logEvent } from "../services/firebaseService";

function Tracker() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBreakfastMode, setIsBreakfastMode] = useState(false);
  const [cooldowns, setCooldowns] = useState({});

  const handleButtonPress = async (buttonType) => {
    try {
      const docRef = await logEvent(buttonType);
      const timerId = setTimeout(() => {
        setCooldowns((prev) => {
          const next = { ...prev };
          delete next[buttonType];
          return next;
        });
      }, 60000);
      setCooldowns((prev) => ({ ...prev, [buttonType]: { logId: docRef.id, timerId } }));
      setRefreshTrigger((v) => v + 1);
    } catch {
      alert("Error logging hold. Please try again.");
    }
  };

  const handleLogDelete = (logId) => {
    setCooldowns((prev) => {
      const entry = Object.entries(prev).find(([, v]) => v.logId === logId);
      if (!entry) return prev;
      const [type, { timerId }] = entry;
      clearTimeout(timerId);
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="header-title">
          TRACK<span>ER</span>
        </h1>

        <div className="mode-toggle">
          <span className={`mode-label ${!isBreakfastMode ? "active" : ""}`}>
            LUNCH
          </span>
          <button
            className={`toggle-track ${isBreakfastMode ? "on" : ""}`}
            onClick={() => setIsBreakfastMode((v) => !v)}
            aria-label="Toggle breakfast mode"
          >
            <span className="toggle-thumb" />
          </button>
          <span className={`mode-label ${isBreakfastMode ? "active" : ""}`}>
            BKFST
          </span>
        </div>
      </header>

      <ButtonGrid
        onButtonPress={handleButtonPress}
        isBreakfastMode={isBreakfastMode}
        cooldowns={cooldowns}
      />

      <RecentLogs refreshTrigger={refreshTrigger} onLogDelete={handleLogDelete} />
    </div>
  );
}

export default Tracker;
