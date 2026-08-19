import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import { MessageSquare, ArrowLeft, Loader2 } from 'lucide-react';

const ChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const chatIndex = pathParts.findIndex(part => part === 'chat');
  const conversationId = chatIndex !== -1 && pathParts.length > chatIndex + 1 ? pathParts[chatIndex + 1] : undefined;

  if (authLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-slate-400 mb-3" size={48} />
        <p className="text-slate-500">Loading your chats...</p>
      </div>
    );
  }

  const role = user?.profile?.role || 'user';
  let basePath = '/chat';
  if (role === 'seller') basePath = '/seller/chat';
  if (role === 'salesman') basePath = '/sales/chat';
  if (role === 'admin') basePath = '/admin/chat';

  const handleSelectConversation = (id) => {
    if (!id) return;
    navigate(`${basePath}/${id}`);
  };

  const handleBackToList = () => navigate(basePath);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      <div className={`
        ${isMobile && conversationId ? 'hidden' : 'flex'}
        w-full md:w-[320px] lg:w-[360px] border-r border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex-col
      `}>
        <ConversationList onSelectConversation={handleSelectConversation} />
      </div>

      <div className={`
        ${isMobile && !conversationId ? 'hidden' : 'flex'}
        relative flex-1 flex-col bg-slate-50 dark:bg-slate-800
      `}>
        <Routes>
          <Route path="/" element={
            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 h-full">
              <MessageSquare size={64} className="mb-4 text-slate-400 dark:text-slate-500" />
              <h2 className="text-2xl font-semibold">Select a conversation</h2>
              <p>Choose from the list to start chatting.</p>
            </div>
          }/>
          <Route path=":conversationId" element={
            <div className="h-full flex flex-col">
              <div className="md:hidden p-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm sticky top-0 z-10">
                <button onClick={handleBackToList} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-slate-700 dark:text-slate-200 font-medium">Back to chats</h3>
              </div>
              <ChatWindow key={conversationId} />
            </div>
          }/>
        </Routes>
      </div>
    </div>
  );
};

export default ChatPage;