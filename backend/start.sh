#!/bin/bash

# Install dependencies if they don't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing/updating dependencies..."
pip3 install -r requirements.txt

echo "Starting FastAPI server..."
python main.py