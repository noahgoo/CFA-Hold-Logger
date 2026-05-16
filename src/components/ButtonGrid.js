import React, { useState, useRef, useEffect } from "react";

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
  const modalTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(modalTimerRef.current);
  }, []);

  const buttonTypes = isBreakfastMode ? BREAKFAST_BUTTONS : LUNCH_DINNER_BUTTONS;

  const showModal = () => {
    setModal(true);
    clearTimeout(modalTimerRef.current);
    modalTimerRef.current = setTimeout(() => setModal(false), 10000);
  };

  const hideModal = () => {
    clearTimeout(modalTimerRef.current);
    setModal(false);
  };

  const handlePress = (type) => {
    if (cooldowns[type]) {
      showModal();
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
        <div className="modal-overlay" onClick={hideModal}>
          <div className="cooldown-modal">
            <p>Please wait until the timeout is finished</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ButtonGrid;
