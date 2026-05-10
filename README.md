# PROJECT LEO

## SFDS Report Card System

Standalone Phase 1 of the SFDS Report Card System.

## Overview

PROJECT LEO is a lightweight, modular report card and marksheet generator built exclusively with HTML, CSS, and Vanilla JavaScript. It is designed to operate without any external frameworks, ensuring maximum portability and ease of deployment.

## Architecture

- **HTML/CSS/Vanilla JS only** — no frameworks or build steps required.
- **Modular file structure** — each concern is separated into its own file for clarity and maintainability.
- **Print-first design** — layouts are optimized for clean, professional printing.
- **Firebase-ready separation** — configuration and data layers are isolated to allow future cloud integration without refactoring core logic.
- **Standalone compatibility** — runs directly in any modern browser with zero dependencies.

## Structure

- `sfds-reportcard/` — main application files (HTML, CSS, JS, assets).
- `docs/` — architecture rules, roadmap, and database planning documents.
- `kanban/` — project tracking (backlog, in-progress, completed).
- `prompts/` — master prompts and specification parts.
- `testing/` — reserved for test files and fixtures.
- `backups/` — reserved for snapshot backups.

## Future Integration

Phase 1 is fully standalone. Phase 2 will introduce Firebase integration for real-time data persistence, authentication, and analytics—without modifying the existing core logic.
