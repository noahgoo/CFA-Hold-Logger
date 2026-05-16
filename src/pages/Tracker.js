import React, { useState, useRef, useEffect } from "react";
import "../App.css";
import ButtonGrid from "../components/ButtonGrid";
import RecentLogs from "../components/RecentLogs";
import { logEvent } from "../services/firebaseService";

function Tracker() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBreakfastMode, setIsBreakfastMode] = useState(false);
  const [cooldowns, setCooldowns] = useState({}); // { [type]: true }
  const timerRefs = useRef({});                   // { [type]: { timerId, logId } }
  const pendingRef = useRef(new Set());           // button types with in-flight Firebase calls

  useEffect(() => {
    return () => Object.values(timerRefs.current).forEach(({ timerId }) => clearTimeout(timerId));
  }, []);

  const handleButtonPress = async (buttonType) => {
    if (cooldowns[buttonType] || pendingRef.current.has(buttonType)) return;
    pendingRef.current.add(buttonType);
    try {
      const docRef = await logEvent(buttonType);
      const timerId = setTimeout(() => {
        setCooldowns((prev) => {
          const next = { ...prev };
          delete next[buttonType];
          return next;
        });
        delete timerRefs.current[buttonType];
      }, 60000);
      timerRefs.current[buttonType] = { timerId, logId: docRef.id };
      setCooldowns((prev) => ({ ...prev, [buttonType]: true }));
      setRefreshTrigger((v) => v + 1);
    } catch {
      alert("Error logging hold. Please try again.");
    } finally {
      pendingRef.current.delete(buttonType);
    }
  };

  const handleLogDelete = (logId) => {
    const entry = Object.entries(timerRefs.current).find(([, v]) => v.logId === logId);
    if (!entry) return;
    const [type, { timerId }] = entry;
    clearTimeout(timerId);
    delete timerRefs.current[type];
    setCooldowns((prev) => {
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
