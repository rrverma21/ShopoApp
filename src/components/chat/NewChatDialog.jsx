import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const NewChatDialog = ({ isOpen, onOpenChange, onChatStarted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase.rpc('get_chat_contacts');

    if (error) {
      toast({ title: 'Error fetching contacts', description: error.message, variant: 'destructive' });
    } else {
      setContacts(data);
      setFilteredContacts(data);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (isOpen) fetchContacts();
  }, [isOpen, fetchContacts]);

  useEffect(() => {
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      setFilteredContacts(
        contacts.filter(contact => contact.business_name.toLowerCase().includes(lowercasedTerm))
      );
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchTerm, contacts]);

  const handleStartChat = async (contactId) => {
    const { data, error } = await supabase.rpc('create_or_get_conversation', { p_other_user_id: contactId });

    if (error) {
      toast({ title: 'Error', description: 'Could not start chat.', variant: 'destructive' });
      return;
    }
    
    if (data) {
        onChatStarted(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
          <DialogDescription>Select a contact to begin a conversation.</DialogDescription>
        </DialogHeader>
        <Input 
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="my-2"
        />
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No contacts found.</p>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleStartChat(contact.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <Avatar>
                    <AvatarImage src={contact.avatar_url} alt={contact.business_name} />
                    <AvatarFallback>{getInitials(contact.business_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{contact.business_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{contact.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;