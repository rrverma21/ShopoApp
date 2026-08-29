import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckSquare, ChevronDown, ChevronUp, ClipboardList, Package, Plus, RefreshCw, ScanLine, ShoppingCart, Square, Trash2, Users, WalletCards } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TodoListWidget = ({ outOfStockCount, onNewBill, onCustomers, onProducts, onPurchases, onCredit, onSmartReorder }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('pos_dashboard_todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    localStorage.setItem('pos_dashboard_todos', JSON.stringify(todos));
  }, [todos]);

  const handleAddTodo = event => {
    event.preventDefault();
    if (!newTodo.trim()) return;
    setTodos([{ id: Date.now(), text: newTodo, completed: false }, ...todos]);
    setNewTodo('');
  };

  const toggleTodo = id => {
    setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
  };

  const deleteTodo = id => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const openTasks = todos.filter(todo => !todo.completed).length;
  const quickActions = [
    [ScanLine, 'New Bill', onNewBill, true],
    [Users, 'Customers', onCustomers, false],
    [Package, 'Products', onProducts, false],
    [ShoppingCart, 'Purchase Bills', onPurchases, false],
    [WalletCards, 'Credit', onCredit, false],
    [RefreshCw, 'Smart Reorder', onSmartReorder, false],
  ];

  return (
    <Card className="overflow-hidden rounded-[20px] border border-slate-200/60 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <button type="button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Tasks &amp; Actions</h2>
            <p className="mt-0.5 text-xs text-slate-500">{openTasks} open {openTasks === 1 ? 'task' : 'tasks'}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <CardContent className="p-3.5">
              <form onSubmit={handleAddTodo} className="flex gap-2">
                <Input aria-label="New task" placeholder="Add a task…" value={newTodo} onChange={event => setNewTodo(event.target.value)} className="h-10 min-w-0 border-slate-200 text-sm focus-visible:ring-blue-600" />
                <Button type="submit" size="sm" className="h-10 shrink-0 bg-blue-600 px-3 hover:bg-blue-700">
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Add
                </Button>
              </form>

              <div className="custom-scrollbar mt-3 max-h-[200px] space-y-0.5 overflow-y-auto pr-1">
                {todos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-center">
                    <p className="text-sm font-semibold text-slate-600">No tasks yet.</p>
                    <p className="mt-1 text-xs text-slate-400">Add a task to keep today&apos;s work organized.</p>
                  </div>
                ) : todos.map(todo => (
                  <div key={todo.id} className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                    <button type="button" onClick={() => toggleTodo(todo.id)} aria-label={todo.completed ? `Mark ${todo.text} incomplete` : `Mark ${todo.text} complete`} className="mt-0.5 shrink-0 rounded text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                      {todo.completed ? <CheckSquare className="h-5 w-5 text-emerald-500" aria-hidden="true" /> : <Square className="h-5 w-5" aria-hidden="true" />}
                    </button>
                    <span className={cn("min-w-0 flex-1 break-words text-sm leading-5 text-slate-700", todo.completed && "text-slate-400 line-through")}>{todo.text}</span>
                    <button type="button" onClick={() => deleteTodo(todo.id)} aria-label={`Delete ${todo.text}`} className="shrink-0 rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              {outOfStockCount > 0 && (
                <button type="button" onClick={onProducts} className="mt-3 flex min-h-10 w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-left transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">Out of Stock</span><span className="mt-0.5 block text-xs text-slate-500">{outOfStockCount} {outOfStockCount === 1 ? 'product needs' : 'products need'} attention</span></span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-amber-600" aria-hidden="true" />
                </button>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Quick Actions</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                  {quickActions.map(([Icon, label, action, primary]) => (
                    <button key={label} type="button" onClick={action} className={cn("inline-flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2", primary ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700" : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700")}>
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default TodoListWidget;
