"use client";

import { useState } from "react";
import { useLanguage, type Language } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const labels: Record<Language, string> = {
    ru: "Русский",
    lv: "Latviešu",
    en: "English",
  };

  const options: Language[] = ["ru", "lv", "en"];

  return (
    <div
      aria-label="Language selector"
      style={{
        position: "fixed",
        top: "50%",
        right: "12px",
        bottom: "auto",
        left: "auto",
        transform: "translateY(-50%)",
        zIndex: 2147483000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
        pointerEvents: "auto",
      }}
    >
      {open && (
        <div
          role="menu"
          aria-label="Choose language"
          style={{
            width: "154px",
            padding: "6px",
            border: "1px solid #41434b",
            borderRadius: "8px",
            background: "rgba(13,14,18,.98)",
            boxShadow: "0 12px 36px rgba(0,0,0,.6)",
            backdropFilter: "blur(14px)",
          }}
        >
          {options.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              onClick={() => {
                setLanguage(code);
                setOpen(false);
              }}
              aria-current={language === code ? "true" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "11px 10px",
                border: 0,
                borderRadius: "5px",
                background: language === code ? "#292027" : "transparent",
                color: language === code ? "#fff" : "#b7b9c1",
                cursor: "pointer",
                textAlign: "left",
                font: "600 12px Inter, Arial, sans-serif",
              }}
            >
              <span style={{ color: "#ef454d", fontWeight: 900, letterSpacing: "1px", width: "22px" }}>
                {code.toUpperCase()}
              </span>
              <span>{labels[code]}</span>
              {language === code && <span style={{ marginLeft: "auto", color: "#ef454d" }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Change language, current language: ${labels[language]}`}
        style={{
          minWidth: "52px",
          minHeight: "76px",
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "9px",
          border: "1px solid #49414a",
          borderRight: 0,
          borderRadius: "9px 0 0 9px",
          background: "linear-gradient(145deg, rgba(31,24,29,.98), rgba(10,11,15,.98))",
          color: "#f4f4f5",
          cursor: "pointer",
          boxShadow: "0 8px 28px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.07)",
          backdropFilter: "blur(12px)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{ width: "20px", height: "20px", fill: "none", stroke: "#ef454d", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        </svg>
        <span style={{ color: "#fff", font: "900 10px Inter, Arial, sans-serif", letterSpacing: "1.3px" }}>
          {language.toUpperCase()}
        </span>
        <span style={{ width: "16px", height: "2px", background: "#ef3038", borderRadius: "2px" }} />
      </button>
    </div>
  );
}
