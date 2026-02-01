/**
 * Job Agent API Service
 * Integrates with Krishna's backend at https://krishnasimha-portal-backend.hf.space
 */

const PORTAL_API = import.meta.env.VITE_JOB_PORTAL_API

/**
 * Fetch all jobs from the backend portal
 * @returns {Promise<Array>} List of jobs from the backend
 */
export const fetchBackendJobs = async () => {
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

        // Transform backend job format to match frontend format
        return jobs.map(job => ({
            id: `backend-${job.job_id}`,
            jobId: job.job_id, // Keep original ID for API calls
            title: job.job_title,
            company: job.company_name,
            location: job.location,
            skills: Array.isArray(job.skills) ? job.skills : job.skills?.split(',') || [],
            type: 'Full-time', // Default if not provided
            salary: 'Competitive',
            description: `Exciting opportunity at ${job.company_name}`,
            requirements: [],
            posted: 'Recently',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            remote: false,
            logo: null,
            source: 'backend' // Mark as coming from backend
        }));
    } catch (error) {
        console.error('Error fetching backend jobs:', error);
        return [];
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
        const payload = {
            job_id: jobId,
            student_name: studentName,
            resume: resume,
            bullets: bullets,
            proofs: proofs
        };

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
 * Get all applications from the backend
 * @returns {Promise<Array>} List of applications
 */
export const fetchApplications = async () => {
    try {
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
 * Check if the backend is healthy
 * @returns {Promise<boolean>}
 */
export const checkBackendHealth = async () => {
    try {
        const response = await fetch(`${PORTAL_API}/health`, {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        console.error('Backend health check failed:', error);
        return false;
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
    fetchBackendJobs,
    applyToJob,
    fetchApplications,
    addJob,
    checkBackendHealth,
    prepareApplicationPayload
};
