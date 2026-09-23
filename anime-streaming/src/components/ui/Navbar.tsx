"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Каталог", href: "#catalog" },
    { label: "Популярное", href: "#popular" },
    { label: "Новинки", href: "#new" },
    { label: "Жанры", href: "#genres" },
  ];

  return (
    <nav
      id="main-navbar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        background: scrolled
          ? "rgba(0, 0, 0, 0.8)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(150%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(150%)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(200, 50, 20, 0.08)"
          : "1px solid transparent",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: scrolled ? "56px" : "72px",
          transition: "height 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          id="navbar-logo"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          {/* Fire icon */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(200, 50, 20, 0.9), rgba(160, 30, 10, 0.8))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(200, 50, 20, 0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(255,255,255,0.15), transparent)",
                borderRadius: "8px",
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C10 6 6 8 6 13C6 16.866 8.686 20 12 20C15.314 20 18 16.866 18 13C18 8 14 6 12 2Z"
                fill="rgba(255,255,255,0.9)"
              />
              <path
                d="M12 10C11 12 9.5 13 9.5 15.5C9.5 17.157 10.62 18.5 12 18.5C13.38 18.5 14.5 17.157 14.5 15.5C14.5 13 13 12 12 10Z"
                fill="rgba(200, 50, 20, 0.9)"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 300,
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.75)",
            }}
          >
            Anifire
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div
          className="nav-links-desktop"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-link"
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 400,
                color: "rgba(255, 255, 255, 0.45)",
                textDecoration: "none",
                transition: "all 0.3s ease",
                position: "relative",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div
          className="nav-actions-desktop"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Search */}
          <button
            id="search-btn"
            className="nav-icon-btn"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              color: "rgba(255, 255, 255, 0.35)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Sign In */}
          <Link
            href="/login"
            id="sign-in-btn"
            className="sign-in-btn"
            style={{
              display: "inline-block",
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(200, 50, 20, 0.25)",
              background: "rgba(200, 50, 20, 0.1)",
              color: "rgba(255, 200, 180, 0.8)",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.3s ease",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Войти
          </Link>

          {/* Mobile menu */}
          <button
            id="mobile-menu-btn"
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
              background: "transparent",
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "4px",
              padding: "9px",
            }}
          >
            <span
              style={{
                width: "16px",
                height: "1.5px",
                background: "rgba(255,255,255,0.5)",
                borderRadius: "2px",
                transition: "all 0.3s ease",
                transform: menuOpen ? "rotate(45deg) translate(2px, 2px)" : "none",
              }}
            />
            <span
              style={{
                width: "16px",
                height: "1.5px",
                background: "rgba(255,255,255,0.5)",
                borderRadius: "2px",
                transition: "all 0.3s ease",
                opacity: menuOpen ? 0 : 1,
              }}
            />
            <span
              style={{
                width: "16px",
                height: "1.5px",
                background: "rgba(255,255,255,0.5)",
                borderRadius: "2px",
                transition: "all 0.3s ease",
                transform: menuOpen ? "rotate(-45deg) translate(2px, -2px)" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className="mobile-menu"
        style={{
          maxHeight: menuOpen ? "320px" : "0px",
          overflow: "hidden",
          transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          background: "rgba(0, 0, 0, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: menuOpen ? "1px solid rgba(200, 50, 20, 0.08)" : "none",
        }}
      >
        <div style={{ padding: "12px 32px 20px" }}>
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block",
                padding: "12px 0",
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 400,
                letterSpacing: "1px",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                transition: "color 0.2s ease",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
