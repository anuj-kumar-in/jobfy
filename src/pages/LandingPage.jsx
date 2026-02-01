import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Rocket,
    Target,
    Zap,
    Shield,
    CheckCircle,
    ArrowRight,
    Sparkles,
    FileText,
    Search,
    Bot,
    TrendingUp,
    Users,
    Award
} from 'lucide-react';

const LandingPage = () => {
    const { user, login } = useAuth();

    const handleLogin = async () => {
        try {
            await login();
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const features = [
        {
            icon: <FileText className="w-8 h-8" />,
            title: "Student Artifact Pack Generator",
            description: "Ingest your resume, LinkedIn, GitHub, and portfolio to create a reusable pack of artifacts for thousands of applications."
        },
        {
            icon: <Search className="w-8 h-8" />,
            title: "Smart Job Search & Ranking",
            description: "AI-powered search that finds and ranks jobs based on your skills, experience, location preferences, and career goals."
        },
        {
            icon: <Bot className="w-8 h-8" />,
            title: "Auto-Personalization Engine",
            description: "Generate tailored resumes and cover letters for each job, mapping your achievements to job requirements automatically."
        },
        {
            icon: <Zap className="w-8 h-8" />,
            title: "One-Click Auto-Apply",
            description: "Submit applications at scale with intelligent retry handling, rate limiting, and comprehensive application tracking."
        },
        {
            icon: <Shield className="w-8 h-8" />,
            title: "Safe by Design",
            description: "Set your apply policy once - max applications, minimum match threshold, blocked companies - and let AI handle the rest."
        },
        {
            icon: <TrendingUp className="w-8 h-8" />,
            title: "Real-time Analytics",
            description: "Track your application status, success rates, and get insights to improve your job search strategy."
        }
    ];

    const stats = [
        { value: "10,000+", label: "Jobs Available" },
        { value: "500+", label: "Companies" },
        { value: "95%", label: "Success Rate" },
        { value: "24/7", label: "AI Support" }
    ];

    const steps = [
        {
            number: "01",
            title: "Create Your Profile",
            description: "Upload your resume or paste text. Our AI extracts and structures your data automatically."
        },
        {
            number: "02",
            title: "Set Preferences",
            description: "Define your job criteria, constraints, and apply policy to guide the AI agent."
        },
        {
            number: "03",
            title: "AI Does the Work",
            description: "Watch as our agent searches, personalizes, and applies to matching jobs for you."
        },
        {
            number: "04",
            title: "Track & Succeed",
            description: "Monitor applications in real-time and celebrate your interviews and offers."
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100"></div>
                <div className="absolute top-20 left-10 w-72 h-72 bg-black/5 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-black/5 rounded-full blur-3xl animate-float delay-200"></div>

                <div className="relative max-w-7xl mx-auto">
                    <div className="text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium mb-8 animate-fadeIn">
                            <Sparkles size={16} />
                            <span>AI-Powered Job Search Agent</span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-5xl md:text-7xl font-bold text-black mb-6 leading-tight animate-fadeIn">
                            Your Career on
                            <span className="block mt-2">
                                <span className="relative inline-block">
                                    <span className="bg-gradient-to-r from-black via-gray-700 to-black bg-clip-text text-transparent animate-gradient">
                                        Autopilot
                                    </span>
                                    <div className="absolute -bottom-2 left-0 right-0 h-1 bg-black rounded-full"></div>
                                </span>
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 animate-fadeIn delay-100">
                            Stop wasting weeks on repetitive applications. Let our AI agent search, personalize,
                            and apply to jobs while you focus on what matters - preparing for interviews.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeIn delay-200">
                            {user ? (
                                <Link
                                    to="/jobs"
                                    className="group inline-flex items-center space-x-3 px-8 py-4 bg-black text-white rounded-full text-lg font-semibold hover:bg-gray-800 transition-all duration-300 shadow-2xl hover:shadow-black/20 transform hover:-translate-y-1"
                                >
                                    <span>Explore Jobs</span>
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <button
                                    onClick={handleLogin}
                                    className="group inline-flex items-center space-x-3 px-8 py-4 bg-black text-white rounded-full text-lg font-semibold hover:bg-gray-800 transition-all duration-300 shadow-2xl hover:shadow-black/20 transform hover:-translate-y-1"
                                >
                                    <span>Start  Today</span>
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                            <Link
                                to="#features"
                                className="inline-flex items-center space-x-2 px-8 py-4 border-2 border-black text-black rounded-full text-lg font-semibold hover:bg-black hover:text-white transition-all duration-300"
                            >
                                <span>Learn More</span>
                            </Link>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 animate-fadeIn delay-300">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
                                <div className="text-4xl font-bold text-black mb-2">{stat.value}</div>
                                <div className="text-gray-500 font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1 bg-black text-white rounded-full text-sm font-medium mb-4">
                            Powerful Features
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
                            Everything You Need to Land Your Dream Job
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Our AI agent handles the entire job search pipeline so you can focus on interview prep.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:border-black transition-all duration-300 card-hover"
                            >
                                <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-black mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1 bg-black text-white rounded-full text-sm font-medium mb-4">
                            Simple Process
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
                            How Jobfy Works
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Get started in minutes and let AI transform your job search experience.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative">
                                <div className="text-8xl font-bold text-gray-100 absolute -top-4 -left-2">
                                    {step.number}
                                </div>
                                <div className="relative pt-16 pb-8 px-6">
                                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                                        {index + 1}
                                    </div>
                                    <h3 className="text-xl font-bold text-black mb-3">{step.title}</h3>
                                    <p className="text-gray-600">{step.description}</p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className="hidden lg:block absolute top-24 right-0 w-full h-0.5 bg-gray-200">
                                        <div className="absolute right-0 -top-1.5 w-4 h-4 bg-black rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hackathon Challenge Section */}
            <section className="py-24 px-4 bg-black text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                Fully Autonomous AI Agent
                            </h2>
                            <div className="space-y-4">
                                {[
                                    "Creates reusable application artifact pack",
                                    "Searches and ranks jobs intelligently",
                                    "Auto-personalizes and submits applications",
                                    "Safe-by-design with explicit constraints",
                                    "Never invents credentials"
                                ].map((item, index) => (
                                    <div key={index} className="flex items-center space-x-3">
                                        <CheckCircle className="text-green-400 flex-shrink-0" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                            <Award className="text-green-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Artifact Pack</div>
                                            <div className="text-gray-400 text-sm">Profile, Bullets, Proofs</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                                            <Target className="text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Job Ranking</div>
                                            <div className="text-gray-400 text-sm">Skill overlap, Experience fit</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                                            <Rocket className="text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Auto-Apply</div>
                                            <div className="text-gray-400 text-sm">Personalized submissions</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                            <Users className="text-yellow-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Application Tracker</div>
                                            <div className="text-gray-400 text-sm">Status, retries, receipts</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-4 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
                        Ready to Transform Your Job Search?
                    </h2>
                    <p className="text-xl text-gray-600 mb-10">
                        Join thousands of students who are landing their dream jobs faster with AI-powered automation.
                    </p>
                    {user ? (
                        <Link
                            to="/profile"
                            className="group inline-flex items-center space-x-3 px-10 py-5 bg-black text-white rounded-full text-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-2xl hover:shadow-black/20 transform hover:-translate-y-1"
                        >
                            <span>Complete Your Profile</span>
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="group inline-flex items-center space-x-3 px-10 py-5 bg-black text-white rounded-full text-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-2xl hover:shadow-black/20 transform hover:-translate-y-1"
                        >
                            <span>Get Started Free</span>
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black text-white py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center space-x-2 mb-8 md:mb-0">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                                <span className="text-black font-bold text-xl">J</span>
                            </div>
                            <span className="text-2xl font-bold">Jobfy</span>
                        </div>
                        <div className="text-gray-400 text-center md:text-right">
                            <p>© 2026 Jobfy. All rights reserved.</p>
                            <p className="text-sm mt-2">Built for the AI Hackathon Challenge</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
