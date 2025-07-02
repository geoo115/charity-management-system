'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { getFromLocalStorage } from '@/lib/hooks/use-local-storage';

export default function AuthDebugPage() {
  const { user, loading } = useAuth();
  
  const token = getFromLocalStorage('auth_token') || getFromLocalStorage('token');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Auth Context</h2>
          <p>Loading: {loading ? 'true' : 'false'}</p>
          <p>User: {user ? JSON.stringify(user, null, 2) : 'null'}</p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Local Storage Token</h2>
          <p>Token: {token ? `${token.substring(0, 20)}...` : 'null'}</p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">API Base URL</h2>
          <p>URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}</p>
        </div>
      </div>
    </div>
  );
}
