# Quick Deployment Guide for BlockAI Pure MM

## 🚀 Deployment Options

### Option 1: Deploy to Render.com (FREE - Recommended)

1. **Fork/Clone the Repository**
   - Your repo is at: https://github.com/QuantumLabs-Git/blockai-pure-mm

2. **Sign up for Render.com**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Deploy**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `blockai-pure-mm`
   - Render will auto-detect the configuration
   - Click "Create Web Service"

4. **Set Environment Variables**
   - In Render dashboard, go to Environment
   - Add:
     - `SUPABASE_URL` (from Supabase dashboard)
     - `SUPABASE_ANON_KEY` (from Supabase dashboard)
     - Any other API keys you need

**Your app will be live at:** `https://blockai-pure-mm.onrender.com`

---

### Option 2: Deploy to Railway (Simple)

1. **Deploy with One Click**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Deploy from your project directory
   railway up
   ```

2. **Set Environment Variables**
   ```bash
   railway variables set SUPABASE_URL=your_url
   railway variables set SUPABASE_ANON_KEY=your_key
   ```

---

### Option 3: Deploy to Heroku (Free tier ended, but still popular)

1. **Install Heroku CLI**
   ```bash
   brew tap heroku/brew && brew install heroku  # Mac
   ```

2. **Create Procfile**
   ```bash
   echo "web: gunicorn app:app" > Procfile
   ```

3. **Deploy**
   ```bash
   heroku create blockai-pure-mm
   git push heroku main
   ```

---

### Option 4: Local Development with Python

1. **Set up Python environment**
   ```bash
   cd /Volumes/PRO-G40/Development/blockai-pure-mm
   python3 -m venv venv
   source venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cat > .env << 'EOF'
   FLASK_ENV=development
   SECRET_KEY=your-secret-key-here
   MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=c3ccc39d-a8c8-40ec-880d-40ac14e92533
   DEVNET_MODE=false
   EOF
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access at:** http://localhost:5000

---

## 🔧 Setting Up Supabase (Required for all deployments)

1. **Create Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up (free tier available)

2. **Create New Project**
   - Click "New Project"
   - Name: `blockai-pure-mm`
   - Password: (save this!)
   - Region: Choose closest

3. **Run Database Schema**
   - Go to SQL Editor
   - Click "New Query"
   - Copy contents of `supabase_schema.sql`
   - Click "Run"

4. **Get API Keys**
   - Go to Settings → API
   - Copy:
     - Project URL
     - anon/public key
     - service_role key (keep secret!)

---

## 📱 Testing Your Deployment

1. **Check Health Endpoint**
   ```bash
   curl https://your-app-url/api/health
   ```

2. **Test Wallet Generation**
   - Navigate to `/wallet_management`
   - Generate test wallets
   - Download Excel file

3. **Test Warmup Feature**
   - Navigate to `/wallet_warmup`
   - Use simulation mode first
   - Monitor logs

---

## 🆘 Troubleshooting

### If deployment fails:

1. **Check logs**
   - Render: Dashboard → Logs
   - Railway: `railway logs`
   - Local: Check terminal output

2. **Common issues:**
   - Missing environment variables
   - Node.js memory issues (increase NODE_OPTIONS)
   - Python package conflicts (check requirements.txt)

3. **Quick fixes:**
   ```bash
   # Clear Python cache
   find . -type d -name __pycache__ -exec rm -r {} +
   
   # Clear Node modules
   rm -rf node_modules package-lock.json
   npm install
   
   # Reset git if needed
   git reset --hard HEAD
   git pull origin main
   ```

---

## 🎉 Success Checklist

- [ ] Repository pushed to GitHub
- [ ] Deployment platform chosen
- [ ] Supabase database configured
- [ ] Environment variables set
- [ ] Application deployed
- [ ] Health check passing
- [ ] Basic features tested

---

## 📞 Need Help?

1. Check the [full deployment guide](DEPLOYMENT.md)
2. Open an issue on GitHub
3. Review application logs

Your repository: https://github.com/QuantumLabs-Git/blockai-pure-mm

Good luck with your deployment! 🚀