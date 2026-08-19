import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, CheckSquare, Square, Plus, Trash2, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils'; // Import formatCurrency

const TodoListWidget = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('pos_dashboard_todos');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Check low stock items', completed: false },
      { id: 2, text: 'Call supplier for milk delivery', completed: false },
      { id: 3, text: 'Review daily sales report', completed: true }
    ];
  });
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    localStorage.setItem('pos_dashboard_todos', JSON.stringify(todos));
  }, [todos]);

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const item = {
      id: Date.now(),
      text: newTodo,
      completed: false
    };
    setTodos([item, ...todos]);
    setNewTodo('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg rounded-xl flex flex-col">
      <div 
        className="bg-slate-800 p-4 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-white">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Todo List</h3>
          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full ml-2">
            {todos.filter(t => !t.completed).length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="p-4 bg-white">
              <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
                <Input 
                  placeholder="Add new task..." 
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button type="submit" size="sm" className="h-9 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </form>

              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {todos.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">No tasks yet. Add one above!</p>
                )}
                {todos.map(todo => (
                  <div 
                    key={todo.id} 
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md group transition-colors"
                  >
                    <button onClick={() => toggleTodo(todo.id)} className="text-slate-400 hover:text-blue-500 transition-colors">
                      {todo.completed ? 
                        <CheckSquare className="w-5 h-5 text-green-500" /> : 
                        <Square className="w-5 h-5" />
                      }
                    </button>
                    <span className={cn(
                      "flex-1 text-sm text-slate-700 transition-all",
                      todo.completed && "line-through text-slate-400"
                    )}>
                      {todo.text}
                    </span>
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default TodoListWidget;