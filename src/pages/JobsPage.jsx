import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { addAppliedJob, saveRankingResults } from '../config/firebase';
import {
    fetchBackendJobs,
    applyToJob,
    prepareApplicationPayload,
    checkBackendHealth,
    checkAgentHealth,
    rankJobsWithAI,
    applyToJobQueue
} from '../services/jobAgentApi';
import {
    Search,
    MapPin,
    Briefcase,
    Clock,
    DollarSign,
    Filter,
    Sparkles,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Heart,
    Building2,
    Zap,
    CheckCircle,
    Loader,
    X,
    Globe,
    Target,
    Bot,
    Play,
    Pause,
    RefreshCw,
    AlertCircle,
    Cloud,
    Wifi,
    Server
} from 'lucide-react';

const JOBS_PER_PAGE = 8;

const JobsPage = () => {
    const { user, userProfile, refreshProfile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterRemote, setFilterRemote] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [savedJobs, setSavedJobs] = useState([]);
    const [applying, setApplying] = useState({});
    const [visibleJobs, setVisibleJobs] = useState(JOBS_PER_PAGE);
    const [loadingMore, setLoadingMore] = useState(false);

    // Backend integration state
    const [backendJobs, setBackendJobs] = useState([]);
    const [backendConnected, setBackendConnected] = useState(false);
    const [loadingBackend, setLoadingBackend] = useState(true);

    // Combined jobs from backend only (local jobs removed)
    const allJobs = backendJobs;

    // AI Pickup state
    const [aiMode, setAiMode] = useState(false);
    const [aiProgress, setAiProgress] = useState({
        isRunning: false,
        totalJobs: 0,
        processedJobs: 0,
        appliedJobs: [],
        skippedJobs: [],
        currentJob: null,
        status: 'idle', // idle, searching, analyzing, applying, completed, paused
        useBackendAgent: false // flag to use Krishna's agent
    });

    // Ref to track running state (fixes stale closure in async loop)
    const aiRunningRef = useRef(false);

    // Fetch backend jobs on mount
    useEffect(() => {
        const initializeBackend = async () => {
            setLoadingBackend(true);
            try {
                // Check if backend is available
                const isHealthy = await checkBackendHealth();
                setBackendConnected(isHealthy);

                if (isHealthy) {
                    // Fetch jobs from backend
                    const jobs = await fetchBackendJobs();
                    console.log('Backend jobs:', jobs);
                    setBackendJobs(jobs);
                    console.log(`✅ Connected to backend. Loaded ${jobs.length} jobs.`);
                } else {
                    console.log('⚠️ Backend not available, no jobs to display.');
                }
            } catch (error) {
                console.error('Backend initialization error:', error);
                setBackendConnected(false);
            } finally {
                setLoadingBackend(false);
            }
        };

        initializeBackend();
    }, []);

    // Get applied job IDs from user profile
    const appliedJobIds = userProfile?.appliedJobs?.map(job => job.id) || [];

    // Filter jobs
    const filteredJobs = allJobs.filter(job => {
        const title = job.title || '';
        const company = job.company || '';
        const skills = job.skills || [];
        const type = job.type || '';

        const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            skills.some(skill => (skill || '').toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType = filterType === 'all' || type.toLowerCase() === filterType.toLowerCase();

        const matchesRemote = filterRemote === 'all' ||
            (filterRemote === 'remote' && job.remote) ||
            (filterRemote === 'onsite' && !job.remote);

        return matchesSearch && matchesType && matchesRemote;
    });


    // Get displayed jobs (paginated)
    const displayedJobs = filteredJobs.slice(0, visibleJobs);
    const hasMoreJobs = visibleJobs < filteredJobs.length;

    // Reset visible jobs when filters change
    useEffect(() => {
        setVisibleJobs(JOBS_PER_PAGE);
    }, [searchTerm, filterType, filterRemote]);

    // Load more jobs
    const handleViewMore = async () => {
        setLoadingMore(true);
        // Simulate loading delay for smooth UX
        await new Promise(resolve => setTimeout(resolve, 500));
        setVisibleJobs(prev => prev + JOBS_PER_PAGE);
        setLoadingMore(false);
    };

    // Toggle save job
    const toggleSaveJob = (jobId) => {
        setSavedJobs(prev =>
            prev.includes(jobId)
                ? prev.filter(id => id !== jobId)
                : [...prev, jobId]
        );
    };


    // Apply to a single job
    const handleApply = async (job) => {
        if (!user) {
            alert('Please login to apply for jobs');
            return;
        }

        setApplying(prev => ({ ...prev, [job.id]: true }));

        try {
            // Prepare application payload for backend
            const { resume, bullets, proofs } = prepareApplicationPayload(userProfile);

            // If this is a backend job OR backend is connected, submit to backend API
            if (job.source === 'backend' || backendConnected) {
                const backendResult = await applyToJob({
                    jobId: job.jobId || job.id.toString(),
                    studentName: userProfile?.fullName || user.displayName || 'Anonymous',
                    resume: resume,
                    bullets: bullets,
                    proofs: proofs
                });

                if (backendResult.success) {
                    console.log('✅ Applied via backend:', backendResult);
                } else {
                    console.warn('⚠️ Backend apply failed:', backendResult.error);
                }
            }

            // Also save to Firebase for local tracking
            await addAppliedJob(user.uid, {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                type: job.type,
                source: job.source || 'local',
                appliedViaBackend: backendConnected
            });

            await refreshProfile();

        } catch (error) {
            console.error('Apply error:', error);
            alert('Failed to apply. Please try again.');
        } finally {
            setApplying(prev => ({ ...prev, [job.id]: false }));
        }
    };

    // AI Pickup - Start autonomous job application using Agent API
    const startAIPickup = async () => {
        if (!user || !userProfile) {
            alert('Please complete your profile before using AI Pickup');
            return;
        }

        if (filteredJobs.length === 0) {
            alert('No jobs available to apply to');
            return;
        }

        // Set the ref to true (this will be checked in the loop)
        aiRunningRef.current = true;

        setAiMode(true);
        setAiProgress({
            isRunning: true,
            totalJobs: 0,
            processedJobs: 0,
            appliedJobs: [],
            skippedJobs: [],
            currentJob: null,
            status: 'ranking',
            useBackendAgent: backendConnected,
            rankedJobs: []
        });

        try {
            // Step 1: Get ranked jobs from Agent API
            setAiProgress(prev => ({ ...prev, status: 'ranking' }));

            const rankingResult = await rankJobsWithAI(userProfile, userProfile?.preferences?.jobTypes?.[0] || '');

            if (rankingResult.error || !rankingResult.ranked_jobs?.length) {
                console.warn('Ranking failed or no jobs, using local ranking');
                // Fallback to local ranking
                const localRanked = filteredJobs.map(job => ({
                    job,
                    score: calculateMatchScore(job, userProfile) / 100,
                    match_percentage: calculateMatchScore(job, userProfile),
                    should_apply: calculateMatchScore(job, userProfile) >= 70,
                    explanation: {
                        overall_score: calculateMatchScore(job, userProfile),
                        skill_overlap: 0,
                        matching_skills: [],
                        reasoning: 'Ranked locally'
                    }
                })).sort((a, b) => b.score - a.score);

                rankingResult.ranked_jobs = localRanked;
            }

            // Save ranking results to Firebase
            if (user) {
                await saveRankingResults(user.uid, rankingResult);
            }

            const rankedJobs = rankingResult.ranked_jobs;

            setAiProgress(prev => ({
                ...prev,
                totalJobs: rankedJobs.length,
                status: 'analyzing',
                rankedJobs: rankedJobs
            }));

            // Prepare application payload once for all jobs
            const { resume, bullets, proofs } = prepareApplicationPayload(userProfile);

            // Step 2: Process ranked jobs
            for (let i = 0; i < rankedJobs.length && aiRunningRef.current; i++) {
                const rankedItem = rankedJobs[i];
                const job = rankedItem.job;
                const matchScore = rankedItem.match_percentage || Math.round(rankedItem.score * 100);
                const explanation = rankedItem.explanation;

                // Skip already applied jobs
                if (appliedJobIds.includes(job.id)) {
                    setAiProgress(prev => ({
                        ...prev,
                        processedJobs: prev.processedJobs + 1,
                        skippedJobs: [...prev.skippedJobs, { ...job, matchScore, reason: 'Already applied' }]
                    }));
                    continue;
                }

                setAiProgress(prev => ({
                    ...prev,
                    currentJob: { ...job, matchScore, explanation },
                    status: 'analyzing'
                }));

                // Brief delay for UX
                await new Promise(resolve => setTimeout(resolve, 800));

                // Check if we should apply based on agent recommendation
                if (rankedItem.should_apply || matchScore >= 60) {
                    setAiProgress(prev => ({
                        ...prev,
                        status: 'applying'
                    }));

                    try {
                        // Apply via backend if connected
                        if (backendConnected) {
                            const backendResult = await applyToJob({
                                jobId: job.jobId || job.id.toString(),
                                studentName: userProfile?.fullName || user.displayName || 'Anonymous',
                                resume: resume,
                                bullets: bullets,
                                proofs: proofs
                            });

                            if (backendResult.success) {
                                console.log('✅ AI Applied via backend:', job.title, backendResult);
                            } else {
                                console.warn('⚠️ Backend apply failed for', job.title, ':', backendResult.error);
                            }
                        }

                        // Save to Firebase for local tracking with full explanation
                        await addAppliedJob(user.uid, {
                            id: job.id,
                            jobId: job.jobId,
                            title: job.title,
                            company: job.company,
                            location: job.location,
                            type: job.type,
                            matchScore,
                            explanation: explanation,
                            source: job.source || 'agent',
                            appliedViaBackend: backendConnected,
                            appliedViaAI: true
                        });

                        setAiProgress(prev => ({
                            ...prev,
                            processedJobs: prev.processedJobs + 1,
                            appliedJobs: [...prev.appliedJobs, { ...job, matchScore, explanation }]
                        }));
                    } catch (error) {
                        console.error('AI Apply error:', error);
                        setAiProgress(prev => ({
                            ...prev,
                            processedJobs: prev.processedJobs + 1,
                            skippedJobs: [...prev.skippedJobs, { ...job, matchScore, reason: 'Application failed' }]
                        }));
                    }
                } else {
                    setAiProgress(prev => ({
                        ...prev,
                        processedJobs: prev.processedJobs + 1,
                        skippedJobs: [...prev.skippedJobs, {
                            ...job,
                            matchScore,
                            reason: explanation?.reasoning || `Low match (${matchScore}%)`
                        }]
                    }));
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('AI Pickup error:', error);
        }

        // Mark as complete
        aiRunningRef.current = false;
        setAiProgress(prev => ({
            ...prev,
            isRunning: false,
            status: 'completed',
            currentJob: null
        }));

        await refreshProfile();
    };

    // Placeholder match score calculation (to be replaced with LLM)
    const calculateMatchScore = (job, profile) => {
        if (!profile?.skills?.length) return Math.floor(Math.random() * 40) + 30;

        const skills = Array.isArray(job.skills) ? job.skills : [];
        if (skills.length === 0) return Math.floor(Math.random() * 40) + 30;

        const jobSkills = skills.map(s => (s || '').toLowerCase());
        const userSkills = profile.skills.map(s => (s || '').toLowerCase());

        const matchingSkills = jobSkills.filter(skill =>
            userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
        );

        const baseScore = (matchingSkills.length / jobSkills.length) * 100;
        const randomFactor = Math.random() * 20 - 10; // Add some variance

        return Math.min(100, Math.max(0, Math.floor(baseScore + randomFactor)));
    };

    // Stop AI Pickup
    const stopAIPickup = () => {
        aiRunningRef.current = false;
        setAiProgress(prev => ({
            ...prev,
            isRunning: false,
            status: 'paused'
        }));
    };

    // Reset AI Pickup
    const resetAIPickup = () => {
        aiRunningRef.current = false;
        setAiMode(false);
        setAiProgress({
            isRunning: false,
            totalJobs: 0,
            processedJobs: 0,
            appliedJobs: [],
            skippedJobs: [],
            currentJob: null,
            status: 'idle'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header with Backend Status */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-black mb-2">Find Your Dream Job</h1>
                            <p className="text-gray-600">Discover {allJobs.length}+ opportunities from top companies</p>
                        </div>

                        {/* Backend Status & Job Source Filter */}
                        <div className="mt-4 md:mt-0 flex items-center space-x-4">
                            {/* Backend Connection Status */}
                            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${loadingBackend
                                ? 'bg-yellow-100 text-yellow-800'
                                : backendConnected
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${loadingBackend
                                    ? 'bg-yellow-500 animate-pulse'
                                    : backendConnected
                                        ? 'bg-green-500'
                                        : 'bg-gray-400'
                                    }`} />
                                <span>
                                    {loadingBackend
                                        ? 'Connecting...'
                                        : backendConnected
                                            ? 'Agent Connected'
                                            : 'No Jobs Available'}
                                </span>
                            </div>

                            {/* Job Source Filter - Removed, using backend only */}
                        </div>
                    </div>
                </div>

                {/* AI Pickup Banner */}
                <div className="mb-8 p-6 bg-gradient-to-r from-black to-gray-800 rounded-2xl text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center space-x-4 mb-4 md:mb-0">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center relative">
                                <Bot size={28} />
                                {backendConnected && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                        <Wifi size={10} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold flex items-center space-x-2">
                                    <span>AI Pickup</span>
                                    {backendConnected && (
                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                            Agent Enabled
                                        </span>
                                    )}
                                </h2>
                                <p className="text-gray-300">
                                    {backendConnected
                                        ? 'AI will analyze jobs and apply via Krishna\'s Agent backend'
                                        : 'Let AI analyze jobs and auto-apply based on your profile'}
                                </p>
                            </div>
                        </div>

                        {!aiMode ? (
                            <button
                                onClick={startAIPickup}
                                className="flex items-center space-x-2 px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300"
                            >
                                <Sparkles size={20} />
                                <span>Start AI Pickup</span>
                            </button>
                        ) : (
                            <div className="flex items-center space-x-3">
                                {aiProgress.isRunning ? (
                                    <button
                                        onClick={stopAIPickup}
                                        className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all"
                                    >
                                        <Pause size={20} />
                                        <span>Stop</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={startAIPickup}
                                        className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all"
                                    >
                                        <Play size={20} />
                                        <span>Resume</span>
                                    </button>
                                )}
                                <button
                                    onClick={resetAIPickup}
                                    className="flex items-center space-x-2 px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
                                >
                                    <RefreshCw size={20} />
                                    <span>Reset</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* AI Progress */}
                    {aiMode && (
                        <div className="mt-6 pt-6 border-t border-white/20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="bg-white/10 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold">{aiProgress.totalJobs}</div>
                                    <div className="text-sm text-gray-300">Total Jobs</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold">{aiProgress.processedJobs}</div>
                                    <div className="text-sm text-gray-300">Processed</div>
                                </div>
                                <div className="bg-green-500/20 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-green-400">{aiProgress.appliedJobs.length}</div>
                                    <div className="text-sm text-green-300">Applied</div>
                                </div>
                                <div className="bg-yellow-500/20 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-yellow-400">{aiProgress.skippedJobs.length}</div>
                                    <div className="text-sm text-yellow-300">Skipped</div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="relative">
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white transition-all duration-300"
                                        style={{ width: `${(aiProgress.processedJobs / aiProgress.totalJobs) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Current status */}
                            {aiProgress.status === 'ranking' && (
                                <div className="mt-4 flex items-center space-x-3 text-sm">
                                    <Loader className="animate-spin" size={16} />
                                    <span>🎯 AI is ranking jobs based on your profile...</span>
                                </div>
                            )}

                            {aiProgress.currentJob && (
                                <div className="mt-4 flex items-center space-x-3 text-sm">
                                    <Loader className="animate-spin" size={16} />
                                    <span>
                                        {aiProgress.status === 'analyzing' && `Analyzing: ${aiProgress.currentJob.title} at ${aiProgress.currentJob.company}`}
                                        {aiProgress.status === 'applying' && `Applying to: ${aiProgress.currentJob.title} at ${aiProgress.currentJob.company}`}
                                    </span>
                                    {aiProgress.currentJob.matchScore && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${aiProgress.currentJob.matchScore >= 80 ? 'bg-green-500/20 text-green-400' :
                                                aiProgress.currentJob.matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {aiProgress.currentJob.matchScore}% Match
                                        </span>
                                    )}
                                </div>
                            )}

                            {aiProgress.status === 'completed' && (
                                <div className="mt-4 flex items-center space-x-2 text-green-400">
                                    <CheckCircle size={20} />
                                    <span>AI Pickup completed! Applied to {aiProgress.appliedJobs.length} jobs.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

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
                                placeholder="Search jobs, companies, or skills..."
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                            />
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                        >
                            <Filter size={20} />
                            <span>Filters</span>
                            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 grid md:grid-cols-3 gap-4 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                >
                                    <option value="all">All Types</option>
                                    <option value="full-time">Full-time</option>
                                    <option value="part-time">Part-time</option>
                                    <option value="internship">Internship</option>
                                    <option value="contract">Contract</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                                <select
                                    value={filterRemote}
                                    onChange={(e) => setFilterRemote(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                >
                                    <option value="all">All Locations</option>
                                    <option value="remote">Remote</option>
                                    <option value="onsite">On-site</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => { setFilterType('all'); setFilterRemote('all'); setSearchTerm(''); }}
                                    className="w-full px-4 py-3 text-gray-600 hover:text-black transition-all"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-gray-600">
                        Showing <span className="font-semibold text-black">{displayedJobs.length}</span> of <span className="font-semibold text-black">{filteredJobs.length}</span> jobs
                    </p>
                </div>

                {/* Jobs Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {displayedJobs.map((job) => {
                        const isApplied = appliedJobIds.includes(job.id);
                        const isSaved = savedJobs.includes(job.id);
                        const isApplying = applying[job.id];

                        return (
                            <div
                                key={job.id}
                                className={`bg-white rounded-2xl shadow-lg border transition-all duration-300 card-hover ${selectedJob?.id === job.id ? 'border-black ring-2 ring-black/10' : 'border-gray-100'
                                    }`}
                            >
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                                                {job.logo ? (
                                                    <img src={job.logo} alt={job.company} className="w-10 h-10 object-contain" />
                                                ) : (
                                                    <Building2 size={24} className="text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-black hover:underline cursor-pointer" onClick={() => setSelectedJob(job)}>
                                                    {job.title}
                                                </h3>
                                                <p className="text-gray-600">{job.company}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleSaveJob(job.id)}
                                            className={`p-2 rounded-full transition-all ${isSaved ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400 hover:text-red-500'
                                                }`}
                                        >
                                            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>

                                    {/* Details */}
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                            <MapPin size={14} />
                                            <span>{job.location}</span>
                                        </span>
                                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                            <Briefcase size={14} />
                                            <span>{job.type}</span>
                                        </span>
                                        {job.remote && (
                                            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                                <Globe size={14} />
                                                <span>Remote</span>
                                            </span>
                                        )}
                                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                            <DollarSign size={14} />
                                            <span>{job.salary}</span>
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

                                    {/* Skills */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {job.skills.slice(0, 4).map((skill, index) => (
                                            <span key={index} className="px-3 py-1 bg-black/5 text-black rounded-full text-xs font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                        {job.skills.length > 4 && (
                                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                                                +{job.skills.length - 4} more
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                                            <Clock size={14} />
                                            <span>{job.posted}</span>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setSelectedJob(job)}
                                                className="px-4 py-2 text-black font-medium hover:bg-gray-100 rounded-lg transition-all"
                                            >
                                                Details
                                            </button>

                                            {isApplied ? (
                                                <span className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                                                    <CheckCircle size={16} />
                                                    <span>Applied</span>
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleApply(job)}
                                                    disabled={isApplying}
                                                    className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
                                                >
                                                    {isApplying ? (
                                                        <Loader className="animate-spin" size={16} />
                                                    ) : (
                                                        <Zap size={16} />
                                                    )}
                                                    <span>{isApplying ? 'Applying...' : 'Quick Apply'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* View More Button */}
                {hasMoreJobs && (
                    <div className="flex justify-center mt-10">
                        <button
                            onClick={handleViewMore}
                            disabled={loadingMore}
                            className="group flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-black to-gray-800 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    <span>Loading...</span>
                                </>
                            ) : (
                                <>
                                    <span>View More Jobs</span>
                                    <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                                        <ChevronRight size={18} />
                                    </div>
                                    <span className="text-sm text-gray-300">({filteredJobs.length - visibleJobs} more)</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {filteredJobs.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No jobs found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                )}

                {/* Job Detail Modal */}
                {selectedJob && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                                            {selectedJob.logo ? (
                                                <img src={selectedJob.logo} alt={selectedJob.company} className="w-12 h-12 object-contain" />
                                            ) : (
                                                <Building2 size={28} className="text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-black">{selectedJob.title}</h2>
                                            <p className="text-gray-600 text-lg">{selectedJob.company}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedJob(null)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Meta info */}
                                <div className="flex flex-wrap gap-3 mb-6">
                                    <span className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                                        <MapPin size={16} />
                                        <span>{selectedJob.location}</span>
                                    </span>
                                    <span className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                                        <Briefcase size={16} />
                                        <span>{selectedJob.type}</span>
                                    </span>
                                    <span className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                                        <DollarSign size={16} />
                                        <span>{selectedJob.salary}</span>
                                    </span>
                                    {selectedJob.remote && (
                                        <span className="inline-flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                                            <Globe size={16} />
                                            <span>Remote Available</span>
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-black mb-3">About the Role</h3>
                                    <p className="text-gray-600 leading-relaxed">{selectedJob.description}</p>
                                </div>

                                {/* Requirements */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-black mb-3">Requirements</h3>
                                    <ul className="space-y-2">
                                        {selectedJob.requirements.map((req, index) => (
                                            <li key={index} className="flex items-start space-x-3 text-gray-600">
                                                <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                                                <span>{req}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Skills */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-black mb-3">Required Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.skills.map((skill, index) => (
                                            <span key={index} className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Deadline */}
                                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center space-x-3">
                                    <AlertCircle className="text-yellow-600" size={20} />
                                    <span className="text-yellow-800">
                                        Application deadline: <strong>{new Date(selectedJob.deadline).toLocaleDateString()}</strong>
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-4">
                                    {appliedJobIds.includes(selectedJob.id) ? (
                                        <button
                                            disabled
                                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-green-100 text-green-700 rounded-xl font-semibold"
                                        >
                                            <CheckCircle size={20} />
                                            <span>Already Applied</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                handleApply(selectedJob);
                                                setSelectedJob(null);
                                            }}
                                            className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
                                        >
                                            <Zap size={20} />
                                            <span>Apply Now</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleSaveJob(selectedJob.id)}
                                        className={`p-4 rounded-xl transition-all ${savedJobs.includes(selectedJob.id)
                                            ? 'bg-red-100 text-red-500'
                                            : 'bg-gray-100 text-gray-500 hover:text-red-500'
                                            }`}
                                    >
                                        <Heart size={20} fill={savedJobs.includes(selectedJob.id) ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobsPage;
