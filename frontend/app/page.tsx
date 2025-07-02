'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  Heart, 
  PackageOpen, 
  Users, 
  Calendar, 
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  Mail,
  TrendingUp,
  Award,
  Handshake,
  Star,
  ChevronRight,
  CheckCircle,
  Zap,
  Globe,
  Shield,
  HeartHandshake
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';

// Counter animation component
function Counter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

// Testimonial component
function TestimonialCard({ name, role, content, rating }: {
  name: string;
  role: string;
  content: string;
  rating: number;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          ))}
        </div>
                 <CardDescription className="italic">&ldquo;{content}&rdquo;</CardDescription>
      </CardHeader>
      <CardFooter>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    setIsSubscribed(true);
    setEmail('');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Enhanced Navigation */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 md:gap-10">
            <Logo 
              size="md" 
              showText={true} 
              href="/" 
              textClassName="hidden md:inline-block"
            />
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
                How It Works
              </Link>
              <Link href="#get-involved" className="text-sm font-medium hover:text-primary transition-colors">
                Get Involved
              </Link>
              <Link href="#impact" className="text-sm font-medium hover:text-primary transition-colors">
                Our Impact
              </Link>
              <Link href="#contact" className="text-sm font-medium hover:text-primary transition-colors">
                Contact
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-primary/10">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-gray-900/[0.04] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent" />
        
        <div className="container relative px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  <Zap className="h-3 w-3 mr-1" />
                  Making a difference since 2023
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  Building Stronger
                  <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"> Communities</span>
                </h1>
                <p className="max-w-[600px] text-xl text-muted-foreground md:text-2xl">
                  Connect with essential resources, generous donors, and dedicated volunteers. 
                                     Together, we&rsquo;re creating a supportive network for everyone in Lewisham.
                </p>
              </div>
              
              <div className="flex flex-col gap-4 min-[400px]:flex-row">
                <Link href="/register?role=visitor" className="group">
                  <Button size="lg" className="w-full text-lg px-8 py-6 group-hover:scale-105 transition-transform">
                    Get Help Today
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/register?role=donor" className="group">
                  <Button size="lg" variant="outline" className="w-full text-lg px-8 py-6 group-hover:scale-105 transition-transform">
                    Give Back
                    <Heart className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                </Link>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    <Counter end={1247} />+
                  </div>
                  <div className="text-sm text-muted-foreground">Families Helped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    <Counter end={89} />+
                  </div>
                  <div className="text-sm text-muted-foreground">Active Volunteers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    <Counter end={15000} />+
                  </div>
                  <div className="text-sm text-muted-foreground">Items Donated</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl border">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Trusted & Secure</h3>
                      <p className="text-sm text-muted-foreground">Data protected with enterprise-grade security</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Quick Response</h3>
                      <p className="text-sm text-muted-foreground">Get help within 24-48 hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Globe className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Community Driven</h3>
                      <p className="text-sm text-muted-foreground">By the community, for the community</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Statistics */}
      <section id="impact" className="w-full py-16 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Community Impact</h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              Real numbers showing the difference we&rsquo;re making together in the Lewisham community
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                <Counter end={1247} />
              </div>
              <div className="text-primary-foreground/80">Families Supported</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                £<Counter end={45000} />
              </div>
              <div className="text-primary-foreground/80">Value of Donations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                <Counter end={890} />
              </div>
              <div className="text-primary-foreground/80">Volunteer Hours</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                <Counter end={98} />%
              </div>
              <div className="text-primary-foreground/80">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced */}
      <section id="how-it-works" className="w-full py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Simple Process
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">How It Works</h2>
            <p className="max-w-3xl mx-auto text-xl text-muted-foreground">
              Our streamlined process makes it easy to get help, donate, or volunteer
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection lines for desktop */}
            <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/50 to-primary/50" />
            
            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <CardTitle className="text-xl">Register Your Account</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Create your account in minutes. Choose your role: visitor seeking help, 
                  donor providing support, or volunteer offering time.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Quick 3-minute signup
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Secure verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Personalized dashboard
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <CardTitle className="text-xl">Schedule & Connect</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Book appointments for assistance visits, schedule donation drop-offs, 
                  or sign up for volunteer shifts that fit your schedule.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Flexible scheduling
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Real-time availability
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Automatic reminders
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative group hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Handshake className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <CardTitle className="text-xl">Make a Difference</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Visit our center to receive help, drop off donations, or volunteer. 
                  Every interaction strengthens our community.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Friendly support staff
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Safe, welcoming space
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Track your impact
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Community Stories
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">What Our Community Says</h2>
            <p className="max-w-3xl mx-auto text-xl text-muted-foreground">
              Real stories from the people who make our community stronger
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <TestimonialCard
               name="Sarah Mitchell"
               role="Single Mother of Two"
               content="The Hub helped us through a really difficult time. The volunteers were so kind and understanding. We&rsquo;re back on our feet now and I even volunteer here myself!"
               rating={5}
             />
            <TestimonialCard
              name="Marcus Johnson"
              role="Regular Volunteer"
                             content="Volunteering here has been incredibly rewarding. You can see the immediate impact you&rsquo;re making in people&rsquo;s lives. The team makes it easy to get involved."
              rating={5}
            />
                         <TestimonialCard
               name="Emma Thompson"
               role="Local Business Owner"
               content="We&rsquo;ve been donating goods through the Hub for over a year. Their transparency and efficiency in distribution is impressive. Our donations really make a difference."
               rating={5}
             />
          </div>
        </div>
      </section>

      {/* Get Involved - Enhanced */}
      <section id="get-involved" className="w-full py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Join Our Mission
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Get Involved Today</h2>
            <p className="max-w-3xl mx-auto text-xl text-muted-foreground">
              Every person in our community has something valuable to offer. Find your way to contribute.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary">For Visitors</Badge>
                </div>
                <CardTitle className="text-xl">Need Support?</CardTitle>
                <CardDescription className="text-base">
                  Access essential resources with dignity and respect
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Food parcels & household items</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Personal guidance & support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Confidential & judgment-free</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Connection to other services</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/register?role=visitor" className="w-full group">
                  <Button className="w-full group-hover:scale-105 transition-transform">
                    Register as Visitor
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Heart className="h-6 w-6 text-green-600" />
                  </div>
                  <Badge variant="secondary">For Donors</Badge>
                </div>
                <CardTitle className="text-xl">Give Back</CardTitle>
                <CardDescription className="text-base">
                  Make a lasting impact with your generous contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Monetary donations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Essential items & goods</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Tax-deductible receipts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Impact tracking & reports</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/register?role=donor" className="w-full group">
                  <Button className="w-full group-hover:scale-105 transition-transform">
                    Become a Donor
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Handshake className="h-6 w-6 text-purple-600" />
                  </div>
                  <Badge variant="secondary">For Volunteers</Badge>
                </div>
                <CardTitle className="text-xl">Share Your Time</CardTitle>
                <CardDescription className="text-base">
                  Use your skills and passion to help others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Flexible scheduling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Training & support provided</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Recognition & certificates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Build meaningful connections</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/register?role=volunteer" className="w-full group">
                  <Button className="w-full group-hover:scale-105 transition-transform">
                    Volunteer Today
                    <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Emergency Contact & Info */}
      <section className="w-full py-16 bg-red-50 dark:bg-red-950/10">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <ShieldCheck className="h-4 w-4" />
                Emergency Support
              </div>
              <h2 className="text-2xl font-bold mb-4">Need Immediate Help?</h2>
                               <p className="text-muted-foreground">
                   If you&rsquo;re facing an emergency situation, don&rsquo;t wait. Contact us immediately.
                 </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Emergency Hotline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary mb-2">020 8314 8811</p>
                  <p className="text-sm text-muted-foreground">
                    Available 24/7 for urgent food or housing emergencies
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Walk-in Center
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold mb-2">Lewisham Community</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    123 High Street, Lewisham, SE13 6AT
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Open Mon-Fri: 9AM-5PM, Sat: 10AM-2PM
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="w-full py-16 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Connected</h2>
            <p className="text-primary-foreground/80 mb-8">
              Get updates on our programs, volunteer opportunities, and community events.
            </p>
            
            {!isSubscribed ? (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white text-gray-900"
                />
                <Button type="submit" variant="secondary" className="sm:w-auto">
                  Subscribe
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2 text-lg">
                <CheckCircle className="h-6 w-6" />
                <span>Thank you for subscribing!</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer id="contact" className="border-t bg-white dark:bg-gray-950">
        <div className="container px-4 md:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="flex items-center justify-center h-8 w-8 bg-primary text-primary-foreground rounded-md">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <span className="font-bold text-lg">Lewisham Charity</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Building stronger communities through connection, compassion, and collective action.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <span className="sr-only">Facebook</span>
                  <div className="h-6 w-6 bg-current rounded" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <span className="sr-only">Twitter</span>
                  <div className="h-6 w-6 bg-current rounded" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <span className="sr-only">Instagram</span>
                  <div className="h-6 w-6 bg-current rounded" />
                </a>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Get Involved</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register?role=visitor" className="text-muted-foreground hover:text-primary transition-colors">Get Help</Link></li>
                <li><Link href="/register?role=donor" className="text-muted-foreground hover:text-primary transition-colors">Donate</Link></li>
                <li><Link href="/register?role=volunteer" className="text-muted-foreground hover:text-primary transition-colors">Volunteer</Link></li>
                <li><Link href="/volunteer/apply" className="text-muted-foreground hover:text-primary transition-colors">Apply to Volunteer</Link></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/programs" className="text-muted-foreground hover:text-primary transition-colors">Programs</Link></li>
                <li><Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">123 High Street, Lewisham SE13 6AT</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">020 8314 8811</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">hello@lewishamCharity.org</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Mon-Fri: 9AM-5PM</span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Lewisham Charity. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="text-muted-foreground hover:text-primary transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
