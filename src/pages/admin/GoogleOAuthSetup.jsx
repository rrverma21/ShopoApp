import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ExternalLink, Copy, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { googleOAuthConfig } from '@/config/googleOAuth';

const GoogleOAuthSetup = () => {
  const { toast } = useToast();
  
  const currentRedirectUri = googleOAuthConfig.redirectUri || 'Not set in .env';
  const clientId = googleOAuthConfig.clientId || 'Not set in .env';
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: text,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold gradient-text">Google OAuth Setup Guide</h1>
        <p className="text-slate-600">
          If you are seeing a <strong>403: redirect_uri_mismatch</strong> error, follow these steps to fix your Google Cloud Console configuration.
        </p>
      </div>

      {/* Current Config Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" /> 
            Current Local Configuration
          </CardTitle>
          <CardDescription>
            These values are currently loaded from your <code>.env</code> file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-500">Client ID</div>
            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-md border border-slate-200 font-mono text-sm break-all">
              {clientId}
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" onClick={() => copyToClipboard(clientId)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-500">Redirect URI</div>
            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-md border border-slate-200 font-mono text-sm break-all">
              {currentRedirectUri}
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" onClick={() => copyToClipboard(currentRedirectUri)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="text-xs text-amber-600 flex items-start gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>This URI must explicitly match the "Authorized redirect URI" in Google Cloud Console. Even a trailing slash difference will cause a 403 error.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step by Step Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Fixing 403 Redirect URI Mismatch</CardTitle>
          <CardDescription>Follow these exact steps to authorize your redirect URI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-600">1</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Go to Google Cloud Console</h3>
              <p className="text-sm text-slate-600">Navigate to the Google Cloud Console Credential manager.</p>
              <Button variant="outline" className="gap-2 h-8" onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}>
                Open Console <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-600">2</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Select Project</h3>
              <p className="text-sm text-slate-600">
                Ensure you have selected the correct project that owns the Client ID: <code className="bg-slate-100 px-1 rounded text-xs">{clientId.substring(0, 15)}...</code>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-600">3</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Find & Edit OAuth 2.0 Client ID</h3>
              <p className="text-sm text-slate-600">
                Look under the "OAuth 2.0 Client IDs" section. Find the entry for your web application and click the <strong>Pencil icon (Edit)</strong>.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-600">4</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Add Authorized Redirect URI</h3>
              <p className="text-sm text-slate-600">
                Scroll down to the <strong>"Authorized redirect URIs"</strong> section. Add the following URIs exactly as shown:
              </p>
              
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mt-2 space-y-3">
                 <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-green-700">{currentRedirectUri}</code>
                    <Badge variant="outline" className="text-xs">Localhost</Badge>
                 </div>
                 {/* Placeholder for production if needed later */}
                 {/* <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-slate-500">https://your-production-domain.com/auth/google/callback</code>
                    <Badge variant="outline" className="text-xs">Production</Badge>
                 </div> */}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
             <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-600">5</div>
             <div className="space-y-2">
                <h3 className="font-semibold text-lg">Save & Wait</h3>
                <p className="text-sm text-slate-600">
                  Click <strong>Save</strong>. Note that changes can take <strong>5 minutes to a few hours</strong> to propagate, although it's often instant.
                </p>
                <div className="bg-amber-50 p-3 rounded text-sm text-amber-800 border border-amber-200 flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 mt-0.5" />
                   <span>If it still fails immediately after saving, wait 5 minutes, verify the URL again, and try clearing your browser cache.</span>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleOAuthSetup;