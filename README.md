# Crosswire: Custom Interactive Crossword with Progressive Reveal & Rebus Mechanics

A high-performance, full-stack crossword puzzle web application featuring **progressive grid unlocking**, **dynamic multi-letter rebus entry**, **dynamic multi-theme generation**, and **editorial styling with vibrant animations**.

[![Live Interactive Demo](https://img.shields.io/badge/Demo-Live_Interactive_Crossword-06b6d4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://maheshbawne987-coder.github.io/custom-crossword-prototype/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

---

## 🌟 Key Architecture & Features

### 1. 🔓 Progressive Grid & Clue Reveal
- Rows and clues remain strictly locked until preceding stages are verified.
- 3D card flip animations and sound feedback trigger upon stage validation.
- Prevents spoilers and drives structured puzzle pacing.

### 2. 🔠 Native Rebus Multi-Letter Square Support
- Specific cells dynamically expand to support multi-character entries (e.g. `ICE`, `FISH`, `STAR`).
- Fluid font scaling and autofocus keep grid alignment intact across both desktop and mobile.

### 3. 📊 Ready for Custom Excel Ingestion
- Ingests grid layouts, cell coordinates, across/down clues, and rebus solution keys directly from Microsoft Excel spreadsheets or JSON schemas.
- Turn any Excel crossword draft into a production web app in minutes.

### 4. ⚡ Dual-Mode Engine (Static Global CDN & Python REST Backend)
- **Standalone Global Mode**: Runs on any modern browser via GitHub Pages / CDN without requiring server infrastructure.
- **Python REST Backend**: Hardened HTTP server (`backend/server.py`) with rate-limiting, timing-safe equality checks, and strict payload validation.

---

## 🎮 Play Live Demo
Experience the working prototype live in your browser:
👉 **[https://maheshbawne987-coder.github.io/custom-crossword-prototype/](https://maheshbawne987-coder.github.io/custom-crossword-prototype/)**

---

## 🛠️ Local Development & Quick Start

### Option A: Open directly in browser
Open `index.html` in any web browser.

### Option B: Run with Python REST Backend
```bash
python backend/server.py
# Server listens on http://127.0.0.1:8080
```

---

## 📄 License
MIT License. Built for custom interactive crossword solutions.
