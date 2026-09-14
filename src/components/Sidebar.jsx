import React from "react";
import { Icon } from "./Icons";

export function Sidebar({
  activeView,
  setActiveView,
  aiStatus,
  darkMode,
  setDarkMode,
  historyCount = 0,
  bookmarksCount = 0,
  streakDays = 1,
  onNewSession,
  isOpen,
  onClose
}) {
  const navItems = [
    { id: "workspace", label: "Study Workspace", icon: "brain" },
    { id: "dashboard", label: "Dashboard & Stats", icon: "barChart" },
    { id: "history", label: "Study History", icon: "clock", badge: historyCount },
    { id: "bookmarks", label: "Saved Items", icon: "bookmark", badge: bookmarksCount }
  ];

  return (
    <>
      {/* Mobile Backdrop for Drawer */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-row">
          <button
            className="brand"
            onClick={() => {
              setActiveView("workspace");
              onClose?.();
            }}
          >
            <span className="logo">
              <Icon name="spark" size={19} />
            </span>
            <span className="brand-text">
              MindForge
              <span className="brand-tag">PRO</span>
            </span>
          </button>

          {/* Close button on mobile drawer */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <Icon name="cross" size={18} />
          </button>
        </div>

        {/* Quick New Session Action */}
        <div className="sidebar-action-wrap">
          <button
            className="button primary full sidebar-new-btn"
            onClick={() => {
              onNewSession();
              setActiveView("workspace");
              onClose?.();
            }}
          >
            <Icon name="spark" size={15} />
            <span>New Session</span>
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="sidebar-nav">
          <span className="sidebar-nav-title">WORKSPACE</span>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => {
                setActiveView(item.id);
                onClose?.();
              }}
            >
              <span className="nav-item-icon">
                <Icon name={item.icon} size={16} />
              </span>
              <span className="nav-item-label">{item.label}</span>
              {item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Study Streak Card */}
        <div className="sidebar-streak-box">
          <div className="streak-box-icon">
            <Icon name="flame" size={20} />
          </div>
          <div className="streak-box-info">
            <span className="streak-count">{streakDays} Day Streak</span>
            <small>Practice daily to retain</small>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className={`pill ai-status ${aiStatus.className}`} title={aiStatus.title}>
            <span className="live-dot" />
            <span className="status-label">{aiStatus.label}</span>
          </div>

          <button
            className="icon-button"
            onClick={() => setDarkMode(prev => !prev)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            <Icon name={darkMode ? "sun" : "moon"} size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
