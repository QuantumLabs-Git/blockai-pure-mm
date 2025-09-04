#!/bin/bash

echo "🔒 Blocking direct access to local development ports..."
echo "   This will force all traffic through ngrok"
echo ""

# Block direct access to ports
echo "rdr pass inet proto tcp from any to any port 5173 -> 127.0.0.1 port 9999" | sudo pfctl -ef -
echo "rdr pass inet proto tcp from any to any port 5001 -> 127.0.0.1 port 9999" | sudo pfctl -ef -

echo "✅ Local ports blocked. You can now only access via ngrok URL."
echo ""
echo "To restore access, run: ./restore-local-access.sh"