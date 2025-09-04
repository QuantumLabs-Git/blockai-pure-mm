#!/bin/bash

echo "🧪 Setting up environment to test like an external user..."
echo ""

# Create a test script that modifies hosts file
cat > /tmp/test-ngrok-access.sh << 'EOF'
#!/bin/bash

# Backup current hosts file
sudo cp /etc/hosts /etc/hosts.backup

# Add entries to block localhost access
echo "# Temporary block for testing" | sudo tee -a /etc/hosts
echo "127.0.0.2 localhost" | sudo tee -a /etc/hosts
echo "::2 localhost" | sudo tee -a /etc/hosts

echo "✅ Localhost blocked. Use only https://blockaipuremm.ngrok.dev"
echo ""
echo "To restore, run: sudo cp /etc/hosts.backup /etc/hosts"
EOF

chmod +x /tmp/test-ngrok-access.sh

echo "This will temporarily block localhost access to force ngrok usage."
echo "You'll need to enter your password."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    /tmp/test-ngrok-access.sh
fi