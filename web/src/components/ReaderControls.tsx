"use client";

import React, { useEffect, useState } from "react";

export function ReaderControls({
  onFontChange,
  fontSize,
}: {
  onFontChange: (size: number) => void;
  fontSize: number;
}) {
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("light");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("ihya_theme") as "light" | "sepia" | "dark") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const changeTheme = (newTheme: "light" | "sepia" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("ihya_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 text-sm">
      {/* Font scale buttons */}
      <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-1">
        <button
          onClick={() => onFontChange(Math.max(14, fontSize - 2))}
          className="px-2 py-1 text-xs font-semibold hover:bg-[var(--bg-card)] rounded transition"
          title="Decrease font size"
        >
          A-
        </button>
        <span className="px-2 text-xs text-[var(--text-muted)] font-mono">{fontSize}px</span>
        <button
          onClick={() => onFontChange(Math.min(28, fontSize + 2))}
          className="px-2 py-1 text-xs font-semibold hover:bg-[var(--bg-card)] rounded transition"
          title="Increase font size"
        >
          A+
        </button>
      </div>

      {/* Theme selection */}
      <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-1">
        <button
          onClick={() => changeTheme("light")}
          className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
            theme === "light" ? "bg-[var(--bg-card)] font-semibold shadow-xs" : "opacity-75 hover:opacity-100"
          }`}
          title="Light Paper Theme"
        >
          ☀️ <span className="hidden sm:inline">Light</span>
        </button>
        <button
          onClick={() => changeTheme("sepia")}
          className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
            theme === "sepia" ? "bg-[var(--bg-card)] font-semibold shadow-xs text-[#8f5b00]" : "opacity-75 hover:opacity-100"
          }`}
          title="Warm Sepia Book Theme"
        >
          📖 <span className="hidden sm:inline">Sepia</span>
        </button>
        <button
          onClick={() => changeTheme("dark")}
          className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
            theme === "dark" ? "bg-[var(--bg-card)] font-semibold shadow-xs" : "opacity-75 hover:opacity-100"
          }`}
          title="OLED Dark Mode"
        >
          🌙 <span className="hidden sm:inline">Dark</span>
        </button>
      </div>
    </div>
  );
}
