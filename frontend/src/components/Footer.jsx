import React from "react";
// Import Lucide icons
import { Facebook, Twitter, Instagram, Linkedin, Github } from "lucide-react";

// You can replace this with an actual SVG logo or an <img> tag
const Logo = () => (
  <span className="text-2xl font-bold text-white">
    Edir<span className="text-sky-400">Platform</span>{" "}
    {/* Changed blue-400 to sky-400 for a slightly different hue */}
  </span>
);

function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      href: "https://facebook.com",
      IconComponent: Facebook,
      label: "Facebook",
    },
    { href: "https://twitter.com", IconComponent: Twitter, label: "Twitter" },
    {
      href: "https://instagram.com",
      IconComponent: Instagram,
      label: "Instagram",
    },
    {
      href: "https://linkedin.com",
      IconComponent: Linkedin,
      label: "LinkedIn",
    },
    { href: "https://github.com", IconComponent: Github, label: "GitHub" }, // Example
  ];

  const footerNavs = [
    {
      label: "Company",
      items: [
        { href: "/about", name: "About Us" },
        { href: "/careers", name: "Careers" },
        { href: "/blog", name: "Blog" },
        { href: "/contact", name: "Contact Us" },
      ],
    },
    {
      label: "Resources",
      items: [
        { href: "/faq", name: "FAQ" },
        { href: "/support", name: "Support Center" },
        { href: "/developers", name: "Developers" },
        { href: "/sitemap", name: "Sitemap" },
      ],
    },
    {
      label: "Legal",
      items: [
        { href: "/privacy", name: "Privacy Policy" },
        { href: "/terms", name: "Terms of Service" },
        { href: "/cookies", name: "Cookie Policy" },
        { href: "/accessibility", name: "Accessibility Statement" }, // Renamed for clarity
      ],
    },
  ];

  return (
    <footer className="bg-brunswick-green text-gray-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top section: Logo, Navigation, Socials */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-12">
          {/* Logo and tagline */}
          <div className="md:col-span-12 lg:col-span-4">
            <div className="mb-5">
              {" "}
              {/* Increased margin-bottom slightly */}
              <Logo />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              {" "}
              {/* max-w-sm for slightly narrower text */}
              Empowering communities through efficient and transparent Edir
              management. Join us in building stronger local networks.
            </p>
          </div>

          {/* Navigation Links - using a fragment for better grouping in the grid */}
          <>
            {footerNavs.map((nav) => (
              <div key={nav.label} className="md:col-span-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">
                  {" "}
                  {/* Adjusted heading style */}
                  {nav.label}
                </h3>
                <ul className="space-y-3">
                  {nav.items.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm text-gray-400 hover:text-sky-400 transition-colors duration-200"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>

          {/* Social Links / Newsletter (optional) */}
          <div className="md:col-span-4 lg:col-span-2 md:col-start-9 lg:col-start-auto">
            {" "}
            {/* Adjusted column start for medium screens */}
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">
              Connect With Us
            </h3>
            <div className="flex space-x-4">
              {socialLinks.map(({ href, IconComponent, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gray-400 hover:text-green-400 transition-colors duration-200"
                >
                  <IconComponent size={22} strokeWidth={1.5} />{" "}
                  {/* Lucide icons often look good with adjusted strokeWidth */}
                </a>
              ))}
            </div>
            {/* Optional: Newsletter Signup
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                Stay Updated
              </h3>
              <form action="#" method="POST" className="flex flex-col sm:flex-row gap-2.5">
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  type="email"
                  name="email-address"
                  id="email-address"
                  autoComplete="email"
                  required
                  className="w-full px-3.5 py-2.5 rounded-md border-0 bg-slate-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-inset focus:ring-sky-500 sm:max-w-xs text-sm"
                  placeholder="your@email.com"
                />
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 shrink-0"
                >
                  Subscribe
                </button>
              </form>
            </div>
            */}
          </div>
        </div>

        {/* Bottom section: Copyright */}
        <div className="py-8 border-t border-slate-800 text-center sm:flex sm:justify-between sm:items-center">
          <p className="text-xs text-gray-500">
            {" "}
            {/* Slightly smaller copyright */}© {currentYear} Edir Platform. All
            rights reserved. Built with love & code.
          </p>
          <div className="mt-4 sm:mt-0 flex justify-center space-x-5">
            <a
              href="/privacy"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200"
            >
              Privacy
            </a>
            <span className="text-xs text-gray-600 select-none">|</span>{" "}
            {/* select-none to prevent selecting the pipe */}
            <a
              href="/terms"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
