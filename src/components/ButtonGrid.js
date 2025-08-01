import React, { useState, useEffect } from "react";

const BREAKFAST_BUTTONS = [
  "Nuggets",
  "Breakfast Filets",
  "Spicy Breakfast Filets",
  "Grilled Breakfast Filets",
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

  const buttonTypes = isBreakfastMode
    ? BREAKFAST_BUTTONS
    : LUNCH_DINNER_BUTTONS;

  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsedTimes = {};
      for (const buttonType in activeHolds) {
        const startTime = new Date(activeHolds[buttonType]);
        const now = new Date();
        const difference = now - startTime;

        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        newElapsedTimes[buttonType] =
          `${hours.toString().padStart(2, "0")}:` +
          `${minutes.toString().padStart(2, "0")}:` +
          `${seconds.toString().padStart(2, "0")}`;
      }
      setElapsedTimes(newElapsedTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHolds]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6">
      {buttonTypes.map((buttonType) => {
        const isHeld = !!activeHolds[buttonType];

        return (
          <button
            key={buttonType}
            onClick={() => onButtonPress(buttonType)}
            className={`
              btn-chickfila
              ${isHeld ? "logged" : ""}
              text-lg md:text-xl
              min-h-[120px]
              flex flex-col items-center justify-center
              space-y-2
            `}
          >
            <span className="font-bold">{buttonType}</span>
            {isHeld && (
              <>
                <span className="text-sm opacity-90 font-semibold">
                  HOLDING
                </span>
                <span className="text-xs opacity-80 mt-1">
                  {elapsedTimes[buttonType]}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ButtonGrid;
