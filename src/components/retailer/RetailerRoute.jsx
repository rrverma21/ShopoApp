import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, Briefcase, ChevronLeft, Store as PointOfSale, Menu, X, Users } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

const menuItems = [
    { name: "Dashboard", path: "/dior/dashboard", icon: LayoutDashboard },
    { name: "Bills Register", path: "/dior/bills", icon: FileText },
    { name: "Suppliers", path: "/dior/suppliers", icon: Users },
    { name: "GST Register", path: "/dior/gst-register", icon: Briefcase },
    { name: "GST Report", path: "/dior/gst-report", icon: FileText },
    { name: "Point of Sale", path: "/pos", icon: PointOfSale },
    { name: "Settings", path: "/dior/settings", icon: Settings },
];

const SidebarContent = ({ onLinkClick }) => {
    const { user, signOut } = useAuth();
    return (
        <div className="h-full flex flex-col">
            <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <Link to="/dior/dashboard" onClick={onLinkClick} className="text-2xl font-bold gradient-text">DIOR</Link>
            </div>
            <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                {menuItems.map(item => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={onLinkClick}
                        className={({ isActive }) =>
                            `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                isActive && item.path !== "/pos"
                                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`
                        }
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-3 mb-4">
                    <Avatar>
                        <AvatarFallback className="bg-primary/20 text-primary dark:bg-primary/30 font-semibold">
                            {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate">{user?.email}</p>
                        <p className="text-xs text-muted-foreground">Retailer</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full justify-start text-muted-foreground mt-1">
                    <Link to="/">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to B2B
                    </Link>
                </Button>
            </div>
        </div>
    );
}

const RetailerRoute = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Desktop Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-950 z-50 md:hidden"
                        >
                            <SidebarContent onLinkClick={() => setIsSidebarOpen(false)} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
            
            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                 {/* Mobile Header */}
                <header className="h-16 flex md:hidden items-center justify-between px-4 border-b bg-white dark:bg-gray-950 z-30">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <Link to="/dior/dashboard" className="text-xl font-bold gradient-text">DIOR</Link>
                    <div className="w-10"></div> {/* Spacer */}
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default RetailerRoute;