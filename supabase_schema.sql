-- Supabase Database Schema for BlockAI Pure MM

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'free',
    api_keys JSONB DEFAULT '{}'
);

-- Instance states table
CREATE TABLE IF NOT EXISTS public.instance_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    instance_id TEXT NOT NULL,
    instance_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, instance_id)
);

-- Wallet sets table
CREATE TABLE IF NOT EXISTS public.wallet_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    blockchain TEXT NOT NULL,
    wallets JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading history table
CREATE TABLE IF NOT EXISTS public.trading_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blockchain TEXT NOT NULL,
    token_address TEXT,
    action TEXT CHECK (action IN ('buy', 'sell', 'swap')),
    amount NUMERIC,
    price NUMERIC,
    tx_hash TEXT,
    status TEXT,
    metadata JSONB DEFAULT '{}',
    INDEX idx_user_timestamp (user_id, timestamp DESC)
);

-- Warmup sessions table
CREATE TABLE IF NOT EXISTS public.warmup_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL,
    configuration JSONB DEFAULT '{}',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    logs TEXT[],
    UNIQUE(session_id)
);

-- Token watchlist table
CREATE TABLE IF NOT EXISTS public.token_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    blockchain TEXT NOT NULL,
    token_address TEXT NOT NULL,
    token_name TEXT,
    token_symbol TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, blockchain, token_address)
);

-- Market making configurations table
CREATE TABLE IF NOT EXISTS public.mm_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    exchange TEXT NOT NULL,
    trading_pair TEXT NOT NULL,
    configuration JSONB NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instance_states_user_id ON public.instance_states(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_sets_user_id ON public.wallet_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_history_user_id ON public.trading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_history_timestamp ON public.trading_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_warmup_sessions_user_id ON public.warmup_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_warmup_sessions_status ON public.warmup_sessions(status);
CREATE INDEX IF NOT EXISTS idx_token_watchlist_user_id ON public.token_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_mm_configurations_user_id ON public.mm_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instance_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warmup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mm_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User profiles: users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Instance states: users can only see and manage their own instances
CREATE POLICY "Users can view own instance states" ON public.instance_states
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own instance states" ON public.instance_states
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instance states" ON public.instance_states
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instance states" ON public.instance_states
    FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can manage own wallet sets" ON public.wallet_sets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own trading history" ON public.trading_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own warmup sessions" ON public.warmup_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own token watchlist" ON public.token_watchlist
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own MM configurations" ON public.mm_configurations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Functions
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instance_states_updated_at BEFORE UPDATE ON public.instance_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_sets_updated_at BEFORE UPDATE ON public.wallet_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mm_configurations_updated_at BEFORE UPDATE ON public.mm_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();