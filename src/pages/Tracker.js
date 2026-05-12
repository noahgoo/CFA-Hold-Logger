import React, { useState } from "react";
import "../App.css";
import ButtonGrid from "../components/ButtonGrid";
import RecentLogs from "../components/RecentLogs";
import { logEvent } from "../services/firebaseService";

function Tracker() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBreakfastMode, setIsBreakfastMode] = useState(false);

  const handleButtonPress = async (buttonType) => {
    try {
      await logEvent(buttonType);
      setRefreshTrigger((v) => v + 1);
    } catch {
      alert("Error logging hold. Please try again.");
    }
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
      />

      <RecentLogs refreshTrigger={refreshTrigger} />
    </div>
  );
}

export default Tracker;
