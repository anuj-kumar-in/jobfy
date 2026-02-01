import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut, Briefcase, FileText, Home } from 'lucide-react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 group">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                            <span className="text-white font-bold text-xl">J</span>
                        </div>
                        <span className="text-2xl font-bold text-black tracking-tight">Jobfy</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-300 font-medium">
                            <Home size={18} />
                            <span>Home</span>
                        </Link>
                        {user && (
                            <>
                                <Link to="/jobs" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-300 font-medium">
                                    <Briefcase size={18} />
                                    <span>Jobs</span>
                                </Link>
                                <Link to="/profile" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-300 font-medium">
                                    <FileText size={18} />
                                    <span>My Profile</span>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3 px-4 py-2 bg-gray-100 rounded-full">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <User size={20} className="text-gray-600" />
                                    )}
                                    <span className="text-sm font-medium text-gray-700">{user.displayName || user.email}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-300 font-medium"
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="px-6 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                Get Started
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200 animate-fadeIn">
                        <div className="flex flex-col space-y-4">
                            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors px-4 py-2">
                                <Home size={18} />
                                <span>Home</span>
                            </Link>
                            {user && (
                                <>
                                    <Link to="/jobs" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors px-4 py-2">
                                        <Briefcase size={18} />
                                        <span>Jobs</span>
                                    </Link>
                                    <Link to="/profile" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors px-4 py-2">
                                        <FileText size={18} />
                                        <span>My Profile</span>
                                    </Link>
                                </>
                            )}
                            <div className="border-t border-gray-200 pt-4 px-4">
                                {user ? (
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-black text-white rounded-full"
                                    >
                                        <LogOut size={18} />
                                        <span>Logout</span>
                                    </button>
                                ) : (
                                    <Link
                                        to="/login"
                                        className="block w-full text-center px-4 py-2 bg-black text-white rounded-full"
                                    >
                                        Get Started
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
