import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Mail, Phone, Users, CheckCircle } from "lucide-react";

const enterpriseContactSchema = z.object({
  userId: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  teamSize: z.string().min(1, "Please select team size"),
  monthlyAudits: z.string().min(1, "Please select estimated monthly audits"),
  requirements: z.string().optional(),
});

type EnterpriseContactForm = z.infer<typeof enterpriseContactSchema>;

interface EnterpriseContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

export function EnterpriseContactModal({ open, onOpenChange, userId }: EnterpriseContactModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<EnterpriseContactForm>({
    resolver: zodResolver(enterpriseContactSchema),
    defaultValues: {
      userId: userId || undefined,
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      teamSize: "",
      monthlyAudits: "",
      requirements: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: EnterpriseContactForm) => {
      const response = await apiRequest("POST", "/api/enterprise/contact", data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      toast({
        title: "Contact Request Submitted",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit contact form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnterpriseContactForm) => {
    submitMutation.mutate(data);
  };

  const handleClose = () => {
    if (!submitMutation.isPending) {
      setIsSubmitted(false);
      form.reset();
      onOpenChange(false);
    }
  };

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 max-w-md" data-testid="dialog-enterprise-success">
          <DialogHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Thank You!
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-base">
              Your enterprise inquiry has been submitted successfully. Our sales team will contact you within 24 hours to discuss your custom solution.
            </DialogDescription>
          </DialogHeader>
          <Button 
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white"
            data-testid="button-close-success"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 max-w-2xl max-h-[95vh] overflow-y-auto" data-testid="dialog-enterprise-contact">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Enterprise Contact
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-base">
            Tell us about your organization's smart contract auditing needs. We'll create a custom solution tailored to your requirements.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Corporation"
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        data-testid="input-company-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Contact Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Smith"
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        data-testid="input-contact-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@acme.com"
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400"
                        data-testid="input-phone"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teamSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Team Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="bg-slate-800/50 border-slate-600 text-white"
                          data-testid="select-team-size"
                        >
                          <SelectValue placeholder="Select team size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="1-5">1-5 developers</SelectItem>
                        <SelectItem value="6-20">6-20 developers</SelectItem>
                        <SelectItem value="21-50">21-50 developers</SelectItem>
                        <SelectItem value="51-100">51-100 developers</SelectItem>
                        <SelectItem value="100+">100+ developers</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyAudits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Monthly Audits</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="bg-slate-800/50 border-slate-600 text-white"
                          data-testid="select-monthly-audits"
                        >
                          <SelectValue placeholder="Estimated monthly audits" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="1-10">1-10 audits/month</SelectItem>
                        <SelectItem value="11-50">11-50 audits/month</SelectItem>
                        <SelectItem value="51-100">51-100 audits/month</SelectItem>
                        <SelectItem value="100+">100+ audits/month</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Special Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your specific needs: compliance requirements, integration needs, security standards, etc."
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[100px]"
                      data-testid="textarea-requirements"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitMutation.isPending}
                className="flex-1 bg-transparent border-slate-600 text-white hover:bg-slate-800"
                data-testid="button-cancel-contact"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white"
                data-testid="button-submit-contact"
              >
                {submitMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Submitting...
                  </div>
                ) : (
                  "Submit Enterprise Inquiry"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}