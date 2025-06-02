import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import People from "@/assets/peoplesit.jpg";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            About Edir Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Revolutionizing traditional Ethiopian burial associations with
            modern technology and financial management solutions.
          </p>
        </div>

        {/* What is Edir Section */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                What is an Edir?
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                An Edir is a traditional Ethiopian community-based mutual
                assistance association where members contribute money to support
                each other during times of need, particularly for funeral
                expenses.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                These associations have been a cornerstone of Ethiopian
                community support for generations, providing financial and
                emotional support during difficult times.
              </p>
              <Button asChild variant="outline">
                <Link to="/edir/request">Join an Edir Today</Link>
              </Button>
            </div>
            <div className="bg-gray-100 p-8 rounded-lg shadow-sm">
              <img
                src={People}
                alt="Edir members meeting"
                className="rounded-lg shadow-md w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* Platform Features */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Our Platform Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">1</Badge>
                  Digital Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-lg">
                  Streamline your Edir's operations with our comprehensive
                  digital management tools for members, finances, and events.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">2</Badge>
                  Transparent Accounting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-lg">
                  Real-time financial tracking and reporting to ensure complete
                  transparency for all members.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="secondary">3</Badge>
                  Mobile Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-lg">
                  Manage your Edir from anywhere with our mobile-friendly
                  platform accessible on all devices.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-20 bg-primary/10 p-8 rounded-xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Benefits of Using Our Platform
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Time Saving",
                description: "Reduce administrative work by up to 70%",
              },
              {
                title: "Error Reduction",
                description: "Minimize calculation and record-keeping mistakes",
              },
              {
                title: "24/7 Access",
                description: "Access your Edir information anytime, anywhere",
              },
              {
                title: "Community Growth",
                description: "Easily onboard and manage new members",
              },
            ].map((benefit, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-xl mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            What Our Members Say
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                quote:
                  "This platform transformed how our Edir operates. We've saved countless hours and our members appreciate the transparency.",
                name: "Ato Kebede",
                role: "Edir Leader, Addis Ababa",
              },
              {
                quote:
                  "As a young member, I love being able to check my contributions and get notifications on my phone. It's so convenient!",
                name: "Selamawit",
                role: "Edir Member, 2 years",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="p-0">
                  <blockquote className="text-lg italic text-gray-600 mb-4">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="font-medium">
                    <p>{testimonial.name}</p>
                    <p className="text-gray-500 text-sm">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary rounded-xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Edir?
          </h2>
          <p className="text-xl mb-6 max-w-2xl mx-auto">
            Join hundreds of Edirs already benefiting from our digital platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="secondary">
              <Link to="/edir/request">Register Your Edir</Link>
            </Button>
            <Button asChild variant="outline" className="text-primary">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
