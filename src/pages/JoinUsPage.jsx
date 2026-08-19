import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, ChevronRight, Upload, Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ApplicationForm = ({ vacancy, onFormSubmit }) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.type) && file.size <= 5 * 1024 * 1024) { // 5MB limit
        setResumeFile(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a PDF or Word document under 5MB.",
          variant: "destructive",
        });
        e.target.value = null;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      toast({ title: "Resume Required", description: "Please upload your resume.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resumeFile);

      if (uploadError) throw uploadError;
      
      const { error: insertError } = await supabase
        .from('job_applications')
        .insert({
          vacancy_id: vacancy.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          resume_url: filePath, // Store the path instead of a public URL
        });

      if (insertError) throw insertError;

      toast({
        title: "Application Submitted!",
        description: "Thank you for applying. We will get back to you soon.",
      });
      setSubmitted(true);
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        </motion.div>
        <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
        <p className="text-slate-600 mb-6">Your application has been successfully submitted. We will review it and get back to you soon.</p>
        <DialogClose asChild>
          <Button onClick={onFormSubmit}>Close</Button>
        </DialogClose>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
      </div>
      <div>
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
      </div>
      <div>
        <Label htmlFor="resume">Resume (PDF, DOC, DOCX - max 5MB)</Label>
        <Input id="resume" type="file" onChange={handleFileChange} required accept=".pdf,.doc,.docx" />
      </div>
      <Button type="submit" className="w-full btn-primary" disabled={loading}>
        {loading ? 'Submitting...' : <><Send className="mr-2 h-4 w-4" /> Submit Application</>}
      </Button>
    </form>
  );
};

const JoinUsPage = () => {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vacancies')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVacancies(data);
    } catch (error) {
      toast({
        title: "Error fetching vacancies",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>ShopoApp | Smart POS Billing, Inventory & Taxation Software</title>
        <meta name="description" content="Explore career opportunities at B2B Nexus. Join our team and help us build the future of B2B e-commerce." />
      </Helmet>
      <main className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">Join Our Team</h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
            We're looking for passionate individuals to help us revolutionize the B2B e-commerce space. Explore our open positions below.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : vacancies.length > 0 ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {vacancies.map((vacancy, index) => (
              <motion.div
                key={vacancy.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Dialog onOpenChange={setIsDialogOpen}>
                  <Card className="glass-effect card-hover">
                    <CardHeader>
                      <CardTitle className="text-2xl text-slate-800">{vacancy.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 pt-1">
                        <MapPin className="h-4 w-4" /> {vacancy.location || 'Remote'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-slate-600 mb-6 space-y-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: vacancy.description.replace(/\n/g, '<br />') }} />
                      <DialogTrigger asChild>
                        <Button className="btn-primary">
                          Apply Now <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </CardContent>
                  </Card>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Apply for {vacancy.title}</DialogTitle>
                      <DialogDescription>
                        Fill in your details below to submit your application.
                      </DialogDescription>
                    </DialogHeader>
                    <ApplicationForm vacancy={vacancy} onFormSubmit={() => setIsDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Briefcase className="h-16 w-16 mx-auto text-slate-400 mb-4" />
            <h2 className="text-2xl font-semibold text-slate-700">No Openings Currently</h2>
            <p className="text-slate-500 mt-2">
              We are not actively hiring at the moment, but we're always looking for talent. <br />
              Please check back later or send your resume to <a href="mailto:careers@b2bnexus.in" className="text-blue-600 hover:underline">careers@b2bnexus.in</a>.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default JoinUsPage;