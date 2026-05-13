import React, { useState } from "react";

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

const ButtonGrid = ({ onButtonPress, isBreakfastMode }) => {
  const [flashing, setFlashing] = useState({});

  const buttonTypes = isBreakfastMode ? BREAKFAST_BUTTONS : LUNCH_DINNER_BUTTONS;

  const handlePress = (type) => {
    onButtonPress(type);
    setFlashing((prev) => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setFlashing((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
    }, 3000);
  };

  return (
    <div className="button-grid">
      {buttonTypes.map((type) => (
        <button
          key={type}
          onClick={() => handlePress(type)}
          className={`hold-btn ${flashing[type] ? "flashing" : ""}`}
        >
          <span className="btn-label">{type}</span>
        </button>
      ))}
    </div>
  );
};

export default ButtonGrid;
