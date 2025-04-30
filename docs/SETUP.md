# Development Setup

This guide will help you set up the development environment for the **learnathon-by-geeky-solutions-h3cker** project.

The project is divided into two main parts:
- **Backend**: Django REST Framework
- **Frontend**: React with Vite and TailwindCSS

---

## 🔃 Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/learnathon-by-geeky-solutions-h3cker.git
cd learnathon-by-geeky-solutions-h3cker
```

---

## 🐍 Step 2: Backend Setup (Django)

### 1. Create a virtual environment and activate it

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Setup environment variables

```bash
cp .env.example .env
# Then, edit .env to add necessary values
```

### 4. Run migrations and start the development server

```bash
python manage.py migrate
python manage.py runserver
```

Your Django backend should now be running at `http://127.0.0.1:8000/`.

---

## ⚛️ Step 3: Frontend Setup (React + Vite)

### 1. Navigate to the frontend directory

```bash
cd ../frontend
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Your React frontend should now be running at `http://localhost:5173/` (default Vite port).

---

## ✅ Optional: SonarQube Setup

The repository contains a `sonar-project.properties` file and GitHub Actions workflow to run static analysis with SonarQube.

Make sure to set up a SonarQube token and configure it in the GitHub repository settings for CI/CD integration.

---

You're all set! Happy coding 🎉