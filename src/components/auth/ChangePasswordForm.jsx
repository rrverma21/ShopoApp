import React, { useState } from 'react';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
    import { useToast } from '@/components/ui/use-toast';
    
    const ChangePasswordForm = () => {
      const { updateUserPassword } = useAuth();
      const { toast } = useToast();
      const [loading, setLoading] = useState(false);
      const [password, setPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
          toast({
            variant: 'destructive',
            title: 'Invalid Password',
            description: 'Password must be at least 6 characters long.',
          });
          return;
        }
        if (password !== confirmPassword) {
          toast({
            variant: 'destructive',
            title: 'Passwords Mismatch',
            description: 'The new passwords do not match.',
          });
          return;
        }
    
        setLoading(true);
        const { error } = await updateUserPassword(password);
        setLoading(false);
    
        if (!error) {
          setPassword('');
          setConfirmPassword('');
        }
      };
    
      return (
        <Card className="w-full glass-effect">
          <CardHeader>
            <CardTitle className="text-2xl gradient-text">Change Password</CardTitle>
            <CardDescription>Enter a new password for your account.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      );
    };
    
    export default ChangePasswordForm;