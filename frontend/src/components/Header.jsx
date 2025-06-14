import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import GoogleTranslateComponent from "./GoogleTranslate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Header() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [userEdir, setUserEdir] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [edirSlug, setEdirSlug] = useState("");
  const navigate = useNavigate();

  // Check localStorage for user on initial mount and on changes
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem("user");
      const access = localStorage.getItem("accessToken");
      setAccessToken(access);

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setUserEdir(parsedUser.edir?.slug || "");
        } catch (error) {
          console.error("Error parsing user from localStorage:", error);
        }
      } else {
        setUser(null);
        setAccessToken(null);
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setAccessToken(null);
    navigate("/");
  };

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [navigate]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (edirSlug.trim()) {
      navigate(`/${edirSlug}/register`);
      setIsDialogOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary shadow-md">
      <div className="container flex h-16 items-center bg-primary w-full justify-between px-4">
        {/* Logo and mobile menu button */}
        <div className="flex items-center gap-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  to="/"
                  className="flex items-center gap-2 text-lg font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <img src={logo} alt="" />
                  <span className="text-2xl font-bold text-white">
                    Edir<span className="text-sky-400">Platform</span>{" "}
                  </span>
                </Link>
                <Link
                  to="/"
                  className="text-white hover:text-black transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="about"
                  className="text-white hover:text-black transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  to="#contact"
                  className="text-white hover:text-black transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </Link>
                {accessToken ? (
                  <>
                    <Link
                      to="#profile/manage"
                      className="text-white hover:text-black transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-white hover:text-black transition-colors text-left"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to={userEdir ? `${userEdir}/login` : "/login"}
                      className="text-white hover:text-black transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <button
                          className="text-white hover:text-black transition-colors text-left"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Register
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enter Your Association</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleRegister} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="edir">Association Name</Label>
                            <Input
                              id="edir"
                              placeholder="Enter your association name"
                              value={edirSlug}
                              onChange={(e) => setEdirSlug(e.target.value)}
                              required
                            />
                          </div>
                          <Button type="submit" className="w-full">
                            Continue to Register
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <img src={logo} className="w-6 h-5" />
          <span className="text-2xl font-bold text-white">
            Edir<span className="text-sky-400">Platform</span>{" "}
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-white transition-colors hover:text-black"
          >
            Home
          </Link>
          <Link
            to="about"
            className="text-sm font-medium text-white transition-colors hover:text-black"
          >
            About
          </Link>
          <Link
            to="#contact"
            className="text-sm font-medium text-white transition-colors hover:text-black"
          >
            Contact
          </Link>
          <Link
            to="#donwload"
            className="text-sm font-medium text-white transition-colors hover:text-black"
          >
            Downoload App
          </Link>
        </nav>

        {/* Auth/Actions */}
        <div className="flex items-center gap-2">
          <GoogleTranslateComponent />

          {accessToken ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>
                      {user?.email
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {user?.username?.split(" ")[0] || "Profile"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end">
                <DropdownMenuItem asChild>
                  <Link to="#profile/manage">Manage Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={handleLogout}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-black hover:bg-secondary" size="sm">
                  Get Started
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40" align="end">
                <DropdownMenuItem asChild>
                  <Link to={userEdir ? `${userEdir}/login` : "/login"}>
                    Login
                  </Link>
                </DropdownMenuItem>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Register
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enter Your Association</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edir">Association Name</Label>
                        <Input
                          id="edir"
                          placeholder="Enter your association name"
                          value={edirSlug}
                          onChange={(e) => setEdirSlug(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Continue to Register
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
