import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Loads every stylesheet: the ones directly in src/ and everything in src/styles/.
// To add a new stylesheet, just drop a .css file in src/styles/ - no import needed.
import.meta.glob(["./*.css", "./styles/*.css"], { eager: true });

createRoot(document.getElementById("root")).render(<App />);
