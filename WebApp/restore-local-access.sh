#!/bin/bash

echo "🔓 Restoring direct access to local development ports..."

# Disable packet filter
sudo pfctl -d

echo "✅ Local access restored. You can now access localhost directly."