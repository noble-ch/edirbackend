import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Form validation schema
const formSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  edir_name: z.string().min(3, "Edir name must be at least 3 characters"),
  edir_description: z
    .string()
    .min(10, "Description must be at least 10 characters"),
  proposed_cbe_account: z
    .string()
    .regex(/^\d{13}$/, "CBE account must be 13 digits"),
  proposed_account_holder: z.string().min(2, "Account holder name is required"),
  proposed_address: z.string().min(5, "Address is required"),
  proposed_initial_deposit: z
    .number()
    .min(100, "Initial deposit must be at least 100 ETB"),
});

const EdirRequestPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      username: "",
      email: "",
      password: "",
      edir_name: "",
      edir_description: "",
      proposed_cbe_account: "",
      proposed_account_holder: "",
      proposed_address: "",
      proposed_initial_deposit: 100,
    },
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/edir/requests/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit request");
      }

      setSubmitSuccess(true);
      toast(
        "congratulation ! you have submited your request please check your email for verifcation results"
      );
      form.reset();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Create New Edir Request
            </CardTitle>
            <CardDescription>
              Fill out the form below to request the creation of a new Edir. All
              fields are required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitSuccess && (
              <Alert variant="success" className="mb-6">
                <AlertTitle>Request Submitted Successfully!</AlertTitle>
                <AlertDescription>
                  Your Edir request has been received. Our team will review it
                  and get back to you soon.
                </AlertDescription>
              </Alert>
            )}

            {submitError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Personal Information
                    </h3>

                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="john@example.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormDescription>
                            Minimum 8 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Edir Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Edir Information
                    </h3>

                    <FormField
                      control={form.control}
                      name="edir_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Edir Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Community Edir" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="edir_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Brief description of your Edir"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proposed_cbe_account"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CBE Account Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="13 digit account number"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Must be 13 digits</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proposed_account_holder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Name on the account"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proposed_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Physical address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proposed_initial_deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Deposit (ETB)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="100"
                              step="100"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>Minimum 100 ETB</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <CardFooter className="flex justify-end px-0 pb-0 pt-6">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            By submitting this request, you agree to our terms and conditions.
            Approval may take 1-3 business days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EdirRequestPage;
