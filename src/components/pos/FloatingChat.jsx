import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const FloatingChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: 'Hello! I am your AI POS Assistant. How can I help you streamline your sales today?' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    
    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: "🚧 This feature isn't fully implemented yet—but don't worry! You can request advanced AI integrations in your next prompt! 🚀"
      }]);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[120] bottom-24 right-6 lg:right-[470px] w-[340px] sm:w-[380px] shadow-2xl origin-bottom-right"
        >
          <Card className="flex flex-col h-[480px] border-primary/20 shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
            <CardHeader className="p-3 border-b bg-primary/5 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="bg-primary/20 p-1.5 rounded-full">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                AI Assistant
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                  {messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex w-max max-w-[85%] flex-col gap-2 rounded-xl px-4 py-2 text-sm shadow-sm", 
                        msg.role === 'user' 
                          ? "ml-auto bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-muted text-foreground rounded-bl-none"
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t bg-background shrink-0">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
                  className="flex items-center gap-2"
                >
                  <Input 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    placeholder="Ask me anything..." 
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
                  />
                  <Button type="submit" size="icon" disabled={!input.trim()} className="shrink-0 bg-primary text-primary-foreground">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingChat;