import React, { useEffect, useState } from 'react';
import { validateOAuthConfig, googleOAuthConfig } from '@/config/googleOAuth';
import { initiateGoogleLogin, clearAuthStorage } from '@/services/googleOAuthService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Database, 
  Server,
  Info,
  HelpCircle,
  Copy,
  ExternalLink,
  Play
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OAuthDiagnosticChecklist from '@/components/admin/OAuthDiagnosticChecklist';

const OAuthDiagnostics = () => {
  const [configStatus, setConfigStatus] = useState(null);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [urlParams, setUrlParams] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    const validation = validateOAuthConfig();
    setConfigStatus(validation);
    generateUrlForDebug();
  }, []);

  const generateUrlForDebug = async () => {
    try {
      const url = await initiateGoogleLogin();
      setGeneratedUrl(url);
      const urlObj = new URL(url);
      const params = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      setUrlParams(params);
      // Don't clear storage immediately so user can test flow if they want
    } catch (e) {
      console.error("Failed to generate debug URL", e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "URL copied successfully",
    });
  };

  const handleTestAuth = () => {
    if (generatedUrl) {
      window.location.href = generatedUrl;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold gradient-text">OAuth Debugger & Diagnostics</h1>
        <p className="text-slate-600 max-w-3xl">
          Use this tool to diagnose "403: redirect_uri_mismatch" errors and verify that your Google OAuth 2.0 parameters are correctly configured before sending users to Google.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Configuration & Checklist */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" /> Environment Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <label className="text-xs font-semibold text-slate-500 uppercase">Client ID</label>
                 <div className="font-mono text-sm p-2 bg-slate-100 rounded border mt-1 break-all">
                   {configStatus?.config.fullClientId || 'Missing'}
                 </div>
                 {configStatus?.config.fullClientId?.includes(' ') && (
                   <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> Contains spaces! Trim this value.
                   </div>
                 )}
               </div>

               <div>
                 <label className="text-xs font-semibold text-slate-500 uppercase">Redirect URI</label>
                 <div className="font-mono text-sm p-2 bg-slate-100 rounded border mt-1 break-all">
                   {configStatus?.config.fullRedirectUri || 'Missing'}
                 </div>
                 {configStatus?.config.fullRedirectUri?.endsWith('/') && (
                   <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> Ends with slash! Remove trailing slash.
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" /> Diagnostic Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OAuthDiagnosticChecklist />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Generated Parameters & Test */}
        <div className="space-y-6">
          <Card className="border-blue-200 shadow-sm">
            <CardHeader className="bg-blue-50/50">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Info className="w-5 h-5 text-blue-600" /> Generated Auth Parameters</span>
                <Button size="sm" variant="outline" onClick={generateUrlForDebug} className="h-8">Refresh</Button>
              </CardTitle>
              <CardDescription>
                These are the exact parameters generated by your application code.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t border-slate-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(urlParams).map(([key, value]) => (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700 font-mono">{key}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono break-all text-xs">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="flex gap-2 mb-2">
                 <Button onClick={() => copyToClipboard(generatedUrl)} variant="outline" className="flex-1 gap-2">
                   <Copy className="w-4 h-4" /> Copy Full URL
                 </Button>
                 <Button onClick={handleTestAuth} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                   <Play className="w-4 h-4" /> Test Authorization
                 </Button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Clicking "Test" will redirect you to Google using these parameters.
              </p>
            </div>
          </Card>
          
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
             <h4 className="font-bold flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Important Note</h4>
             <p>
               If you see a 403 error after clicking "Test Authorization", copy the <strong>redirect_uri</strong> from the table above and ensure it is added to your Google Cloud Console <strong>Authorized redirect URIs</strong> list exactly as it appears here.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthDiagnostics;