import React from "react";
import heroimg from "@/assets/hero.jpg";
import {
  ArrowRight,
  Users,
  Handshake,
  Shield,
  PieChart,
  Smartphone,
  MessageSquare,
  CalendarCheck,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section
        className="relative h-[600px] w-full flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroimg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <HeartHandshake className="w-5 h-5" />
              <span className="text-sm font-medium">Community Since 2010</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              የእድር ጥንካሬ በአንድነታችን ውስጥ ነው
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Empowering Ethiopian communities through mutual support and
              financial solidarity
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg bg-orange-500 hover:bg-orange-600"
              >
                Join Our Community <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg border-white text-green-500 hover:text-orange-400 hover:bg-white/10"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-brunswick-green text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">1,236+</div>
              <p className="text-sm opacity-80">Active Members</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">45+</div>
              <p className="text-sm opacity-80">Communities</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">98%</div>
              <p className="text-sm opacity-80">Satisfaction Rate</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">10+</div>
              <p className="text-sm opacity-80">Years Experience</p>
            </div>
          </div>
        </div>
      </div>

      {/* EDIR Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our EDIR Community
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A traditional Ethiopian mutual aid association providing financial
              and emotional support during times of need
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="items-center">
                <div className="bg-orange-100 p-4 rounded-full">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-center">Community Support</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                Members help comfort and assist each other in times of loss by
                sharing funeral costs.
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="items-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <Handshake className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-center">Mutual Assistance</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                Financial solidarity through collective contributions for
                transportation and services.
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="items-center">
                <div className="bg-blue-100 p-4 rounded-full">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-center">Trust & Security</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                Transparent operations and secure management of collective
                funds.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* App Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Digital Platform
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Modern tools to manage your EDIR contributions and community
              engagement
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-xl transition-all h-full">
              <CardHeader className="items-center">
                <div className="bg-purple-100 p-4 rounded-full mb-4">
                  <Smartphone className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-center">EDIR Mobile App</CardTitle>
                <CardDescription className="text-center">
                  ACAPP AMA AM
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-600 p-1 rounded-full">
                      <PieChart className="w-4 h-4" />
                    </span>
                    Contribution Tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-1 rounded-full">
                      <MessageSquare className="w-4 h-4" />
                    </span>
                    Community Chat
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-600 p-1 rounded-full">
                      <CalendarCheck className="w-4 h-4" />
                    </span>
                    Event Calendar
                  </li>
                </ul>
                <Button variant="outline" className="mt-6">
                  Download App
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all h-full">
              <CardHeader className="items-center">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                  <PieChart className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-center">
                  Financial Dashboard
                </CardTitle>
                <CardDescription className="text-center">
                  AMAPPA PHYSI ALL
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-gray-800 mb-2">
                  +EC3A
                </div>
                <p className="text-gray-600 mb-6">
                  Advanced financial reporting
                </p>
                <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  [Chart Placeholder]
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all h-full">
              <CardHeader className="items-center">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-center">Member Network</CardTitle>
                <CardDescription className="text-center">
                  RAM APPHYSI ALL
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <div
                        key={item}
                        className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white"
                      ></div>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  Connect with 1,236+ community members
                </p>
                <Button variant="outline">Explore Network</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-200 text-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Impact</h2>
            <p className="text-lg text-black">
              Transforming communities through collective support and financial
              empowerment
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      OPULCAN +45% MASS
                    </h3>
                    <p className="text-black">
                      Member growth over last year
                    </p>
                  </div>
                </div>
                <div className="mt-6 h-32 bg-white/10 rounded-lg flex items-center justify-center">
                  [Growth Chart]
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">MASSAGE online</h3>
                    <p className="text-black">
                      Community engagement platform
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Discussions</span>
                    <span>87%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full"
                      style={{ width: "87%" }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 bg-orange-50 p-8 md:p-12 flex flex-col justify-center">
                <h3 className="text-2xl font-bold mb-4">Stay Connected</h3>
                <p className="text-gray-600 mb-6">
                  Join our newsletter to receive updates on community events and
                  EDIR news
                </p>
                <div className="flex gap-2">
                  <Input placeholder="Your email address" />
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    Subscribe
                  </Button>
                </div>
              </div>
              <div className="md:w-1/2 bg-gray-100 p-8 md:p-12 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    Community updates straight to your inbox
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
    </div>
  );
}

export default HomePage;
