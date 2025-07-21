import React, { useState, useEffect } from "react";
import "./App.css";
import ButtonGrid from "./components/ButtonGrid";
import RecentLogs from "./components/RecentLogs";
import { logHold } from "./services/firebaseService";

// Key for storing active holds in localStorage
const ACTIVE_HOLDS_KEY = "activeHolds";
const AUTO_RELEASE_DURATION = 15 * 60 * 1000; // 15 minutes

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBreakfastMode, setIsBreakfastMode] = useState(false);
  const [activeHolds, setActiveHolds] = useState({});
  const [releasingHolds, setReleasingHolds] = useState({}); // Lock for auto-releasing holds

  // Load active holds from localStorage on initial render
  useEffect(() => {
    try {
      const savedHolds = localStorage.getItem(ACTIVE_HOLDS_KEY);
      if (savedHolds) {
        setActiveHolds(JSON.parse(savedHolds));
      }
    } catch (error) {
      console.error("Failed to load holds from localStorage:", error);
    }
  }, []);

  // Persist active holds to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_HOLDS_KEY, JSON.stringify(activeHolds));
    } catch (error) {
      console.error("Failed to save holds to localStorage:", error);
    }
  }, [activeHolds]);

  // Auto-release timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      // Find the first expired hold that is not already being released
      const expiredHold = Object.entries(activeHolds).find(
        ([buttonType, startTime]) => {
          const holdDuration = now - new Date(startTime);
          return (
            holdDuration >= AUTO_RELEASE_DURATION && !releasingHolds[buttonType]
          );
        }
      );

      if (expiredHold) {
        const [buttonType, startTime] = expiredHold;

        // Immediately lock the button to prevent reprocessing
        setReleasingHolds((prev) => ({ ...prev, [buttonType]: true }));

        const releaseHold = async () => {
          try {
            // Log the auto-released hold to Firebase
            await logHold(buttonType, startTime, now.toISOString(), true);

            // Remove the hold from the active holds state
            setActiveHolds((prev) => {
              const newHolds = { ...prev };
              delete newHolds[buttonType];
              return newHolds;
            });

            // Trigger a refresh of the recent logs component
            setRefreshTrigger((prev) => prev + 1);
          } catch (error) {
            console.error(`Failed to auto-release ${buttonType}:`, error);
          } finally {
            // Unlock the button after processing is complete
            setReleasingHolds((prev) => {
              const newReleasing = { ...prev };
              delete newReleasing[buttonType];
              return newReleasing;
            });
          }
        };

        releaseHold();
      }
    }, 1000); // Check every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, [activeHolds, releasingHolds]);

  // Function to handle button presses from the grid
  const handleButtonPress = async (buttonType) => {
    const now = new Date().toISOString();

    if (activeHolds[buttonType]) {
      // If the button is already held, this press ends the hold
      const startTime = activeHolds[buttonType];
      try {
        // Log the completed hold to Firebase
        await logHold(buttonType, startTime, now, false); // false for manual release

        // Remove the hold from the active holds state
        setActiveHolds((prev) => {
          const newHolds = { ...prev };
          delete newHolds[buttonType];
          return newHolds;
        });

        // Trigger a refresh of the recent logs component
        setRefreshTrigger((prev) => prev + 1);
      } catch (error) {
        console.error("Failed to log hold:", error);
        alert("There was an error logging the hold. Please try again.");
      }
    } else {
      // If the button is not held, this press starts a new hold
      setActiveHolds((prev) => ({
        ...prev,
        [buttonType]: now,
      }));
    }
  };

  return (
    <div className="App min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-chickfila-red text-chickfila-white py-6 shadow-lg">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            Chick-fil-A Hold Tracker
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Button Grid Section */}
        <section className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-6 border-b border-gray-200 sm:relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Hold Buttons
                  </h2>
                  <p className="text-gray-600">Click a button to log holds.</p>
                </div>

                {/* Toggle Switch - Side Position */}
                <div className="flex items-center justify-center space-x-3 sm:absolute sm:right-6 sm:top-1/2 sm:-translate-y-1/2">
                  <span
                    className={`text-sm font-medium ${
                      !isBreakfastMode ? "text-chickfila-red" : "text-gray-500"
                    }`}
                  >
                    Lunch/Dinner
                  </span>
                  <button
                    onClick={() => setIsBreakfastMode(!isBreakfastMode)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-chickfila-red focus:ring-offset-2
                      ${isBreakfastMode ? "bg-chickfila-red" : "bg-gray-200"}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${isBreakfastMode ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      isBreakfastMode ? "text-chickfila-red" : "text-gray-500"
                    }`}
                  >
                    Breakfast
                  </span>
                </div>
              </div>
            </div>
            <ButtonGrid
              onButtonPress={handleButtonPress}
              isBreakfastMode={isBreakfastMode}
              activeHolds={activeHolds}
            />
          </div>
        </section>

        {/* Recent Logs Section */}
        <section>
          <RecentLogs refreshTrigger={refreshTrigger} />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm opacity-75">Chick-fil-A Hold Tracker System</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
