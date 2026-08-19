import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, User, Phone, Check, Search, X } from 'lucide-react';

export default function SharedContactsModal({ open, onOpenChange, sharedContacts, onSelect, onDismiss }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredContacts = sharedContacts.filter(contact => 
        (contact.customer_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (contact.customer_phone || '').includes(searchQuery)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white text-slate-900 max-w-md border-slate-200 shadow-xl [&>button]:text-slate-600 [&>button:hover]:text-slate-900 [&>button:hover]:bg-slate-100">
                <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-xl">
                        <UserPlus className="h-6 w-6 text-blue-600" /> Pending Contacts
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 font-medium">
                        Review and add customers who shared their details via QR.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Search Input - Implementing requested form styles */}
                    <div className="space-y-2">
                        <Label htmlFor="contact-search" className="text-slate-900 font-semibold mb-2 block">
                            Quick Search
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input 
                                id="contact-search"
                                placeholder="Search by name or phone..." 
                                className="pl-10 bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-10 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="max-h-[50vh] pr-4 rounded-md">
                        {filteredContacts.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 font-medium">No contacts found.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredContacts.map((contact) => (
                                    <div 
                                        key={contact.id} 
                                        className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                                            contact.status === 'processed' 
                                            ? 'border-green-100 bg-green-50/50 opacity-80' 
                                            : 'border-slate-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="font-bold text-slate-900 text-sm truncate">
                                                    {contact.customer_name || 'Anonymous Customer'}
                                                </span>
                                                {contact.status === 'processed' ? (
                                                    <Badge className="text-[10px] px-2 py-0 bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                                                        <Check className="w-3 h-3 mr-1" /> Linked
                                                    </Badge>
                                                ) : (
                                                    <Badge className="text-[10px] px-2 py-0 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Pending</Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-700 flex items-center gap-2 font-semibold">
                                                <Phone className="w-3.5 h-3.5 text-blue-500" /> {contact.customer_phone}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                                                Received: {new Date(contact.created_at).toLocaleDateString()} at {new Date(contact.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <Button 
                                                size="sm" 
                                                className={`h-8 px-3 text-xs font-bold transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                                    contact.status === 'processed' 
                                                    ? 'bg-slate-200 text-slate-500 cursor-default' 
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95'
                                                }`}
                                                onClick={() => onSelect(contact)}
                                                disabled={contact.status === 'processed'}
                                            >
                                                {contact.status === 'processed' ? 'Used' : 'Add to POS'}
                                            </Button>
                                            
                                            {contact.status !== 'processed' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 px-3 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 font-semibold focus:ring-2 focus:ring-red-200"
                                                    onClick={() => onDismiss(contact.id)}
                                                >
                                                    Discard
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="sm:justify-between border-t pt-4 gap-2">
                    <div className="text-[10px] text-slate-400 font-medium flex items-center">
                        * Used contacts are automatically archived
                    </div>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => onOpenChange(false)} 
                        className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold px-6 h-9 transition-colors focus:ring-2 focus:ring-slate-400"
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}