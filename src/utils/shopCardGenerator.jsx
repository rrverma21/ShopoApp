import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { formatQRCodeData } from '@/utils/promotions/qrCodeGenerator';
import { MapPin, Star, Map as MapIcon, ArrowRight, Clock, Tag } from 'lucide-react';

export const generateAndDownloadShopCard = async (shop, shopTypeInfo, status, displayOrderMode) => {
    return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        // Increased base width for better proportions with larger text
        container.style.width = '520px'; 
        document.body.appendChild(container);

        const qrUrl = formatQRCodeData(`${window.location.origin}/digital-shop/${shop.id}`);
        const settings = shop.pos_retailer_settings || {};
        const bannerUrl = settings.storefront_image_url;
        const rating = shop.average_rating || 0;
        const ShopIcon = shopTypeInfo?.icon;

        const Card = () => (
            <div id={`shop-card-${shop.id}`} style={{
                width: '520px',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxSizing: 'border-box',
                position: 'relative',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Banner Section - Increased height to 280px to prevent compression */}
                <div style={{ height: '280px', width: '100%', backgroundColor: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
                    {bannerUrl ? (
                        <img 
                            src={bannerUrl} 
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover', 
                                objectPosition: 'center',
                                display: 'block' 
                            }} 
                            crossOrigin="anonymous" 
                            alt="Storefront" 
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}></div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}></div>
                </div>

                {/* QR Code Container (ABSOLUTE positioned to overlap banner) */}
                <div style={{ 
                    position: 'absolute',
                    top: '200px', /* Banner is 280px, this overlaps the bottom edge nicely */
                    right: '24px',
                    padding: '12px', 
                    background: '#ffffff', 
                    borderRadius: '16px', 
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', 
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 20
                }}>
                    <QRCodeCanvas value={qrUrl} size={120} level="H" includeMargin={false} />
                    <div style={{ fontSize: '12px', color: '#1a1a1a', fontWeight: '800', marginTop: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        SCAN TO ORDER
                    </div>
                </div>

                {/* Content Section */}
                <div style={{ padding: '0 24px 28px 24px', position: 'relative', zIndex: 10 }}>
                    
                    {/* Avatar */}
                    <div style={{ 
                        marginTop: '-55px', 
                        width: '110px', 
                        height: '110px', 
                        borderRadius: '50%', 
                        border: '5px solid #ffffff', 
                        backgroundColor: '#f8fafc', 
                        overflow: 'hidden', 
                        position: 'relative', 
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        flexShrink: 0
                    }}>
                        {shop.avatar_url ? (
                            <img src={shop.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" alt="Logo" />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', fontWeight: 'bold' }}>
                                {shop.business_name?.substring(0,2).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Name & Rating */}
                    {/* Max width prevents text from running under the absolute positioned QR code if the name is very long */}
                    <div style={{ marginTop: '16px', maxWidth: '320px' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '38px', fontWeight: '800', color: '#1a1a1a', lineHeight: '1.1', letterSpacing: '0.5px' }}>
                            {shop.business_name}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex' }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} color={i < Math.floor(rating) ? '#fbbf24' : '#e2e8f0'} fill={i < Math.floor(rating) ? '#fbbf24' : '#e2e8f0'} />
                                ))}
                            </div>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#334155' }}>{rating > 0 ? rating : 'New'}</span>
                            {shop.total_reviews > 0 && <span style={{ color: '#64748b', fontSize: '15px', fontWeight: '600' }}>({shop.total_reviews})</span>}
                        </div>
                    </div>

                    {/* Address Section */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <MapPin color="#3b82f6" size={24} style={{ flexShrink: 0, marginTop: '2px' }}/>
                        <div style={{ color: '#475569', fontSize: '16px', lineHeight: '1.6' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '17px' }}>{shop.street_address || 'Address not available'}</div>
                            <div style={{ fontSize: '15px', marginTop: '4px', fontWeight: '500' }}>{shop.city}, {shop.pincode}</div>
                        </div>
                    </div>

                    {/* Badges Section */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                        {shopTypeInfo && (
                            <div style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                                {ShopIcon && <ShopIcon size={16} />} {shopTypeInfo.label}
                            </div>
                        )}
                        {displayOrderMode && (
                            <div style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                                <Tag size={16} /> {displayOrderMode}
                            </div>
                        )}
                        {status && (
                            <div style={{ 
                                background: status.isOpen ? '#f0fdf4' : '#fef2f2', 
                                color: status.isOpen ? '#15803d' : '#b91c1c', 
                                border: `1px solid ${status.isOpen ? '#bbf7d0' : '#fecaca'}`, 
                                padding: '8px 12px', 
                                borderRadius: '8px', 
                                fontSize: '14px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                fontWeight: '700' 
                            }}>
                                <Clock size={16} /> {status.label}
                            </div>
                        )}
                    </div>

                    {/* Buttons Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50px', border: '2px solid #cbd5e1', borderRadius: '10px', color: '#334155', fontWeight: '700', fontSize: '16px', gap: '10px', backgroundColor: '#ffffff' }}>
                            <MapIcon size={18} color="#475569" /> View on Map
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50px', background: 'linear-gradient(to right, #2563eb, #4f46e5)', borderRadius: '10px', color: '#ffffff', fontWeight: '700', fontSize: '16px', gap: '10px', boxShadow: '0 4px 14px -2px rgba(37, 99, 235, 0.4)' }}>
                            Visit Shop <ArrowRight size={18} />
                        </div>
                    </div>

                </div>
            </div>
        );

        const root = createRoot(container);
        root.render(<Card />);

        // Wait slightly longer to ensure fonts and images render at high-res
        setTimeout(async () => {
            try {
                const element = document.getElementById(`shop-card-${shop.id}`);
                const canvas = await html2canvas(element, {
                    scale: 3, // High resolution for sharp text and printing
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    allowTaint: true
                });
                
                const link = document.createElement('a');
                link.download = `${shop.business_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-card.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
                
                resolve();
            } catch (err) {
                console.error('Failed to generate shop card image:', err);
                reject(err);
            } finally {
                root.unmount();
                container.remove();
            }
        }, 1500); 
    });
};