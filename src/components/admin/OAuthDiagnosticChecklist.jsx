import React from 'react';
import { CheckCircle, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { googleOAuthConfig } from '@/config/googleOAuth';

const ChecklistItem = ({ label, status, description, link }) => {
  const getIcon = () => {
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
    return <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />;
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-900">{label}</span>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
};

const OAuthDiagnosticChecklist = () => {
  const { clientId, redirectUri, scopes } = googleOAuthConfig;

  // Simple validation checks
  const isClientIdSet = !!clientId && clientId.length > 0;
  const isClientIdFormatValid = clientId && clientId.endsWith('.apps.googleusercontent.com');
  const isRedirectUriSet = !!redirectUri && redirectUri.length > 0;
  const isRedirectUriFormatValid = redirectUri && !redirectUri.endsWith('/');
  const isRedirectUriLocal = redirectUri && (redirectUri.includes('localhost') || redirectUri.includes('127.0.0.1'));
  const hasRequiredScopes = scopes && scopes.includes('openid') && scopes.includes('email');

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        Common Configuration Issues
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChecklistItem 
          label="Client ID Set" 
          status={isClientIdSet ? 'success' : 'error'}
          description="VITE_GOOGLE_CLIENT_ID exists in .env file"
        />
        <ChecklistItem 
          label="Redirect URI Set" 
          status={isRedirectUriSet ? 'success' : 'error'}
          description="VITE_GOOGLE_REDIRECT_URI exists in .env file"
        />
        <ChecklistItem 
          label="Client ID Format" 
          status={isClientIdFormatValid ? 'success' : 'error'}
          description="Should end with .apps.googleusercontent.com"
        />
        <ChecklistItem 
          label="Redirect URI Format" 
          status={isRedirectUriFormatValid ? 'success' : 'error'}
          description="Should NOT have a trailing slash"
        />
        <ChecklistItem 
          label="Required Scopes" 
          status={hasRequiredScopes ? 'success' : 'error'}
          description="Must include 'openid', 'email', 'profile'"
        />
        <ChecklistItem 
          label="Environment" 
          status={isRedirectUriLocal ? 'warning' : 'success'} // Warning just to indicate local dev
          description={isRedirectUriLocal ? "Local Development (Ensure port 5173 matches)" : "Production Environment"}
        />
      </div>

      <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mt-4">
        <h4 className="text-sm font-semibold mb-2">Google Cloud Console Checklist</h4>
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-sm text-slate-600">
             <input type="checkbox" className="rounded border-slate-300" />
             <span>"Authorized redirect URIs" matches EXACTLY: <code className="bg-slate-200 px-1 rounded text-xs">{redirectUri}</code></span>
           </div>
           <div className="flex items-center gap-2 text-sm text-slate-600">
             <input type="checkbox" className="rounded border-slate-300" />
             <span>OAuth Consent Screen is configured (External/Internal)</span>
           </div>
           <div className="flex items-center gap-2 text-sm text-slate-600">
             <input type="checkbox" className="rounded border-slate-300" />
             <span>Test users added (if Publishing Status is 'Testing')</span>
           </div>
           <div className="flex items-center gap-2 text-sm text-slate-600">
             <input type="checkbox" className="rounded border-slate-300" />
             <span>Application Type is "Web application"</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthDiagnosticChecklist;