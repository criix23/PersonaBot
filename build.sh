#!/bin/bash
# Exit on error
set -e

# Print environment variables for debugging
echo "--- Printing Environment Variables ---"
env
echo "------------------------------------"

# Install dependencies
pip install -r requirements.txt
