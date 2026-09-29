import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in environment variables")

import threading

_thread_local = threading.local()

class SupabaseProxy:
    def __getattr__(self, name):
        if not hasattr(_thread_local, "client"):
            _thread_local.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return getattr(_thread_local.client, name)

supabase = SupabaseProxy()
