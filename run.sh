#!/bin/bash

# --- Elegant Terminal Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "=========================================================="
echo "      NEBULA: AI-GUIDED DRUG REPURPOSING PLATFORM         "
echo "=========================================================="
echo -e "${NC}"

# Get the script directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. --- Python Backend Virtual Env Setup ---
echo -e "${BLUE}[1/3] Setting up Python virtual environment...${NC}"
if [ ! -d "backend/venv" ]; then
    echo "Creating virtual environment in backend/venv..."
    python3 -m venv backend/venv
fi

# Activate virtual environment
source backend/venv/bin/activate

# Install python dependencies
echo "Installing backend requirements..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# 2. --- Frontend Setup Check ---
echo -e "${BLUE}[2/3] Verifying frontend package dependencies...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing npm modules..."
    npm install
else
    echo "Frontend node_modules verified."
fi
cd ..

# 3. --- Run Concurrently ---
echo -e "${GREEN}[3/3] Starting development servers...${NC}"

# Function to clean up background tasks on Ctrl+C
cleanup() {
    echo -e "\n${RED}Shutting down all servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Register the cleanup function for SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start FastAPI Backend
echo -e "${CYAN}Launching FastAPI backend on http://localhost:8000...${NC}"
PYTHONPATH="$ROOT_DIR" python3 -m uvicorn backend.app:app --port 8000 --reload &
BACKEND_PID=$!

# Start React Frontend (Vite)
echo -e "${CYAN}Launching React frontend on http://localhost:5173...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID
