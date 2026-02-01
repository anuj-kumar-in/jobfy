import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveUserProfile } from '../config/firebase';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    GraduationCap,
    Code,
    Link as LinkIcon,
    FileText,
    Save,
    Sparkles,
    Plus,
    X,
    Upload,
    CheckCircle,
    Loader,
    Github,
    Linkedin,
    Globe,
    Calendar,
    Target,
    Settings,
    Award,
    FileUp
} from 'lucide-react';

// Set PDF.js worker from local node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ProfilePage = () => {
    const { user, userProfile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [resumeText, setResumeText] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState({
        // Personal Info
        fullName: '',
        email: '',
        phone: '',
        location: '',
        headline: '',
        summary: '',

        // Links
        linkedin: '',
        github: '',
        portfolio: '',

        // Education
        education: [],

        // Experience
        experience: [],

        // Skills
        skills: [],

        // Projects
        projects: [],

        // Preferences
        preferences: {
            jobTypes: [],
            locations: [],
            remotePreference: 'hybrid',
            salaryExpectation: '',
            availableFrom: '',
            visaRequired: false
        },

        // Applied Jobs
        appliedJobs: []
    });

    // Load existing profile
    useEffect(() => {
        if (userProfile) {
            setProfile(prev => ({
                ...prev,
                ...userProfile,
                email: user?.email || userProfile.email || '',
                fullName: userProfile.fullName || user?.displayName || ''
            }));
        } else if (user) {
            setProfile(prev => ({
                ...prev,
                email: user.email || '',
                fullName: user.displayName || ''
            }));
        }
    }, [userProfile, user]);

    const handleInputChange = (field, value) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePreferenceChange = (field, value) => {
        setProfile(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [field]: value
            }
        }));
    };

    // Add new education entry
    const addEducation = () => {
        setProfile(prev => ({
            ...prev,
            education: [...prev.education, {
                id: Date.now(),
                institution: '',
                degree: '',
                field: '',
                startDate: '',
                endDate: '',
                gpa: ''
            }]
        }));
    };

    const updateEducation = (id, field, value) => {
        setProfile(prev => ({
            ...prev,
            education: prev.education.map(edu =>
                edu.id === id ? { ...edu, [field]: value } : edu
            )
        }));
    };

    const removeEducation = (id) => {
        setProfile(prev => ({
            ...prev,
            education: prev.education.filter(edu => edu.id !== id)
        }));
    };

    // Add new experience entry
    const addExperience = () => {
        setProfile(prev => ({
            ...prev,
            experience: [...prev.experience, {
                id: Date.now(),
                company: '',
                title: '',
                location: '',
                startDate: '',
                endDate: '',
                current: false,
                description: ''
            }]
        }));
    };

    const updateExperience = (id, field, value) => {
        setProfile(prev => ({
            ...prev,
            experience: prev.experience.map(exp =>
                exp.id === id ? { ...exp, [field]: value } : exp
            )
        }));
    };

    const removeExperience = (id) => {
        setProfile(prev => ({
            ...prev,
            experience: prev.experience.filter(exp => exp.id !== id)
        }));
    };

    // Add new project entry
    const addProject = () => {
        setProfile(prev => ({
            ...prev,
            projects: [...prev.projects, {
                id: Date.now(),
                name: '',
                description: '',
                technologies: '',
                link: ''
            }]
        }));
    };

    const updateProject = (id, field, value) => {
        setProfile(prev => ({
            ...prev,
            projects: prev.projects.map(proj =>
                proj.id === id ? { ...proj, [field]: value } : proj
            )
        }));
    };

    const removeProject = (id) => {
        setProfile(prev => ({
            ...prev,
            projects: prev.projects.filter(proj => proj.id !== id)
        }));
    };

    // Skills management
    const [newSkill, setNewSkill] = useState('');

    const addSkill = () => {
        if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
            setProfile(prev => ({
                ...prev,
                skills: [...prev.skills, newSkill.trim()]
            }));
            setNewSkill('');
        }
    };

    const removeSkill = (skill) => {
        setProfile(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skill)
        }));
    };

    // Extract data from resume text using Gemini AI
    const extractFromResume = async () => {
        if (!resumeText.trim()) return;

        setExtracting(true);
        try {
            const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

            if (!GEMINI_API_KEY) {
                alert('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
                return;
            }

            const prompt = `You are a resume parser. Extract structured data from the following resume text and return it as a valid JSON object.

Resume Text:
${resumeText}

Extract the following information and return ONLY a valid JSON object (no markdown, no code blocks, just pure JSON):
{
  "fullName": "extracted full name or empty string",
  "email": "extracted email or empty string",
  "phone": "extracted phone or empty string",
  "location": "extracted location/city or empty string",
  "headline": "professional headline derived from their role/title or empty string",
  "summary": "professional summary if present or empty string",
  "linkedin": "linkedin url if present or empty string",
  "github": "github url if present or empty string",
  "portfolio": "portfolio url if present or empty string",
  "education": [
    {
      "institution": "university/college name",
      "degree": "degree type (Bachelor's, Master's, etc.)",
      "field": "field of study",
      "startDate": "YYYY-MM format or empty",
      "endDate": "YYYY-MM format or empty",
      "gpa": "GPA if mentioned or empty"
    }
  ],
  "experience": [
    {
      "company": "company name",
      "title": "job title",
      "location": "job location if mentioned",
      "startDate": "YYYY-MM format or empty",
      "endDate": "YYYY-MM format or 'Present'",
      "current": true/false,
      "description": "job description/responsibilities"
    }
  ],
  "skills": ["skill1", "skill2", ...],
  "projects": [
    {
      "name": "project name",
      "description": "project description",
      "technologies": "comma-separated technologies used",
      "link": "project link if present"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, nothing else. No explanations, no markdown.`;

            // Use gemini-2.5-flash model
            const modelName = 'gemini-2.5-flash';
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 4096,
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
                throw new Error(`Gemini API error: ${errorMsg}`);
            }

            const data = await response.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textContent) {
                throw new Error('No response from Gemini API');
            }

            // Clean the response - remove markdown code blocks if present
            let cleanedContent = textContent.trim();
            if (cleanedContent.startsWith('```json')) {
                cleanedContent = cleanedContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedContent.startsWith('```')) {
                cleanedContent = cleanedContent.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            // Parse the JSON
            const extractedData = JSON.parse(cleanedContent);

            // Update profile with extracted data, adding IDs to arrays
            setProfile(prev => {
                const newProfile = { ...prev };

                // Update simple fields
                if (extractedData.fullName) newProfile.fullName = extractedData.fullName;
                if (extractedData.email) newProfile.email = extractedData.email;
                if (extractedData.phone) newProfile.phone = extractedData.phone;
                if (extractedData.location) newProfile.location = extractedData.location;
                if (extractedData.headline) newProfile.headline = extractedData.headline;
                if (extractedData.summary) newProfile.summary = extractedData.summary;
                if (extractedData.linkedin) newProfile.linkedin = extractedData.linkedin;
                if (extractedData.github) newProfile.github = extractedData.github;
                if (extractedData.portfolio) newProfile.portfolio = extractedData.portfolio;

                // Update education array with IDs
                if (extractedData.education && extractedData.education.length > 0) {
                    newProfile.education = extractedData.education.map((edu, index) => ({
                        id: Date.now() + index,
                        institution: edu.institution || '',
                        degree: edu.degree || '',
                        field: edu.field || '',
                        startDate: edu.startDate || '',
                        endDate: edu.endDate || '',
                        gpa: edu.gpa || ''
                    }));
                }

                // Update experience array with IDs
                if (extractedData.experience && extractedData.experience.length > 0) {
                    newProfile.experience = extractedData.experience.map((exp, index) => ({
                        id: Date.now() + 1000 + index,
                        company: exp.company || '',
                        title: exp.title || '',
                        location: exp.location || '',
                        startDate: exp.startDate || '',
                        endDate: exp.current ? '' : (exp.endDate || ''),
                        current: exp.current || false,
                        description: exp.description || ''
                    }));
                }

                // Update skills array
                if (extractedData.skills && extractedData.skills.length > 0) {
                    newProfile.skills = [...new Set([...prev.skills, ...extractedData.skills])];
                }

                // Update projects array with IDs
                if (extractedData.projects && extractedData.projects.length > 0) {
                    newProfile.projects = extractedData.projects.map((proj, index) => ({
                        id: Date.now() + 2000 + index,
                        name: proj.name || '',
                        description: proj.description || '',
                        technologies: proj.technologies || '',
                        link: proj.link || ''
                    }));
                }

                return newProfile;
            });

            alert('✅ Resume data extracted successfully! Please review and edit the data in each tab, then save your profile.');

        } catch (error) {
            console.error('Extraction error:', error);
            if (error.message.includes('JSON')) {
                alert('Failed to parse the extracted data. Please try again or fill in the form manually.');
            } else {
                alert(`Failed to extract data: ${error.message}`);
            }
        } finally {
            setExtracting(false);
        }
    };

    // Handle PDF file upload
    const handlePdfUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        setPdfFile(file);
        setPdfLoading(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                fullText += pageText + '\n\n';
            }

            setResumeText(fullText.trim());
            alert(`Successfully extracted text from ${pdf.numPages} page(s). You can now use "Extract Data with Gemini AI" to parse your resume.`);
        } catch (error) {
            console.error('PDF extraction error:', error);
            alert('Failed to read PDF. Please try a different file or paste the text manually.');
        } finally {
            setPdfLoading(false);
        }
    };

    // Trigger file input click
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // Save profile to Firebase
    const handleSave = async () => {
        if (!user) return;

        setLoading(true);
        setSaveSuccess(false);

        try {
            await saveUserProfile(user.uid, {
                ...profile,
                updatedAt: new Date().toISOString()
            });
            await refreshProfile();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <User size={18} /> },
        { id: 'education', label: 'Education', icon: <GraduationCap size={18} /> },
        { id: 'experience', label: 'Experience', icon: <Briefcase size={18} /> },
        { id: 'skills', label: 'Skills & Projects', icon: <Code size={18} /> },
        { id: 'preferences', label: 'Preferences', icon: <Settings size={18} /> },
        { id: 'import', label: 'AI Import', icon: <Sparkles size={18} /> }
    ];

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center space-x-4">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-2xl" />
                            ) : (
                                <div className="w-20 h-20 bg-black text-white rounded-2xl flex items-center justify-center text-3xl font-bold">
                                    {profile.fullName?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-black">{profile.fullName || 'Your Profile'}</h1>
                                <p className="text-gray-600">{profile.headline || 'Complete your profile to get started'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="mt-6 md:mt-0 flex items-center space-x-2 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader className="animate-spin" size={20} />
                            ) : saveSuccess ? (
                                <CheckCircle size={20} className="text-green-400" />
                            ) : (
                                <Save size={20} />
                            )}
                            <span>{saveSuccess ? 'Saved!' : 'Save Profile'}</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="flex overflow-x-auto border-b border-gray-200">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-6 py-4 font-medium whitespace-nowrap transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-black text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={profile.fullName}
                                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                value={profile.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="tel"
                                                value={profile.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                placeholder="+1 (555) 123-4567"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={profile.location}
                                                onChange={(e) => handleInputChange('location', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                placeholder="San Francisco, CA"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Professional Headline</label>
                                    <input
                                        type="text"
                                        value={profile.headline}
                                        onChange={(e) => handleInputChange('headline', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                        placeholder="Software Engineer | AI Enthusiast | Full Stack Developer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Professional Summary</label>
                                    <textarea
                                        value={profile.summary}
                                        onChange={(e) => handleInputChange('summary', e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                        placeholder="Brief summary of your professional background and career goals..."
                                    />
                                </div>

                                <div className="grid md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                                        <div className="relative">
                                            <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="url"
                                                value={profile.linkedin}
                                                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                placeholder="linkedin.com/in/johndoe"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">GitHub</label>
                                        <div className="relative">
                                            <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="url"
                                                value={profile.github}
                                                onChange={(e) => handleInputChange('github', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                placeholder="github.com/johndoe"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="url"
                                                value={profile.portfolio}
                                                onChange={(e) => handleInputChange('portfolio', e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                placeholder="johndoe.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Education Tab */}
                        {activeTab === 'education' && (
                            <div className="space-y-6 animate-fadeIn">
                                {profile.education.map((edu, index) => (
                                    <div key={edu.id} className="p-6 bg-gray-50 rounded-xl border border-gray-200 relative">
                                        <button
                                            onClick={() => removeEducation(edu.id)}
                                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                                                <input
                                                    type="text"
                                                    value={edu.institution}
                                                    onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="Stanford University"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                                                <input
                                                    type="text"
                                                    value={edu.degree}
                                                    onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="Bachelor of Science"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
                                                <input
                                                    type="text"
                                                    value={edu.field}
                                                    onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="Computer Science"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">GPA</label>
                                                <input
                                                    type="text"
                                                    value={edu.gpa}
                                                    onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="3.8/4.0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                                <input
                                                    type="month"
                                                    value={edu.startDate}
                                                    onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                                <input
                                                    type="month"
                                                    value={edu.endDate}
                                                    onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={addEducation}
                                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-black hover:text-black transition-all duration-300 flex items-center justify-center space-x-2"
                                >
                                    <Plus size={20} />
                                    <span>Add Education</span>
                                </button>
                            </div>
                        )}

                        {/* Experience Tab */}
                        {activeTab === 'experience' && (
                            <div className="space-y-6 animate-fadeIn">
                                {profile.experience.map((exp, index) => (
                                    <div key={exp.id} className="p-6 bg-gray-50 rounded-xl border border-gray-200 relative">
                                        <button
                                            onClick={() => removeExperience(exp.id)}
                                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                                                <input
                                                    type="text"
                                                    value={exp.company}
                                                    onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="Google"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                                <input
                                                    type="text"
                                                    value={exp.title}
                                                    onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="Software Engineer"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                                <input
                                                    type="text"
                                                    value={exp.location}
                                                    onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="Mountain View, CA"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                                    <input
                                                        type="month"
                                                        value={exp.startDate}
                                                        onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                                    <input
                                                        type="month"
                                                        value={exp.endDate}
                                                        disabled={exp.current}
                                                        onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={exp.current}
                                                    onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                                                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                                                />
                                                <label className="text-sm text-gray-700">I currently work here</label>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                                <textarea
                                                    value={exp.description}
                                                    onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                                                    rows={3}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                    placeholder="Describe your responsibilities and achievements..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={addExperience}
                                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-black hover:text-black transition-all duration-300 flex items-center justify-center space-x-2"
                                >
                                    <Plus size={20} />
                                    <span>Add Experience</span>
                                </button>
                            </div>
                        )}

                        {/* Skills & Projects Tab */}
                        {activeTab === 'skills' && (
                            <div className="space-y-8 animate-fadeIn">
                                {/* Skills */}
                                <div>
                                    <h3 className="text-lg font-bold text-black mb-4">Skills</h3>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {profile.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full text-sm"
                                            >
                                                <span>{skill}</span>
                                                <button onClick={() => removeSkill(skill)} className="hover:text-red-300">
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                            placeholder="Add a skill (e.g., Python, React, Machine Learning)"
                                        />
                                        <button
                                            onClick={addSkill}
                                            className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* Projects */}
                                <div>
                                    <h3 className="text-lg font-bold text-black mb-4">Projects</h3>
                                    <div className="space-y-4">
                                        {profile.projects.map((proj, index) => (
                                            <div key={proj.id} className="p-6 bg-gray-50 rounded-xl border border-gray-200 relative">
                                                <button
                                                    onClick={() => removeProject(proj.id)}
                                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                                                        <input
                                                            type="text"
                                                            value={proj.name}
                                                            onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                            placeholder="AI Job Search Agent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Link</label>
                                                        <input
                                                            type="url"
                                                            value={proj.link}
                                                            onChange={(e) => updateProject(proj.id, 'link', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                            placeholder="https://github.com/..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Technologies</label>
                                                        <input
                                                            type="text"
                                                            value={proj.technologies}
                                                            onChange={(e) => updateProject(proj.id, 'technologies', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                            placeholder="React, Python, TensorFlow"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                                        <textarea
                                                            value={proj.description}
                                                            onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                                                            rows={2}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                                            placeholder="Brief description of the project..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={addProject}
                                            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-black hover:text-black transition-all duration-300 flex items-center justify-center space-x-2"
                                        >
                                            <Plus size={20} />
                                            <span>Add Project</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Preferences Tab */}
                        {activeTab === 'preferences' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Remote Preference</label>
                                        <select
                                            value={profile.preferences.remotePreference}
                                            onChange={(e) => handlePreferenceChange('remotePreference', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                        >
                                            <option value="remote">Remote Only</option>
                                            <option value="hybrid">Hybrid</option>
                                            <option value="onsite">On-site</option>
                                            <option value="any">No Preference</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Salary Expectation</label>
                                        <input
                                            type="text"
                                            value={profile.preferences.salaryExpectation}
                                            onChange={(e) => handlePreferenceChange('salaryExpectation', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                            placeholder="$80,000 - $120,000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Available From</label>
                                        <input
                                            type="date"
                                            value={profile.preferences.availableFrom}
                                            onChange={(e) => handlePreferenceChange('availableFrom', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2 pt-8">
                                        <input
                                            type="checkbox"
                                            checked={profile.preferences.visaRequired}
                                            onChange={(e) => handlePreferenceChange('visaRequired', e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                                        />
                                        <label className="text-sm text-gray-700">I require visa sponsorship</label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Locations (comma separated)</label>
                                    <input
                                        type="text"
                                        value={profile.preferences.locations?.join(', ') || ''}
                                        onChange={(e) => handlePreferenceChange('locations', e.target.value.split(',').map(s => s.trim()))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                                        placeholder="San Francisco, New York, Remote"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Job Types</label>
                                    <div className="flex flex-wrap gap-3">
                                        {['Full-time', 'Part-time', 'Internship', 'Contract'].map(type => (
                                            <label key={type} className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={profile.preferences.jobTypes?.includes(type) || false}
                                                    onChange={(e) => {
                                                        const current = profile.preferences.jobTypes || [];
                                                        if (e.target.checked) {
                                                            handlePreferenceChange('jobTypes', [...current, type]);
                                                        } else {
                                                            handlePreferenceChange('jobTypes', current.filter(t => t !== type));
                                                        }
                                                    }}
                                                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                                                />
                                                <span className="text-gray-700">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Import Tab */}
                        {activeTab === 'import' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200">
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center">
                                            <Sparkles size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-black">AI Resume Parser</h3>
                                            <p className="text-gray-600">Upload a PDF or paste your resume text to extract your data</p>
                                        </div>
                                    </div>

                                    {/* PDF Upload Section */}
                                    <div className="mb-6">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handlePdfUpload}
                                            accept=".pdf"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={handleUploadClick}
                                            disabled={pdfLoading}
                                            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-black hover:text-black hover:bg-gray-50 transition-all duration-300 flex flex-col items-center justify-center space-y-3 disabled:opacity-50"
                                        >
                                            {pdfLoading ? (
                                                <>
                                                    <Loader className="animate-spin" size={32} />
                                                    <span className="font-medium">Extracting text from PDF...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileUp size={32} />
                                                    <span className="font-medium">
                                                        {pdfFile ? `Uploaded: ${pdfFile.name}` : 'Click to upload PDF resume'}
                                                    </span>
                                                    <span className="text-sm text-gray-400">PDF files only • Max 10MB</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-4 bg-gradient-to-br from-gray-50 to-white text-gray-500">or paste resume text</span>
                                        </div>
                                    </div>

                                    <textarea
                                        value={resumeText}
                                        onChange={(e) => setResumeText(e.target.value)}
                                        rows={10}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all font-mono text-sm"
                                        placeholder="Paste your resume text here...

Example:
John Doe
Software Engineer
San Francisco, CA

EDUCATION
Stanford University
B.S. Computer Science, 2024
GPA: 3.8

EXPERIENCE
Google - Software Engineer Intern
June 2023 - August 2023
- Built machine learning pipelines
- Improved search ranking by 15%

SKILLS
Python, JavaScript, React, TensorFlow, SQL"
                                    />

                                    <button
                                        onClick={extractFromResume}
                                        disabled={extracting || !resumeText.trim()}
                                        className="mt-4 w-full flex items-center justify-center space-x-2 px-6 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {extracting ? (
                                            <>
                                                <Loader className="animate-spin" size={20} />
                                                <span>Extracting with AI...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={20} />
                                                <span>Extract Data with Gemini AI</span>
                                            </>
                                        )}
                                    </button>

                                    <p className="mt-4 text-sm text-gray-500 text-center">
                                        The AI will parse your resume and automatically fill in your profile. You can review and edit the data afterwards.
                                    </p>
                                </div>

                                {/* Applied Jobs Section */}
                                {profile.appliedJobs && profile.appliedJobs.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="text-xl font-bold text-black mb-4 flex items-center space-x-2">
                                            <Award size={24} />
                                            <span>Applied Jobs</span>
                                        </h3>
                                        <div className="space-y-4">
                                            {profile.appliedJobs.map((job, index) => (
                                                <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-semibold text-black">{job.title}</h4>
                                                        <p className="text-gray-600 text-sm">{job.company}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                                            Applied
                                                        </span>
                                                        <p className="text-gray-500 text-xs mt-1">
                                                            {new Date(job.appliedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
