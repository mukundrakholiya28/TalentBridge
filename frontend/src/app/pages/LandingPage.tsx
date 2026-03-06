import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Search,
  Briefcase,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Mail,
  Phone,
  MapPin,
  HelpCircle
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import logo from "../../assets/0ed04b30b5fcacaeb0065c439ebb8dc86719fd9d.png";
import { getAuthToken, getUserRole } from "../../utils/authStorage";

export function LandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      title: "Find Your Dream Job with CONSOLE",
      description: "The recruitment platform that puts top-tier talent first. Say goodbye to scattered data and hello to seamless hiring.",
      primaryButton: {
        text: "Get Started",
        onClick: () => navigate("/candidate/signup")
      },
      secondaryButton: {
        text: "For Employers",
        onClick: () => navigate("/recruiter/signup")
      },
      image: "https://images.unsplash.com/photo-1770777843445-2a1621b1201d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWFtd29yayUyMGNvbGxhYm9yYXRpb258ZW58MXx8fHwxNzcyNTI3MzkxfDA&ixlib=rb-4.1.0&q=80&w=1080",
      imageAlt: "Team collaboration"
    },
    {
      title: "Hire Top Talent Faster with CONSOLE",
      description: "Streamline your recruitment process with powerful tools designed for modern hiring teams. Connect with qualified candidates instantly.",
      primaryButton: {
        text: "Start Hiring",
        onClick: () => navigate("/recruiter/signup")
      },
      secondaryButton: {
        text: "For Job Seekers",
        onClick: () => navigate("/candidate/signup")
      },
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNydWl0bWVudCUyMGludGVydmlldyUyMGhpcmluZ3xlbnwxfHx8fDE3NzI1MzAxNTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      imageAlt: "Recruitment interview"
    }
  ];

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    const token = getAuthToken();
    const role = getUserRole();
    if (!token) return;
    if (role === "recruiter") {
      navigate("/recruiter/dashboard", { replace: true });
      return;
    }
    if (role === "candidate") {
      navigate("/candidate/dashboard", { replace: true });
    }
  }, [navigate]);

  const perks = [
    {
      icon: <Search className="w-8 h-8" />,
      title: "Smart Job Matching",
      description: "AI-powered job recommendations based on your skills and preferences"
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Unified Application Tracking",
      description: "Track all your applications in one place with real-time status updates"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Direct Company Connect",
      description: "Connect directly with hiring managers and skip the middleman"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Career Growth Tools",
      description: "Access resources and insights to accelerate your career"
    }
  ];

  const tools = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Resume Parser",
      description: "Automatically extract and organize your resume details into a professional profile"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "One-Click Apply",
      description: "Apply to multiple jobs with a single click using your saved profile"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Interview Scheduler",
      description: "Seamlessly schedule and manage interviews with integrated calendar"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Offer Management",
      description: "Compare and manage multiple job offers in one dashboard"
    }
  ];

  const companies = [
    "Google", "Microsoft", "Amazon", "Meta", "Apple",
    "Netflix", "Tesla", "IBM", "Oracle", "Adobe",
    "Salesforce", "Intel"
  ];

  const institutions = [
    "MIT", "Stanford University", "Harvard University",
    "UC Berkeley", "Carnegie Mellon", "Georgia Tech",
    "University of Washington", "Cornell University"
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src={logo} alt="CONSOLE" className="w-8 h-8" />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">CONSOLE</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#perks" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Perks</a>
              <a href="#tools" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Tools</a>
              <a href="#partners" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Partners</a>
              <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">About</a>
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/candidate/signin")}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Candidate Sign In
                </button>
                <button
                  onClick={() => navigate("/recruiter/signin")}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Recruiter Sign In
                </button>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/candidate/signup")}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Candidate Sign Up
                </button>
                <button
                  onClick={() => navigate("/recruiter/signup")}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Recruiter Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text content with fade transition */}
            <div className="relative">
              {heroSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                    }`}
                >
                  <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                    {slide.title}
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                    {slide.description}
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={slide.primaryButton.onClick}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {slide.primaryButton.text}
                    </button>
                    <button
                      onClick={slide.secondaryButton.onClick}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {slide.secondaryButton.text}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Image with fade transition */}
            <div className="relative">
              {heroSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`transition-opacity duration-700 ${index === currentSlide ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                    }`}
                >
                  <ImageWithFallback
                    src={slide.image}
                    alt={slide.imageAlt}
                    className="rounded-lg shadow-2xl"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Slide indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide
                  ? 'bg-blue-600 w-8'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Perks Section */}
      <section id="perks" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose CONSOLE?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Experience the future of recruitment with our innovative platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {perks.map((perk, index) => (
              <div
                key={index}
                className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="text-blue-600 mb-4">{perk.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {perk.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {perk.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Tools at Your Fingertips
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to streamline your job search and hiring process
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tools.map((tool, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-blue-600 mb-3">{tool.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {tool.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Companies */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Trusted by Leading Companies
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
              {companies.map((company, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {company}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Educational Institutions */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Partner Educational Institutions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {institutions.map((institution, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <span className="font-semibold text-blue-900 dark:text-blue-300 text-center">
                    {institution}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Us / Footer */}
      <footer id="about" className="bg-gray-900 dark:bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="CONSOLE" className="w-6 h-6" />
                <span className="text-lg font-semibold">CONSOLE</span>
              </div>
              <p className="text-gray-400">
                Revolutionizing recruitment with innovative technology and seamless experiences.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>contact@console.com</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>San Francisco, CA</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Customer Care</a></li>
                <li><a href="#" className="hover:text-white">Report an Issue</a></li>
                <li><a href="#" className="hover:text-white">Status Page</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    FAQ
                  </a>
                </li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2026 CONSOLE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
