import React from "react";
import { Icon } from "./Icons";

export function Header({
  activeView,
  setActiveView,
  aiStatus,
  darkMode,
  setDarkMode,
  historyCount = 0,
  bookmarksCount = 0,
  onOpenMobileMenu
}) {
  return (
    <>
      {/* Top Header Bar for Mobile & Compact Views */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-left">
          <button
            className="mobile-menu-btn"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="brand">
            <span className="logo">
              <Icon name="spark" size={17} />
            </span>
            <span className="brand-text">
              MindForge
              <span className="brand-tag">PRO</span>
            </span>
          </div>
        </div>

        <div className="mobile-topbar-right">
          <div className={`pill ai-status ${aiStatus.className}`}>
            <span className="live-dot" />
            <span className="status-label">{aiStatus.label}</span>
          </div>

          <button
            className="icon-button"
            onClick={() => setDarkMode(prev => !prev)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={darkMode ? "sun" : "moon"} size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar for Single-Thumb Ergonomics */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          className={`bottom-nav-item ${activeView === "workspace" ? "active" : ""}`}
          onClick={() => setActiveView("workspace")}
        >
          <Icon name="brain" size={18} />
          <span>Study</span>
        </button>
        <button
          className={`bottom-nav-item ${activeView === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveView("dashboard")}
        >
          <Icon name="barChart" size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={`bottom-nav-item ${activeView === "history" ? "active" : ""}`}
          onClick={() => setActiveView("history")}
        >
          <div className="bottom-nav-icon-wrap">
            <Icon name="clock" size={18} />
            {historyCount > 0 && <span className="bottom-badge">{historyCount}</span>}
          </div>
          <span>History</span>
        </button>
        <button
          className={`bottom-nav-item ${activeView === "bookmarks" ? "active" : ""}`}
          onClick={() => setActiveView("bookmarks")}
        >
          <div className="bottom-nav-icon-wrap">
            <Icon name="bookmark" size={18} />
            {bookmarksCount > 0 && <span className="bottom-badge">{bookmarksCount}</span>}
          </div>
          <span>Saved</span>
        </button>
      </nav>
    </>
  );
}
