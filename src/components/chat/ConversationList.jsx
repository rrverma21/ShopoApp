import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import NewChatDialog from '@/components/chat/NewChatDialog';
import { getInitials } from '@/lib/utils';
import { normalizeProfileRole } from '@/lib/profileRoles';

const ConversationList = ({ onSelectConversation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { conversationId: activeConversationId } = useParams();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const normalizedRole = normalizeProfileRole(user.profile.role);
    let query;
    if (normalizedRole === 'customer') {
        query = supabase.from('conversations').select('*, other_user:seller_id(*, profiles(*))').eq('client_id', user.id);
    } else {
        query = supabase.rpc('get_user_conversations', { p_user_id: user.id });
    }
    
    const { data, error } = await query.order('last_message_at', { ascending: false, nullsFirst: true });

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      const formattedData = data.map(convo => {
          let otherUser;
          if (normalizedRole === 'customer') {
              otherUser = convo.other_user?.profiles;
          } else {
             if (convo.client_id === user.id) otherUser = convo.seller;
             else if (convo.seller_id === user.id) otherUser = convo.client || convo.salesman;
             else if (convo.salesman_id === user.id) otherUser = convo.seller;
          }
          return { ...convo, otherUser };
      });
      setConversations(formattedData);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
    let channel;
    try {
        const channelName = `public:conversations-${Date.now()}`;
        channel = supabase.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                fetchConversations();
            })
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR') console.error('Conversations channel error:', err);
            });
    } catch (error) {
        console.error('Subscription error:', error);
    }
    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const handleNewChatStarted = (conversationId) => {
    setIsNewChatOpen(false);
    onSelectConversation(conversationId);
    fetchConversations();
  };
  
  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold">Messages</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsNewChatOpen(true)}>
          <PlusCircle className="h-6 w-6" />
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <Loader2 className="animate-spin mr-2" /> Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <p className="font-semibold">No conversations yet.</p>
            <p className="text-sm mt-1">Click the '+' to start a new chat!</p>
          </div>
        ) : (
          conversations.map((convo, index) => {
            if (!convo.otherUser) return null;
            return (
              <motion.div key={convo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }}>
                <button
                  onClick={() => onSelectConversation(convo.id)}
                  className={`w-full text-left p-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 transition-colors ${activeConversationId === convo.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <Avatar>
                    <AvatarImage src={convo.otherUser.avatar_url} alt={convo.otherUser.business_name} />
                    <AvatarFallback>{getInitials(convo.otherUser.business_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold truncate">{convo.otherUser.business_name}</h3>
                      {convo.last_message_at && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {convo.last_message_text || '...'}
                    </p>
                  </div>
                </button>
              </motion.div>
            );
          })
        )}
      </div>
      <NewChatDialog isOpen={isNewChatOpen} onOpenChange={setIsNewChatOpen} onChatStarted={handleNewChatStarted} />
    </div>
  );
};

export default ConversationList;
