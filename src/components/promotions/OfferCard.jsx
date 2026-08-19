import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Tag, Share2, BarChart2, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const OfferCard = ({ offer, onDelete }) => {
    const navigate = useNavigate();
    
    const isExpired = offer.validity_end ? new Date(offer.validity_end) < new Date() : false;
    const isActive = offer.is_active && !isExpired;

    // Use 'title' instead of 'name' (correct schema column)
    const displayTitle = offer.title || offer.type || 'Offer';

    return (
        <Card className="promo-card">
            <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-slate-800 line-clamp-1">{displayTitle}</CardTitle>
                    <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                        {isActive ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
                <div className="flex items-center text-sm text-slate-600">
                    <Tag className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="font-semibold text-slate-800 mr-1">
                        {offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `₹${offer.discount_value}`} OFF
                    </span>
                </div>
                {offer.validity_start && offer.validity_end && (
                    <div className="flex items-center text-sm text-slate-500">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {format(new Date(offer.validity_start), 'MMM d, yyyy')} - {format(new Date(offer.validity_end), 'MMM d, yyyy')}
                    </div>
                )}
                <p className="text-sm text-slate-500 line-clamp-2 mt-2">{offer.description || 'No description provided'}</p>
            </CardContent>
            <CardFooter className="pt-4 border-t border-slate-100 flex justify-between gap-2">
                <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(`/promotions/share?id=${offer.id}`)}>
                        <Share2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(`/promotions/analytics?id=${offer.id}`)}>
                        <BarChart2 className="w-4 h-4 text-purple-600" />
                    </Button>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500" onClick={() => navigate(`/promotions/create?id=${offer.id}`)}>
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(offer.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default OfferCard;