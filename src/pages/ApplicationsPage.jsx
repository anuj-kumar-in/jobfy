import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApplications, getApplicationStats, updateApplicationStatus } from '../config/firebase';
import {
    Briefcase,
    Calendar,
    MapPin,
    Building2,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    TrendingUp,
    Filter,
    Search,
    ChevronDown,
    ChevronRight,
    Star,
    Target,
    BarChart3,
    RefreshCw,
    ExternalLink,
    FileText,
    Sparkles,
    Award,
    Loader
} from 'lucide-react';

const STATUS_CONFIG = {
    applied: { label: 'Applied', color: 'bg-blue-100 text-blue-800', icon: Clock },
    viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-800', icon: AlertCircle },
    interviewing: { label: 'Interviewing', color: 'bg-yellow-100 text-yellow-800', icon: Target },
    offered: { label: 'Offered', color: 'bg-green-100 text-green-800', icon: Award },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
    withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

const ApplicationsPage = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState({});

    // Load applications
    useEffect(() => {
        if (user) {
            loadApplications();
        }
    }, [user]);

    const loadApplications = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const [apps, appStats] = await Promise.all([
                getApplications(user.uid),
                getApplicationStats(user.uid)
            ]);
            setApplications(apps);
            setStats(appStats);
        } catch (error) {
            console.error('Error loading applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadApplications();
        setRefreshing(false);
    };

    const handleStatusUpdate = async (appId, newStatus) => {
        if (!user) return;

        setUpdatingStatus(prev => ({ ...prev, [appId]: true }));

        try {
            await updateApplicationStatus(user.uid, appId, newStatus);
            await loadApplications();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [appId]: false }));
        }
    };

    // Filter applications
    const filteredApplications = applications.filter(app => {
        const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
        const matchesSearch = !searchTerm ||
            (app.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.company || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getMatchScoreColor = (score) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        if (score >= 40) return 'text-orange-600 bg-orange-100';
        return 'text-red-600 bg-red-100';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
                <div className="text-center">
                    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Briefcase className="text-white" size={28} />
                    </div>
                    <p className="text-gray-600">Loading applications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-black mb-2">Application Tracker</h1>
                            <p className="text-gray-600">Track and manage all your job applications</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="mt-4 md:mt-0 flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center">
                                    <Briefcase size={20} className="text-black" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-black">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total Applications</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Clock size={20} className="text-blue-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-blue-600">{stats.byStatus?.applied || 0}</div>
                            <div className="text-sm text-gray-600">Pending</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                                    <Target size={20} className="text-yellow-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-yellow-600">{stats.byStatus?.interviewing || 0}</div>
                            <div className="text-sm text-gray-600">Interviewing</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle size={20} className="text-green-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-green-600">{stats.byStatus?.offered || 0}</div>
                            <div className="text-sm text-gray-600">Offers</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <TrendingUp size={20} className="text-purple-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-purple-600">{stats.thisWeek}</div>
                            <div className="text-sm text-gray-600">This Week</div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <BarChart3 size={20} className="text-orange-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-orange-600">{stats.avgMatchScore}%</div>
                            <div className="text-sm text-gray-600">Avg Match</div>
                        </div>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by job title or company..."
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                        >
                            <option value="all">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Applications List */}
                <div className="space-y-4">
                    {filteredApplications.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-16 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Briefcase size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No applications found</h3>
                            <p className="text-gray-500 mb-6">
                                {applications.length === 0
                                    ? "Start applying to jobs to track them here"
                                    : "No applications match your filters"
                                }
                            </p>
                            <a
                                href="/jobs"
                                className="inline-flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
                            >
                                <Sparkles size={20} />
                                <span>Find Jobs</span>
                            </a>
                        </div>
                    ) : (
                        filteredApplications.map((app, index) => {
                            const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
                            const StatusIcon = statusConfig.icon;
                            const isExpanded = selectedApp === app.id || selectedApp === app.jobId;

                            return (
                                <div
                                    key={app.id || app.jobId || index}
                                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl"
                                >
                                    {/* Main Row */}
                                    <div
                                        className="p-6 cursor-pointer"
                                        onClick={() => setSelectedApp(isExpanded ? null : (app.id || app.jobId))}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-4">
                                                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    {app.logo ? (
                                                        <img src={app.logo} alt={app.company} className="w-10 h-10 object-contain" />
                                                    ) : (
                                                        <Building2 size={24} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-black">{app.title}</h3>
                                                    <p className="text-gray-600">{app.company}</p>
                                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                                        {app.location && (
                                                            <span className="inline-flex items-center space-x-1 text-sm text-gray-500">
                                                                <MapPin size={14} />
                                                                <span>{app.location}</span>
                                                            </span>
                                                        )}
                                                        {app.type && (
                                                            <span className="inline-flex items-center space-x-1 text-sm text-gray-500">
                                                                <Briefcase size={14} />
                                                                <span>{app.type}</span>
                                                            </span>
                                                        )}
                                                        {app.appliedAt && (
                                                            <span className="inline-flex items-center space-x-1 text-sm text-gray-500">
                                                                <Calendar size={14} />
                                                                <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                {/* Match Score */}
                                                {app.matchScore && (
                                                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchScoreColor(app.matchScore)}`}>
                                                        {app.matchScore}% Match
                                                    </div>
                                                )}

                                                {/* Status Badge */}
                                                <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${statusConfig.color}`}>
                                                    <StatusIcon size={16} />
                                                    <span>{statusConfig.label}</span>
                                                </span>

                                                {/* Expand Icon */}
                                                <ChevronRight
                                                    size={20}
                                                    className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 p-6 bg-gray-50 animate-fadeIn">
                                            <div className="grid md:grid-cols-2 gap-6">
                                                {/* Match Explanation */}
                                                {app.explanation && (
                                                    <div>
                                                        <h4 className="font-semibold text-black mb-3 flex items-center space-x-2">
                                                            <Sparkles size={18} />
                                                            <span>AI Match Analysis</span>
                                                        </h4>
                                                        <div className="bg-white rounded-xl p-4 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-600">Overall Match</span>
                                                                <span className={`font-bold ${app.explanation.overall_score >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                                    {app.explanation.overall_score}%
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-600">Skill Overlap</span>
                                                                <span className="font-medium">{app.explanation.skill_overlap}%</span>
                                                            </div>
                                                            {app.explanation.matching_skills?.length > 0 && (
                                                                <div>
                                                                    <span className="text-gray-600 block mb-2">Matching Skills:</span>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {app.explanation.matching_skills.map((skill, i) => (
                                                                            <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                                                                {skill}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {app.explanation.reasoning && (
                                                                <p className="text-sm text-gray-600 italic">
                                                                    "{app.explanation.reasoning}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Update Status */}
                                                <div>
                                                    <h4 className="font-semibold text-black mb-3 flex items-center space-x-2">
                                                        <FileText size={18} />
                                                        <span>Update Status</span>
                                                    </h4>
                                                    <div className="bg-white rounded-xl p-4">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                                                                const Icon = config.icon;
                                                                const isActive = app.status === key;
                                                                const isUpdating = updatingStatus[app.id || app.jobId];

                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleStatusUpdate(app.id || app.jobId, key);
                                                                        }}
                                                                        disabled={isActive || isUpdating}
                                                                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                                                                ? config.color + ' ring-2 ring-offset-1 ring-gray-400'
                                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                            } disabled:opacity-50`}
                                                                    >
                                                                        {isUpdating ? (
                                                                            <Loader size={14} className="animate-spin" />
                                                                        ) : (
                                                                            <Icon size={14} />
                                                                        )}
                                                                        <span>{config.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status History */}
                                            {app.statusHistory?.length > 0 && (
                                                <div className="mt-6">
                                                    <h4 className="font-semibold text-black mb-3">Status History</h4>
                                                    <div className="bg-white rounded-xl p-4">
                                                        <div className="space-y-3">
                                                            {app.statusHistory.map((history, i) => (
                                                                <div key={i} className="flex items-center space-x-3 text-sm">
                                                                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[history.status]?.color?.split(' ')[0] || 'bg-gray-400'}`} />
                                                                    <span className="font-medium">{STATUS_CONFIG[history.status]?.label || history.status}</span>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span className="text-gray-500">{new Date(history.date).toLocaleString()}</span>
                                                                    {history.notes && (
                                                                        <span className="text-gray-600">- {history.notes}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Applied Via */}
                                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                                                <div className="flex items-center space-x-4">
                                                    {app.appliedViaAI && (
                                                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                                            <Sparkles size={12} />
                                                            <span>AI Applied</span>
                                                        </span>
                                                    )}
                                                    {app.appliedViaBackend && (
                                                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                                            <span>Agent Backend</span>
                                                        </span>
                                                    )}
                                                    <span>Source: {app.source || 'Manual'}</span>
                                                </div>
                                                {app.lastUpdated && (
                                                    <span>Last updated: {new Date(app.lastUpdated).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApplicationsPage;
