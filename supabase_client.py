"""
Supabase client for database operations and authentication
"""
import os
from typing import Optional, Dict, List, Any
from supabase import create_client, Client
from datetime import datetime
import json
import traceback

class SupabaseManager:
    def __init__(self):
        self.url = os.environ.get('SUPABASE_URL')
        self.anon_key = os.environ.get('SUPABASE_ANON_KEY')
        self.service_key = os.environ.get('SUPABASE_SERVICE_KEY')
        
        if not self.url or not self.anon_key:
            print("Warning: Supabase credentials not found. Using local storage only.")
            self.client = None
        else:
            self.client = create_client(self.url, self.anon_key)
    
    def is_connected(self) -> bool:
        """Check if Supabase client is connected"""
        return self.client is not None
    
    # User Management
    async def create_user(self, email: str, password: str) -> Dict:
        """Create a new user account"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password
            })
            return {"success": True, "user": response.user}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def login_user(self, email: str, password: str) -> Dict:
        """Login user"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            return {"success": True, "session": response.session}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Instance State Management
    async def save_instance_state(self, user_id: str, instance_id: str, instance_data: Dict) -> Dict:
        """Save instance state to Supabase"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            data = {
                "user_id": user_id,
                "instance_id": instance_id,
                "instance_data": json.dumps(instance_data),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            response = self.client.table('instance_states').upsert(data).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def load_instance_state(self, user_id: str, instance_id: str) -> Dict:
        """Load instance state from Supabase"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            response = self.client.table('instance_states').select("*").eq(
                'user_id', user_id
            ).eq(
                'instance_id', instance_id
            ).execute()
            
            if response.data:
                state_data = response.data[0]
                state_data['instance_data'] = json.loads(state_data['instance_data'])
                return {"success": True, "data": state_data}
            else:
                return {"success": False, "error": "Instance state not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Wallet Management
    async def save_wallet_set(self, user_id: str, name: str, blockchain: str, wallets: List[Dict]) -> Dict:
        """Save a set of wallets for a user"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            data = {
                "user_id": user_id,
                "name": name,
                "blockchain": blockchain,
                "wallets": json.dumps(wallets),
                "created_at": datetime.utcnow().isoformat()
            }
            
            response = self.client.table('wallet_sets').insert(data).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_wallet_sets(self, user_id: str) -> Dict:
        """Get all wallet sets for a user"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            response = self.client.table('wallet_sets').select("*").eq(
                'user_id', user_id
            ).execute()
            
            if response.data:
                for item in response.data:
                    item['wallets'] = json.loads(item['wallets'])
            
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Trading History
    async def log_trade(self, user_id: str, trade_data: Dict) -> Dict:
        """Log a trade to the database"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            data = {
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "blockchain": trade_data.get('blockchain'),
                "token_address": trade_data.get('token_address'),
                "action": trade_data.get('action'),  # 'buy' or 'sell'
                "amount": trade_data.get('amount'),
                "price": trade_data.get('price'),
                "tx_hash": trade_data.get('tx_hash'),
                "status": trade_data.get('status'),
                "metadata": json.dumps(trade_data.get('metadata', {}))
            }
            
            response = self.client.table('trading_history').insert(data).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_trading_history(self, user_id: str, limit: int = 100) -> Dict:
        """Get trading history for a user"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            response = self.client.table('trading_history').select("*").eq(
                'user_id', user_id
            ).order(
                'timestamp', desc=True
            ).limit(limit).execute()
            
            if response.data:
                for item in response.data:
                    if item.get('metadata'):
                        item['metadata'] = json.loads(item['metadata'])
            
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Warmup Sessions
    async def save_warmup_session(self, user_id: str, session_data: Dict) -> Dict:
        """Save warmup session data"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            data = {
                "user_id": user_id,
                "session_id": session_data.get('instance_id'),
                "status": session_data.get('status'),
                "configuration": json.dumps(session_data.get('configuration', {})),
                "start_time": datetime.utcnow().isoformat(),
                "metadata": json.dumps(session_data.get('metadata', {}))
            }
            
            response = self.client.table('warmup_sessions').insert(data).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_warmup_session(self, session_id: str, status: str, metadata: Dict = None) -> Dict:
        """Update warmup session status"""
        if not self.client:
            return {"error": "Supabase not configured"}
        
        try:
            data = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if metadata:
                data["metadata"] = json.dumps(metadata)
            
            response = self.client.table('warmup_sessions').update(data).eq(
                'session_id', session_id
            ).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}

# Create a singleton instance
supabase_manager = SupabaseManager()