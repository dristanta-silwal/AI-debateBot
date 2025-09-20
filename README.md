# DebateBot

DebateBot is a full-stack proof-of-concept application that enables turn-based debates between a human user and an AI (powered by Gemini).  
The backend is built with **FastAPI**, and the frontend is a static **HTML + TailwindCSS** interface.  

## Features
- Start a debate by specifying a topic and choosing the AI's side (**PRO** or **CON**).
- Structured, turn-based exchanges with word-count validation (120–180 words per turn).
- AI persona enforced with clear debate rules (formal, professional, respectful tone).
- Supports switching debate sides mid-session (`[SWITCH]` keyword).
- Graceful error handling, retry logic, and daily user message limits.
- Deployed using **Render** (backend) and **GitHub Pages** (frontend).

### Getting Started
To run this project locally, you'll need to set up both the backend and the frontend.

#### Prerequisites

- **Python 3.12+** (for the backend)
- **Docker** (optional, for containerized deployment)
- **Node.js & npm** (optional, only if you want to add tooling for the frontend, not required for static hosting)

#### Backend Setup
1.  **Clone the repository:**
        ```bash
        git clone https://github.com/<your-username>/AI-debateBot.git
        cd AI-debateBot/backend
        ```

2.  **Set up a virtual environment and install dependencies:**
        ```bash
        python -m venv venv
        source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
        pip install -r requirements.txt
        ```

3.  **Configure your API key:**
        Create a file named `.env` in the `backend` directory and add your Gemini API key.

        ```env
        GEMINI_API_KEY="your_api_key_here"
        ```

4.  **Run the backend server:**
        ```bash
        uvicorn main:app --reload
        ```
        The `--reload` flag enables automatic server restarts on code changes for easier development. The API will be accessible at `http://localhost:8000`.


#### Frontend Setup
1.  **Navigate to the frontend directory:**
        ```bash
        cd ../frontend
        ```
        The frontend consists of static HTML, CSS, and JavaScript files with no build step required. You can open `index.html` directly in your browser.

2.  **Serve the frontend locally (recommended):**
        For a live preview with automatic static file serving, you can use Python's built-in HTTP server:

        ```bash
        python -m http.server -d frontend 8080
        ```

        Then open your browser and navigate to `http://localhost:8080`.


### Deployment
This project is structured for straightforward deployment using **Render** for the backend and **GitHub Pages** or **Netlify** for the frontend.

#### Backend Deployment on Render
The `render.yaml` and `backend/Dockerfile` files are pre-configured for deployment to Render. To deploy:

- Connect your GitHub repository to a new Render web service.
- Render will build and deploy the backend automatically.
- Add your `GEMINI_API_KEY` as a secret environment variable in the Render dashboard.
- Ensure your backend service’s CORS settings allow requests from your frontend domain.


#### Free Tier Usage & Inactivity
Render's free tier is suitable for hobby projects and low-traffic apps but has limitations:
- Services go to sleep after approximately 15 minutes of inactivity.
- The first request after sleep may take 20–60 seconds to respond due to cold start latency.
- This may cause the initial request after inactivity to be slow or fail.

Options to address this:
- Upgrade to a paid plan for guaranteed 24/7 uptime.
- Accept the cold start delay as normal for free-tier hobby projects.
- (⚠️ Not recommended) Use an external uptime monitoring service to ping your backend regularly; be aware this can violate free-tier terms of service.


Make sure to update your backend CORS settings to allow requests from your frontend's deployed domain.