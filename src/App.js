import React, { useState } from "react";
import "./App.css";
import ButtonGrid from "./components/ButtonGrid";
import RecentLogs from "./components/RecentLogs";

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handle button press from ButtonGrid
  const handleButtonPress = (buttonType) => {
    console.log(`Button pressed: ${buttonType}`);
    // Trigger refresh of recent logs
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="App min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-chickfila-red text-chickfila-white py-6 shadow-lg">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            Chick-fil-A Hold Logger
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Button Grid Section */}
        <section className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Hold Buttons</h2>
              <p className="text-gray-600 mt-1">
                Click a button to log holds. Each button has a 1-minute
                cooldown.
              </p>
            </div>
            <ButtonGrid onButtonPress={handleButtonPress} />
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
          <p className="text-sm opacity-75">
            Chick-fil-A Hold Logger - Hold Tracking System
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
