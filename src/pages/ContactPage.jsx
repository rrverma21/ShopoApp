import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, Building, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
const ContactPage = () => {
  const {
    toast
  } = useToast();
  const handleSubmit = e => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "We've received your message and will get back to you shortly."
    });
  };
  return <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Reach out to ShopoApp for product support, business inquiries, or partnership opportunities. We're here to help your retail business succeed." />
      </Helmet>

      <div className="bg-slate-900 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h1 initial={{
          opacity: 0,
          y: -20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="text-4xl md:text-5xl font-bold mb-4">
            Get in Touch
          </motion.h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Have questions about ShopoApp or its retail tools? We're here to help.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-16 -mt-16">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Registered Entity</h3>
                    <p className="text-slate-600 font-medium">Zyvora Technologies Pvt. Ltd.</p>
                    <p className="text-slate-500 text-sm mt-1">Retail Business Software Platform</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800">Office Address</h4>
                    <p className="text-slate-600 text-sm">
                      Sector-20, Airoli,<br />
                      Navi Mumbai - 400 708,<br />
                      Maharashtra, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800">Phone</h4>
                    <p className="text-slate-600 text-sm">+91 9429693122</p>
                    <p className="text-xs text-slate-400">Mon-Fri, 9am - 6pm</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800">Email</h4>
                    <a href="mailto:support@shopoapp.com" className="text-blue-600 text-sm hover:underline block">support@shopoapp.in</a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-none shadow-lg h-full">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" placeholder="john@company.com" required />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="General Inquiry" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <textarea id="message" rows="6" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="How can we help?" required></textarea>
                  </div>

                  <Button type="submit" className="w-full md:w-auto btn-primary">
                    <Send className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>;
};
export default ContactPage;
