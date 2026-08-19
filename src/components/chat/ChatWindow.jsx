import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, X, File as FileIcon, Download, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { getInitials } from '@/lib/utils';

const FilePreview = ({ file, onRemove }) => (
  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center gap-2">
    <FileIcon className="h-5 w-5 text-slate-500" />
    <span className="text-sm truncate">{file.name}</span>
    <button onClick={onRemove} className="ml-auto p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full">
      <X className="h-4 w-4" />
    </button>
  </div>
);

const ChatBubble = ({ msg, isSender, onImageLoad }) => {
    const fileMeta = msg.file_metadata;
    const isImage = fileMeta?.type?.startsWith('image/');
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex my-1 ${isSender ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`max-w-xs md:max-w-md p-2.5 rounded-2xl shadow-sm ${isSender ? 'bg-blue-500 text-white rounded-br-lg' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg'}`}>
                {msg.message_text && <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>}
                
                {msg.image_url && fileMeta && (
                    isImage ? (
                        <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                            <img src={msg.image_url} alt={fileMeta.name} className="rounded-lg max-w-full h-auto" onLoad={onImageLoad}/>
                        </a>
                    ) : (
                        <div className="mt-2 p-2 bg-blue-400/50 dark:bg-slate-600 rounded-lg flex items-center gap-3">
                            <FileIcon className="h-8 w-8 flex-shrink-0" />
                            <div className="flex-grow overflow-hidden">
                                <p className="text-sm font-medium truncate">{fileMeta.name}</p>
                                <p className="text-xs opacity-80">{(fileMeta.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <a href={msg.image_url} download={fileMeta.name} className="p-2 hover:bg-blue-400 dark:hover:bg-slate-500 rounded-full">
                                <Download className="h-5 w-5" />
                            </a>
                        </div>
                    )
                )}

                <p className={`text-xs mt-1.5 text-right ${isSender ? 'text-blue-200' : 'text-slate-400'}`}>
                    {format(new Date(msg.created_at), 'p')}
                </p>
            </div>
        </motion.div>
    );
};


const ChatWindow = () => {
    const { conversationId } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const fetchChatDetails = useCallback(async () => {
        if (!conversationId || !user) return;
        setLoading(true);

        const { data: convoData, error: convoError } = await supabase.rpc('get_conversation_details', { p_conversation_id: conversationId, p_user_id: user.id }).single();
        
        if (convoError || !convoData) {
            toast({ title: "Error", description: "Could not load conversation.", variant: "destructive" });
            setLoading(false);
            return;
        }

        setOtherUser(convoData.other_user_profile);
        setMessages(convoData.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        setLoading(false);
        setTimeout(() => scrollToBottom('auto'), 100);
    }, [conversationId, user, toast]);

    useEffect(() => { fetchChatDetails(); }, [fetchChatDetails]);
    
    useEffect(() => {
        let channel;
        try {
            const channelName = `chat:${conversationId}-${Date.now()}`;
            channel = supabase.channel(channelName)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` }, 
                (payload) => {
                    setMessages(prev => [...prev, payload.new]);
                    setTimeout(() => scrollToBottom(), 100);
                })
                .subscribe((status, err) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.error('Chat channel error:', err);
                    }
                });
        } catch (error) {
            console.error('Subscription error:', error);
        }
        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [conversationId, scrollToBottom]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (!trimmedMessage && !file) return;

        setIsSending(true);

        let fileUrl = null;
        let fileMetadata = null;

        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file);

            if (uploadError) {
                toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
                setIsSending(false);
                return;
            }
            const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName);
            fileUrl = publicUrl;
            fileMetadata = { name: file.name, type: file.type, size: file.size };
        }

        const { error } = await supabase.from('chat_messages').insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message_text: trimmedMessage || null,
            image_url: fileUrl,
            file_metadata: fileMetadata,
        });

        if (error) {
            toast({ title: 'Error sending message', description: error.message, variant: 'destructive' });
        } else {
            setNewMessage('');
            setFile(null);
        }
        setIsSending(false);
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
        e.target.value = null; // Reset input
    };
    
    if (loading) return <div className="flex-grow flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2" />Loading Chat...</div>;
    if (!otherUser) return <div className="flex-grow flex items-center justify-center text-slate-500">Conversation not found.</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-800">
            <header className="flex-shrink-0 flex items-center p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={otherUser.avatar_url} alt={otherUser.business_name} />
                    <AvatarFallback>{getInitials(otherUser.business_name)}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                    <h2 className="font-semibold">{otherUser.business_name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{otherUser.role}</p>
                </div>
            </header>

            <main className="flex-grow p-4 overflow-y-auto">
                <AnimatePresence initial={false}>
                    {messages.map(msg => <ChatBubble key={msg.id} msg={msg} isSender={msg.sender_id === user.id} onImageLoad={() => scrollToBottom('auto')} /> )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                {file && <FilePreview file={file} onRemove={() => setFile(null)} />}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                        <Paperclip />
                    </Button>
                    <Input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-grow" autoComplete="off" disabled={isSending}/>
                    <Button type="submit" size="icon" disabled={isSending}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
                    </Button>
                </form>
            </footer>
        </div>
    );
};

export default ChatWindow;