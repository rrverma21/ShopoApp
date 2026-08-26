import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Store, ShieldCheck, CreditCard, Truck, Users } from 'lucide-react';

const faqs = [
  {
    category: "General",
    icon: HelpCircle,
    questions: [
      {
        q: "What is ShopoApp?",
        a: "ShopoApp is a retail business software platform with tools for POS billing, inventory management, customer records, reporting, and Digital Shop."
      },
      {
        q: "Does ShopoApp sell products directly?",
        a: "No. ShopoApp provides business software and digital services; it does not sell or own physical inventory."
      }
    ]
  },
  {
    category: "For Wholesalers",
    icon: Store,
    questions: [
      {
        q: "How do I get started as a wholesaler?",
        a: "Create a business account and provide the requested business details. Available POS and Book Orders features depend on your account and membership access."
      },
      {
        q: "Which business tools can wholesalers use?",
        a: "Eligible businesses can use ShopoApp's POS, inventory, customer management, reporting, and Book Orders tools."
      }
    ]
  },
  {
    category: "For Retailers",
    icon: Users,
    questions: [
      {
        q: "What tools do I get as a retailer?",
        a: "As a member, you get access to our advanced POS system, inventory tracking, customer credit management, and your own online storefront to sell to your customers."
      },
      {
        q: "Is there a trial period?",
        a: "Yes! New retailers get a 30-day Free Trial of our Pro POS features upon registration."
      }
    ]
  },
  {
    category: "Software & Payments",
    icon: CreditCard,
    questions: [
      {
        q: "How are Digital Shop orders managed?",
        a: "Digital Shop orders are managed by the retailer through their ShopoApp order tools and store settings."
      },
      {
        q: "What are membership fees for?",
        a: "Membership fees cover access to eligible ShopoApp software tools and platform services."
      }
    ]
  }
];

const FAQ = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Find answers to frequently asked questions about ShopoApp, POS billing, inventory management, and Digital Shop features." />
      </Helmet>

      <div className="bg-[#003D82] text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Everything you need to know about our platform and services.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-16 -mt-8">
        <div className="max-w-4xl mx-auto">
          {faqs.map((group, gIdx) => (
            <motion.div 
              key={gIdx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: gIdx * 0.1 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <group.icon className="w-6 h-6 text-[#FF6B35]" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{group.category}</h2>
              </div>

              <Card className="border-none shadow-md overflow-hidden bg-white">
                <Accordion type="single" collapsible className="w-full">
                  {group.questions.map((item, qIdx) => (
                    <AccordionItem key={qIdx} value={`item-${gIdx}-${qIdx}`} className="border-slate-100 px-6 last:border-0">
                      <AccordionTrigger className="text-left font-semibold text-slate-700 hover:text-blue-600 py-4">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 leading-relaxed pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            </motion.div>
          ))}

          <div className="text-center mt-16 p-8 bg-blue-50 rounded-2xl border border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-2">Still have questions?</h3>
            <p className="text-blue-700 mb-6">We're here to help you get started or resolve any issues.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="mailto:support@shopoapp.com">
                <Button className="bg-[#003D82] text-white hover:bg-blue-800">Email Support</Button>
              </a>
              <a href="/contact">
                <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100">Contact Us</Button>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAQ;
