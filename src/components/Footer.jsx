import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin, ShieldCheck, Lock } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-2">
              <img src="https://horizons-cdn.hostinger.com/3c38fd60-a24a-4d78-a3d8-58678655dafd/a7b90c40bcf1c912ebc37808895f8526.png" alt="ShopoApp Logo" className="h-8 w-auto object-contain" />
              <span className="text-2xl font-bold text-white">ShopoApp</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Empowering local businesses with practical tools for POS billing, inventory management, customer records, Digital Shop, and delivery services.
            </p>
            <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-white">Business Tools</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                    <Lock className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-white">SSL Secured</span>
                </div>
            </div>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="Twitter"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="LinkedIn"><Linkedin className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <span className="block font-semibold text-white text-lg mb-6">Platform</span>
            <ul className="space-y-3">
              <li><Link to="/about" className="hover:text-blue-400 transition-colors text-sm">About Us</Link></li>
              <li><Link to="/local-shops" className="hover:text-blue-400 transition-colors text-sm">Local Shops</Link></li>
              <li><Link to="/water-order" className="hover:text-blue-400 transition-colors text-sm">Water Order</Link></li>
              <li><Link to="/retailer-tools" className="hover:text-blue-400 transition-colors text-sm">Retailer Tools</Link></li>
              <li><Link to="/signup" className="hover:text-blue-400 transition-colors text-sm">Get Started</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <span className="block font-semibold text-white text-lg mb-6">Legal & Policy</span>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="hover:text-blue-400 transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-blue-400 transition-colors text-sm">Terms of Service</Link></li>
              <li><Link to="/refund-policy" className="hover:text-blue-400 transition-colors text-sm">Refund Policy</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-blue-400 transition-colors text-sm">Shipping Policy</Link></li>
              <li><Link to="/payment-policy" className="hover:text-blue-400 transition-colors text-sm">Payment Policy</Link></li>
              <li><Link to="/dispute-resolution" className="hover:text-blue-400 transition-colors text-sm">Dispute Resolution</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <span className="block font-semibold text-white text-lg mb-6">Contact Us</span>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-3 text-blue-500 mt-0.5 shrink-0" />
                <span>
                  Zyvora Technologies Pvt. Ltd.<br />
                  Sector-20, Airoli,<br />
                  Navi Mumbai - 400 708
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-3 text-blue-500 shrink-0" />
                <span>+91 9429693122</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-3 text-blue-500 shrink-0" />
                <a href="mailto:info@shopoapp.in" className="hover:text-blue-400 transition-colors">info@shopoapp.in</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {currentYear} <strong>Zyvora Technologies Pvt. Ltd.</strong> All Rights Reserved.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            ShopoApp provides software and digital services for retail businesses. We do not sell physical products directly.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
