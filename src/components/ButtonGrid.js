import React, { useState, useEffect } from "react";
import { logButtonPress } from "../services/firebaseService";

// Define the button types as specified in requirements
const BUTTON_TYPES = [
  "Nuggets",
  "Filets",
  "Spicy Filets",
  "Grilled Nuggets",
  "Grilled Filets",
  "Strips",
];

const ButtonGrid = ({ onButtonPress }) => {
  // State to track which buttons are in cooldown
  const [cooldowns, setCooldowns] = useState({});
  const [loading, setLoading] = useState({});

  // Handle button press with 1-minute cooldown
  const handleButtonPress = async (buttonType) => {
    // Check if button is in cooldown
    if (cooldowns[buttonType]) {
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, [buttonType]: true }));

      // Log the button press to Firebase
      await logButtonPress(buttonType);

      // Set cooldown for this button (1 minute = 60000ms)
      setCooldowns((prev) => ({ ...prev, [buttonType]: true }));

      // Clear cooldown after 1 minute
      setTimeout(() => {
        setCooldowns((prev) => ({ ...prev, [buttonType]: false }));
      }, 60000);

      // Notify parent component
      if (onButtonPress) {
        onButtonPress(buttonType);
      }
    } catch (error) {
      console.error("Error handling button press:", error);
      alert("Failed to log button press. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, [buttonType]: false }));
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
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
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6">
      {BUTTON_TYPES.map((buttonType) => {
        const isInCooldown = cooldowns[buttonType];
        const isLoading = loading[buttonType];

        return (
          <button
            key={buttonType}
            onClick={() => handleButtonPress(buttonType)}
            disabled={isInCooldown || isLoading}
            className={`
              btn-chickfila
              ${isInCooldown ? "logged" : ""}
              ${isLoading ? "animate-pulse" : ""}
              text-lg md:text-xl
              min-h-[120px]
              flex flex-col items-center justify-center
              space-y-2
            `}
          >
            <span className="font-bold">
              {isLoading ? "Logging..." : buttonType}
            </span>
            {isInCooldown && (
              <span className="text-sm opacity-75">Cooldown Active</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ButtonGrid;
