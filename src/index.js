import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import Map from "./Map.js";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <React.StrictMode>
        <Map width={12} height={8} />
    </React.StrictMode>
);
