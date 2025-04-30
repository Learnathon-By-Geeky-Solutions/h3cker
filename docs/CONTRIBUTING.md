# Contributing Guidelines

Thank you for considering contributing to **learnathon-by-geeky-solutions-h3cker**!  
This project uses a **Django REST API backend** and a **React (Vite + TailwindCSS) frontend**. Follow these guidelines to help us maintain a high-quality codebase.

---

## 🛠️ Project Structure

- **Backend** (`/backend/`) – Django project for API and business logic.
- **Frontend** (`/frontend/`) – React app for the user interface.
- **Dev Logs** (`/dev-log/`) – Developer-specific logs and notes.

---

## 🚀 Getting Started

1. **Fork** the repository and clone it locally.
2. Set up the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   python manage.py migrate
   python manage.py runserver
   ```
3. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## ✅ Contribution Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes:
   - Backend: follow Django best practices.
   - Frontend: keep components modular, styled with Tailwind.

3. Add/update tests if necessary:
   - Backend tests live in `api/tests/`.
   - Frontend tests (if any) should be located near the components.

4. Run tests before committing:
   - Backend: `pytest`
   - Frontend: add your test script if applicable.

5. Commit using clear messages:
   ```bash
   git commit -m "feat: add video upload endpoint"
   ```

6. Push and open a Pull Request. Clearly describe:
   - What you changed
   - Why it was needed
   - Any additional notes or screenshots

---

## 📦 Code Style & Standards

- **Python**: Follow [PEP8](https://pep8.org/). Use `black` or `flake8` if needed.
- **JavaScript/JSX**: Follow standard React formatting, consistent use of hooks and state.
- **TailwindCSS**: Keep styles semantic and avoid duplication.

---

## 🧪 Testing

- Make sure your code does not break existing tests.
- Write unit tests for new features.
- Use meaningful test names and keep tests isolated.

---

## 🧑‍💻 Developer Notes

- Secrets should **never** be committed – use `.env`.
- For Azure, Firebase, or SonarQube-related logic, refer to example files or documentation.
- Update your dev log in `dev-log/` if you're logging daily work.

---

## 🙏 Code of Conduct

Be respectful, collaborative, and helpful. This is a team project and we want everyone to feel welcome.