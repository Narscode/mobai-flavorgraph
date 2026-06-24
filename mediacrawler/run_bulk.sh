#!/bin/bash

# Navigate to mediacrawler directory
cd "$(dirname "$0")"

# Path to python interpreter
PYTHON_PATH="/Users/nareswari/.pyenv/versions/3.11.6/bin/python"

echo "============================================================"
echo "Starting MediaCrawler Bulk Auto-Resume Loop..."
echo "============================================================"

while true; do
    echo "[Loop] Launching crawler..."
    $PYTHON_PATH main.py
    
    exit_code=$?
    if [ $exit_code -eq 130 ]; then
        echo "[Loop] User interrupted the crawler. Exiting loop."
        break
    fi

    # Run the filter script to compile intermediate progress
    echo "[Loop] Crawler exited. Running filter script to compile new insights..."
    $PYTHON_PATH ../scripts/filter_xhs_data.py

    echo "[Loop] Sleeping for 10 seconds before auto-resuming next keywords..."
    sleep 10
done
