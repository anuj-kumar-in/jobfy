/**
 * Job Agent API Service
 * Integrates with the AI Job Search Agent backend
 */

const PORTAL_API = import.meta.env.VITE_JOB_PORTAL_API || 'https://krishnasimha-portal-backend.hf.space';
const AGENT_API = import.meta.env.VITE_JOB_AGENT_API || 'http://localhost:8000';

/**
 * Check if the agent backend is healthy
 * @returns {Promise<boolean>}
 */
export const checkAgentHealth = async () => {
    try {
        const response = await fetch(`${AGENT_API}/health`, {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        console.error('Agent health check failed:', error);
        return false;
    }
};

/**
 * Check if the portal backend is healthy
 * @returns {Promise<boolean>}
 */
export const checkBackendHealth = async () => {
    try {
        const response = await fetch(`${PORTAL_API}/health`, {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        // Try agent health as fallback
        return checkAgentHealth();
    }
};

/**
 * Fetch all jobs from the agent API (includes normalization)
 * @returns {Promise<Array>} List of jobs
 */
export const fetchAgentJobs = async () => {
    try {
        const response = await fetch(`${PORTAL_API}/jobs`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jobs = await response.json();
        return jobs.map(job => ({
            ...job,
            id: `agent-${job.id || job.job_id}`,
            jobId: job.job_id || job.id,
            source: 'agent'
        }));
    } catch (error) {
        console.error('Error fetching agent jobs:', error);
        return [];
    }
};

/**
 * Fetch all jobs from the backend portal
 * @returns {Promise<Array>} List of jobs from the backend
 */
export const fetchBackendJobs = async () => {
    try {
        // Try agent API first (has normalized format)
        const agentJobs = await fetchAgentJobs();
        if (agentJobs.length > 0) {
            return agentJobs;
        }

        // Fallback to portal API
        const response = await fetch(`${PORTAL_API}/jobs`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jobs = await response.json();

        return jobs.map(job => ({
            id: `backend-${job.job_id || job.id}`,
            jobId: job.job_id || job.id,
            title: job.job_title || job.title || '',
            company: job.company_name || job.company || '',
            location: job.location || '',
            skills: job.skills || [],
            type: job.type || 'Full-time',
            remote: job.remote || job.location?.toLowerCase() === 'remote',
            salary: job.salary || 'Competitive',
            description: job.description || '',
            requirements: job.requirements || [],
            posted: job.posted || 'Recently',
            source: 'backend',
        }));
    } catch (error) {
        console.error('Error fetching backend jobs:', error);
        return [];
    }
};

/**
 * Rank jobs based on user profile using AI Agent
 * @param {Object} userProfile - User profile from Firebase
 * @param {string} preferredRole - Preferred job role
 * @returns {Promise<Object>} Ranked jobs with explanations
 */
export const rankJobsWithAI = async (userProfile, preferredRole = '') => {
    try {
        const response = await fetch(`${AGENT_API}/rank`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile: {
                    fullName: userProfile?.fullName || '',
                    email: userProfile?.email || '',
                    phone: userProfile?.phone || '',
                    location: userProfile?.location || '',
                    headline: userProfile?.headline || '',
                    summary: userProfile?.summary || '',
                    skills: userProfile?.skills || [],
                    education: userProfile?.education || [],
                    experience: userProfile?.experience || [],
                    projects: userProfile?.projects || [],
                    linkedin: userProfile?.linkedin || '',
                    github: userProfile?.github || '',
                    portfolio: userProfile?.portfolio || '',
                    preferences: userProfile?.preferences || {}
                },
                preferred_role: preferredRole || userProfile?.preferences?.jobTypes?.[0] || ''
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Normalize job IDs for frontend
        return {
            ...result,
            ranked_jobs: result.ranked_jobs?.map(item => ({
                ...item,
                job: {
                    ...item.job,
                    id: `agent-${item.job.id || item.job.job_id}`,
                    jobId: item.job.job_id || item.job.id
                }
            })) || []
        };
    } catch (error) {
        console.error('Error ranking jobs with AI:', error);
        return {
            ranked_jobs: [],
            total_jobs: 0,
            error: error.message
        };
    }
};

/**
 * Apply to jobs in queue using AI Agent
 * @param {Object} userProfile - User profile
 * @param {Array} jobIds - Optional list of job IDs to apply to
 * @param {number} maxApplications - Maximum number of applications
 * @returns {Promise<Object>} Applied and skipped jobs
 */
export const applyToJobQueue = async (userProfile, jobIds = null, maxApplications = 10) => {
    try {
        const response = await fetch(`${AGENT_API}/apply-queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile: {
                    fullName: userProfile?.fullName || '',
                    email: userProfile?.email || '',
                    phone: userProfile?.phone || '',
                    location: userProfile?.location || '',
                    headline: userProfile?.headline || '',
                    summary: userProfile?.summary || '',
                    skills: userProfile?.skills || [],
                    education: userProfile?.education || [],
                    experience: userProfile?.experience || [],
                    projects: userProfile?.projects || [],
                    linkedin: userProfile?.linkedin || '',
                    github: userProfile?.github || '',
                    portfolio: userProfile?.portfolio || '',
                    preferences: userProfile?.preferences || {}
                },
                preferred_role: userProfile?.preferences?.jobTypes?.[0] || '',
                job_ids: jobIds,
                max_applications: maxApplications
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error applying to job queue:', error);
        return {
            success: false,
            applied_jobs: [],
            skipped_jobs: [],
            error: error.message
        };
    }
};

/**
 * Apply to a job via the backend API
 * @param {Object} applicationData - Application data
 * @returns {Promise<Object>} Application result
 */
export const applyToJob = async ({
    jobId,
    studentName,
    resume,
    bullets = [],
    proofs = {}
}) => {
    try {
        // Always convert job_id to string as the backend expects string type
        // Also remove common prefixes like 'agent-', 'backend-', etc.
        let cleanJobId = String(jobId).replace(/^(agent-|backend-|local-)/, '');

        const payload = {
            job_id: cleanJobId,
            student_name: studentName || 'Anonymous',
            resume: resume || {},
            bullets: Array.isArray(bullets) ? bullets : [],
            proofs: proofs || {}
        };

        console.log('Applying to job with payload:', { job_id: cleanJobId, student_name: studentName });

        const response = await fetch(`${PORTAL_API}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return {
            success: true,
            ...result
        };
    } catch (error) {
        console.error('Error applying to job:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Parse resume using AI Agent
 * @param {string} resumeText - Resume text to parse
 * @returns {Promise<Object>} Extracted profile data
 */
export const parseResumeWithAI = async (resumeText) => {
    try {
        const response = await fetch(`${AGENT_API}/parse-resume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resume_text: resumeText
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error parsing resume:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get all applications from the backend
 * @returns {Promise<Array>} List of applications
 */
export const fetchApplications = async () => {
    try {
        // Try agent API first
        try {
            const agentResponse = await fetch(`${AGENT_API}/applications`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (agentResponse.ok) {
                return await agentResponse.json();
            }
        } catch (e) {
            // Fall through to portal API
        }

        // Fallback to portal API
        const response = await fetch(`${PORTAL_API}/applications`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching applications:', error);
        return [];
    }
};

/**
 * Add a new job to the backend (for admin/testing)
 * @param {Object} jobData - Job data to add
 * @returns {Promise<Object>} Result
 */
export const addJob = async ({ jobTitle, companyName, skills, location }) => {
    try {
        const payload = {
            job_title: jobTitle,
            company_name: companyName,
            skills: skills,
            location: location
        };

        const response = await fetch(`${PORTAL_API}/add_job`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding job:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Generate resume bullets/proofs using profile data
 * This converts your frontend profile to the format expected by the backend
 */
export const prepareApplicationPayload = (userProfile) => {
    const bullets = [];

    // Add experience-based bullets
    if (userProfile?.experience?.length) {
        userProfile.experience.forEach(exp => {
            if (exp.description) {
                bullets.push(exp.description);
            }
            bullets.push(`${exp.title} at ${exp.company}`);
        });
    }

    // Add skill-based bullets
    if (userProfile?.skills?.length) {
        bullets.push(`Proficient in: ${userProfile.skills.join(', ')}`);
    }

    // Add project-based bullets
    if (userProfile?.projects?.length) {
        userProfile.projects.forEach(proj => {
            if (proj.name && proj.description) {
                bullets.push(`${proj.name}: ${proj.description}`);
            }
        });
    }

    // Prepare proofs (links)
    const proofs = {
        links: []
    };

    if (userProfile?.linkedin) {
        proofs.links.push({ type: 'linkedin', url: userProfile.linkedin });
    }
    if (userProfile?.github) {
        proofs.links.push({ type: 'github', url: userProfile.github });
    }
    if (userProfile?.portfolio) {
        proofs.links.push({ type: 'portfolio', url: userProfile.portfolio });
    }

    // Add project links
    if (userProfile?.projects?.length) {
        userProfile.projects.forEach(proj => {
            if (proj.link) {
                proofs.links.push({ type: 'project', name: proj.name, url: proj.link });
            }
        });
    }

    // Prepare resume object
    const resume = {
        name: userProfile?.fullName || '',
        email: userProfile?.email || '',
        phone: userProfile?.phone || '',
        location: userProfile?.location || '',
        headline: userProfile?.headline || '',
        summary: userProfile?.summary || '',
        skills: userProfile?.skills || [],
        education: userProfile?.education || [],
        experience: userProfile?.experience || [],
        projects: userProfile?.projects || [],
        preferred_role: userProfile?.preferences?.jobTypes?.[0] || ''
    };

    return {
        resume,
        bullets,
        proofs
    };
};

export default {
    checkAgentHealth,
    checkBackendHealth,
    fetchAgentJobs,
    fetchBackendJobs,
    rankJobsWithAI,
    applyToJobQueue,
    applyToJob,
    parseResumeWithAI,
    fetchApplications,
    addJob,
    prepareApplicationPayload
};
