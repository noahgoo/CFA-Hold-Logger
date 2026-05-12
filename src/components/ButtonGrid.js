import React, { useState, useEffect } from "react";

const BREAKFAST_BUTTONS = [
  "Nuggets",
  "Breakfast Filets",
  "Spicy Bkfst Filets",
  "Grilled Bkfst Filets",
  "Hashbrowns",
];

const LUNCH_DINNER_BUTTONS = [
  "Nuggets",
  "Filets",
  "Spicy Filets",
  "Strips",
  "Grilled Nuggets",
  "Grilled Filets",
  "Fries",
];

const ButtonGrid = ({ onButtonPress, isBreakfastMode, activeHolds }) => {
  const [elapsedTimes, setElapsedTimes] = useState({});

  const buttonTypes = isBreakfastMode ? BREAKFAST_BUTTONS : LUNCH_DINNER_BUTTONS;

  useEffect(() => {
    const interval = setInterval(() => {
      const times = {};
      for (const [type, start] of Object.entries(activeHolds)) {
        const diff = new Date() - new Date(start);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        times[type] = h > 0
          ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      setElapsedTimes(times);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHolds]);

  return (
    <div className="button-grid">
      {buttonTypes.map((type) => {
        const isHeld = !!activeHolds[type];
        return (
          <button
            key={type}
            onClick={() => onButtonPress(type)}
            className={`hold-btn ${isHeld ? "holding" : ""}`}
          >
            <span className="btn-label">{type}</span>
            {isHeld && (
              <>
                <span className="holding-badge">HOLDING</span>
                <span className="hold-timer">{elapsedTimes[type] || "00:00"}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ButtonGrid;
