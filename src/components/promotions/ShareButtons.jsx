import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Share2, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateWhatsAppLink } from '@/utils/promotions/whatsappShare';

const ShareButtons = ({ url, offerData }) => {
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        toast({ title: 'Link Copied!', description: 'Promotion link copied to clipboard.' });
    };

    const handleWhatsAppShare = () => {
        const waLink = generateWhatsAppLink(offerData, url);
        window.open(waLink, '_blank');
    };

    return (
        <div className="flex flex-wrap gap-3">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 mr-2" /> Copy Link
            </Button>
            <Button onClick={handleWhatsAppShare} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
            <Button onClick={() => {
                if (navigator.share) {
                    navigator.share({
                        title: offerData.name,
                        text: `Check out this offer: ${offerData.name}`,
                        url: url,
                    });
                } else {
                    handleCopy();
                }
            }} variant="secondary" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
        </div>
    );
};

export default ShareButtons;