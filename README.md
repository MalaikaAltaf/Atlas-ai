# 🗺️ Atlas AI: The Personalized Learning Navigator

[![Python 3.13](https://img.shields.io/badge/Python-3.13-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Uvicorn](https://img.shields.io/badge/Server-Uvicorn-purple)](https://www.uvicorn.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%202.0-886FBF?style=flat&logo=googlegemini)](https://ai.google.dev/)

**Atlas AI** is an intelligent Chrome Extension that transforms static web pages and PDFs into dynamic, interactive learning environments. By integrating  **Multimodal AI**, and **Real-time Search**, Atlas AI ensures that students and researchers don't just read information—they master it.

---



---

## ✨ Core Features

### 🧠 Logic Flow & Mindmaps
Automatically extract the DNA of any article or PDF. Atlas AI generates interactive **SVG Mindmaps** that visualize complex hierarchies, making logical structures easy to navigate at a glance.

### 💻 Instant Playground
A built-in, sandboxed Python environment. Highlight complex equations in research papers to instantly generate and execute code snippets. Perfect for data science and mathematical modeling.

### 📄 PDF Intelligence
Seamlessly analyze both web-based and local (`file:///`) PDFs. The system uses high-fidelity text extraction to provide contextual summaries without losing document metadata.

### 🎯 Adaptive Learning Levels
Toggle between **Beginner**, **Student**, and **Expert** modes. The AI shifts its tone, vocabulary, and depth to match your current knowledge level, utilizing advanced prompt engineering.

### 🔍 Verified Reference Search
Eliminate AI hallucinations. Atlas AI uses a **Search Tool-Use** layer to find real, live research papers, YouTube tutorials, and university courses related to your topic.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), Manifest V3, HTML5/CSS3.
- **Backend:** FastAPI, Uvicorn, Pydantic.
- **Database:** Vector DB for semantic document retrieval.
- **AI Engine:** Google Gemini 2.0 (Multimodal).
- **Search API:** Serper.dev / Google Search.

---

## 🚀 Local Installation

### 1. Backend Setup
```bash
# Navigate to backend folder
cd atlas-backend

# Activate Virtual Environment
.venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Start the server (as seen in screenshots)
python -m uvicorn main:app --reload
