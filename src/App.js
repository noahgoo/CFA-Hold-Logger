import React, { useState, useEffect } from "react";
import "./App.css";
import ButtonGrid from "./components/ButtonGrid";
import RecentLogs from "./components/RecentLogs";
import { logHold } from "./services/firebaseService";

const ACTIVE_HOLDS_KEY = "activeHolds";
const AUTO_RELEASE_DURATION = 15 * 60 * 1000;

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBreakfastMode, setIsBreakfastMode] = useState(false);
  const [activeHolds, setActiveHolds] = useState({});
  const [releasingHolds, setReleasingHolds] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_HOLDS_KEY);
      if (saved) setActiveHolds(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_HOLDS_KEY, JSON.stringify(activeHolds));
    } catch {}
  }, [activeHolds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const expired = Object.entries(activeHolds).find(([type, start]) => {
        return now - new Date(start) >= AUTO_RELEASE_DURATION && !releasingHolds[type];
      });

      if (expired) {
        const [type, start] = expired;
        setReleasingHolds((prev) => ({ ...prev, [type]: true }));

        (async () => {
          try {
            const autoTime = new Date(new Date(start).getTime() + AUTO_RELEASE_DURATION);
            await logHold(type, start, autoTime.toISOString(), true);
            setActiveHolds((prev) => {
              const next = { ...prev };
              delete next[type];
              return next;
            });
            setRefreshTrigger((prev) => prev + 1);
          } catch (err) {
            console.error(`Auto-release failed for ${type}:`, err);
          } finally {
            setReleasingHolds((prev) => {
              const next = { ...prev };
              delete next[type];
              return next;
            });
          }
        })();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHolds, releasingHolds]);

  const handleButtonPress = async (buttonType) => {
    const now = new Date().toISOString();

    if (activeHolds[buttonType]) {
      const start = activeHolds[buttonType];
      try {
        await logHold(buttonType, start, now, false);
        setActiveHolds((prev) => {
          const next = { ...prev };
          delete next[buttonType];
          return next;
        });
        setRefreshTrigger((prev) => prev + 1);
      } catch {
        alert("Error logging hold. Please try again.");
      }
    } else {
      setActiveHolds((prev) => ({ ...prev, [buttonType]: now }));
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
        activeHolds={activeHolds}
      />

      <RecentLogs refreshTrigger={refreshTrigger} />
    </div>
  );
}

export default App;
