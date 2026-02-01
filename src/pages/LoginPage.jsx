import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Chrome, Lock, Shield, Sparkles, ArrowRight } from 'lucide-react';

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await login();
            navigate('/profile');
        } catch (error) {
            console.error("Login error:", error);
            setError('Failed to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 pt-16">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-20 w-72 h-72 bg-black/5 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-black/5 rounded-full blur-3xl animate-float delay-200"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-black text-white px-8 py-10 text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-black font-bold text-3xl">J</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Welcome to Jobfy</h1>
                        <p className="text-gray-300">Your AI-powered career companion</p>
                    </div>

                    {/* Body */}
                    <div className="p-8">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fadeIn">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <Chrome size={22} />
                                    <span>Continue with Google</span>
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                                </>
                            )}
                        </button>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center space-x-3 text-gray-600">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Shield size={18} className="text-gray-700" />
                                </div>
                                <span className="text-sm">Your data is encrypted and secure</span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-600">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Lock size={18} className="text-gray-700" />
                                </div>
                                <span className="text-sm">We never share your information</span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-600">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Sparkles size={18} className="text-gray-700" />
                                </div>
                                <span className="text-sm">AI-powered job matching</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            By continuing, you agree to our{' '}
                            <a href="#" className="text-black font-medium hover:underline">Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" className="text-black font-medium hover:underline">Privacy Policy</a>
                        </p>
                    </div>
                </div>

                {/* Features below card */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    {[
                        { value: '10K+', label: 'Jobs' },
                        { value: '500+', label: 'Companies' },
                        { value: '95%', label: 'Success' }
                    ].map((stat, index) => (
                        <div key={index} className="p-4 bg-white/50 backdrop-blur rounded-xl border border-gray-200">
                            <div className="text-xl font-bold text-black">{stat.value}</div>
                            <div className="text-xs text-gray-500">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
