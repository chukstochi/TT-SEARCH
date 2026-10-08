import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Loads whatever stylesheet(s) are in this folder (styles.css, index.css, App.css...), so the file name doesn't matter.
import.meta.glob("./*.css", { eager: true });

createRoot(document.getElementById("root")).render(<App />);
