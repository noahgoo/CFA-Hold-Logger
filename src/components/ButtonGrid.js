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

const ButtonGrid = ({ onButtonPress, isBreakfastMode, cooldowns }) => {
  const [modal, setModal] = useState(false);

  const buttonTypes = isBreakfastMode ? BREAKFAST_BUTTONS : LUNCH_DINNER_BUTTONS;

  const handlePress = (type) => {
    if (cooldowns[type]) {
      setModal(true);
      return;
    }
    onButtonPress(type);
  };

  return (
    <>
      <div className="button-grid">
        {buttonTypes.map((type) => (
          <button
            key={type}
            onClick={() => handlePress(type)}
            className={`hold-btn ${isBreakfastMode ? "breakfast" : ""} ${cooldowns[type] ? "cooldown" : ""}`}
          >
            <span className="btn-label">{type}</span>
          </button>
        ))}
      </div>
      {modal && (
        <div className="cooldown-modal-overlay" onClick={() => setModal(false)}>
          <div className="cooldown-modal">
            <p>Please wait until the timeout is finished</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ButtonGrid;
