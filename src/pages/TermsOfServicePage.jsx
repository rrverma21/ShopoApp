import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

const TermsOfServicePage = () => {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using the B2B Nexus platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our services. These terms apply to all users, including sellers, clients, and visitors."
    },
    {
      title: "2. Account Registration and Security",
      content: "To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate. You are responsible for safeguarding your password and for all activities that occur under your account."
    },
    {
      title: "3. Use of the Platform",
      content: "You agree to use the platform only for lawful purposes and in accordance with these Terms. You are prohibited from using the site to engage in any fraudulent activity, to violate any applicable laws, or to infringe upon the rights of others. Sellers are responsible for the accuracy of their product listings and for fulfilling orders."
    },
    {
      title: "4. Intellectual Property",
      content: "The platform and its original content, features, and functionality are and will remain the exclusive property of B2B Nexus and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent."
    },
    {
      title: "5. Termination",
      content: "We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive termination shall survive termination."
    },
    {
      title: "6. Limitation of Liability",
      content: "In no event shall B2B Nexus, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service."
    },
    {
      title: "7. Governing Law",
      content: "These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights."
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Read the B2B Nexus Terms of Service. By using our platform, you agree to these terms and conditions." />
      </Helmet>

      <main className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4">Terms of Service</h1>
          <p className="text-lg text-slate-600">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </motion.div>

        <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-lg shadow-lg">
          <div className="prose prose-lg max-w-none text-slate-700">
            <p className="lead">
              Please read these Terms of Service carefully before using the B2B Nexus platform. Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms.
            </p>
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-3">{section.title}</h2>
                <p>{section.content}</p>
              </motion.div>
            ))}
            <div className="mt-12 border-t pt-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us at <a href="mailto:info@b2bnexus.in" className="text-blue-600 hover:underline">info@b2bnexus.in</a>.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfServicePage;