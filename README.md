# SmartFactory-Nexus 🏭🤖

> **Next-Generation Smart Manufacturing Intelligence Platform**

SmartFactory-Nexus is an enterprise-grade web application combining modern full-stack engineering, Machine Learning, and Generative AI. It acts as a comprehensive Manufacturing Execution System (MES) capable of real-time monitoring, predictive maintenance, inventory management, and intelligent quality control.

![SmartFactory-Nexus Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Gateway-Express.js-339933?logo=node.js)
![Python](https://img.shields.io/badge/AI_Service-FastAPI-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)

---

## 🌟 Core Features

- **Fleet Dashboard**: Real-time telemetry monitoring for connected CNC machines and assembly line equipment.
- **Predictive Maintenance (AI)**: Integrates a Scikit-Learn `RandomForestClassifier` trained dynamically in memory to predict machine failure probabilities based on temperature and running hours.
- **Factory Assistant (LLM)**: A context-aware chatbot powered by the `google-genai` SDK. It fetches live factory statistics from PostgreSQL and injects them into the LLM prompt to answer production questions.
- **Inventory Management**: Real-time raw material and component tracking with automatic low-stock warnings.
- **Quality Control & Vision**: Batch inspection tracking featuring a mock Computer Vision feed (simulating YOLOv8) to identify defects on the assembly line.
- **Enterprise Security**: JWT-based authentication system protecting API routes and dashboard views.

---

## 🏗️ Architecture

The platform utilizes a modern microservice architecture orchestrated by Docker Compose:

1. **Frontend (React/TypeScript/Vite)**: 
   - Renders a stunning dark-mode, glassmorphism UI.
   - Communicates solely with the API Gateway.
2. **API Gateway (Express/Node.js)**: 
   - Acts as the central router and auth validator.
   - Manages direct connections to the PostgreSQL database for CRUD operations.
   - Proxies AI-related requests to the Python FastAPI service.
3. **AI Service (FastAPI/Python)**:
   - Hosts the ML predictive models.
   - Interfaces with the Gemini LLM.
4. **Database (PostgreSQL)**:
   - Stores telemetry, inventory, users, and quality control data.

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (3.10+)
- Gemini API Key (Optional, for LLM Assistant)

### 1. Boot the Database
Start the PostgreSQL and Redis containers in the background:
```bash
docker-compose up -d
```
*(Note: The database automatically seeds itself with mock data upon boot via API Gateway auto-migrations).*

### 2. Start the Services
You can start all services at once using the provided PowerShell script:
```bash
.\start-all.ps1
```

Or manually start them in separate terminals:

**Terminal 1 (AI Service)**
```bash
cd ai-service
# Add GEMINI_API_KEY to your .env file if available
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 (API Gateway)**
```bash
cd api-gateway
npm install
npm run dev
```

**Terminal 3 (Frontend)**
```bash
cd frontend
npm install
npm run dev
```

### 3. Access the Platform
Navigate to **http://localhost:5173** in your browser.

- **Username:** `admin`
- **Password:** `password123`

---

## 💡 About the Author

This platform was built to demonstrate proficiency in end-to-end software engineering, cloud deployment, and practical AI integration for the manufacturing sector.

*Built for the future of Industry 4.0.*
