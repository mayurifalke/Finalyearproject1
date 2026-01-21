import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api';

const JobPostings = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState({
    budgetType: {
      fixedPrice: false,
      hourly: false,
      contests: false
    },
    jobType: {
      local: false,
      featured: false,
      recruiter: false,
      fullTime: false
    },
    skills: {
      'React.js': false,
      'Node.js': false,
      'TypeScript': false,
      'JavaScript': false,
      'MongoDB': false,
      'Express.js': false
    },
    customSkill: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingJobDetail, setIsLoadingJobDetail] = useState(false);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const [error, setError] = useState('');
  const [applicantsError, setApplicantsError] = useState('');
  const [viewMode, setViewMode] = useState('details'); // 'details' | 'applicants' | 'ranked'
  const [applicants, setApplicants] = useState([]);
  const [applicantCounts, setApplicantCounts] = useState({});
  const [rankedCandidates, setRankedCandidates] = useState([]);
  const [rankedLoading, setRankedLoading] = useState(false);
  const [rankedError, setRankedError] = useState('');
  const [rankFilters, setRankFilters] = useState({
    has_leadership: null,
    highest_education: '',
    seniority_level: '',
    top_k: 20,
  });
  const [inviteLoadingId, setInviteLoadingId] = useState(null);
  const [invitedCandidates, setInvitedCandidates] = useState(new Set());

  useEffect(() => {
    fetchMyProjects();
  }, []);

  // Fetch projects from your actual API endpoint
  const fetchMyProjects = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get('/api/get-my-projects', {
        withCredentials: true // Important for sending cookies
      });
      
      if (response.data.success) {
        const projects = response.data.projects || [];
        setJobs(projects);
        setFilteredJobs(projects);

        // Fetch application counts for these projects
        await fetchApplicationCounts();
      } else {
        setError(response.data.message || 'Failed to fetch projects');
        setJobs([]);
        setFilteredJobs([]);
      }
      
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error.response?.data?.detail || 'Failed to load job postings');
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplicationCounts = async () => {
    try {
      const response = await axios.get('/api/applications/counts-for-my-projects', {
        withCredentials: true,
      });

      if (response.data?.success && response.data.counts) {
        setApplicantCounts(response.data.counts);
      }
    } catch (err) {
      console.error('Error fetching application counts:', err);
      // Non-blocking: if this fails we just keep counts at 0
    }
  };

  // Fetch individual job details if needed
  const fetchJobDetail = async (projectId) => {
    try {
      setIsLoadingJobDetail(true);
      const response = await axios.get(`/api/project/${projectId}`);
      
      if (response.data.success) {
        setSelectedJob(response.data.project);
      } else {
        console.error('Failed to fetch job details:', response.data);
        setError('Failed to load job details');
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError('Failed to load job details');
    } finally {
      setIsLoadingJobDetail(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...jobs];

    // Search keyword filter
    if (searchKeyword) {
      filtered = filtered.filter(job => 
        job.job_title?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        job.project_description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        job.job_location?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    // Skills filter
    const selectedSkills = Object.keys(filters.skills).filter(skill => filters.skills[skill]);
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(job => 
        job.project_skills?.some(skill => 
          selectedSkills.some(selectedSkill => 
            skill.toLowerCase().includes(selectedSkill.toLowerCase())
          )
        )
      );
    }

    // Job type filter
    const selectedJobTypes = Object.keys(filters.jobType).filter(type => filters.jobType[type]);
    if (selectedJobTypes.length > 0) {
      filtered = filtered.filter(job => {
        if (filters.jobType.fullTime && job.employment_type === 'full-time') return true;
        if (filters.jobType.featured && job.featured) return true;
        // Add other job type conditions as needed
        return false;
      });
    }

    // Sort jobs
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'salary-high') {
      filtered.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    } else if (sortBy === 'salary-low') {
      filtered.sort((a, b) => (a.salary_min || 0) - (b.salary_min || 0));
    }

    setFilteredJobs(filtered);
  }, [jobs, searchKeyword, filters, sortBy]);

  const handleJobClick = async (job) => {
    // Use the job data we already have, or fetch fresh details if needed
    setSelectedJob(job);
    setViewMode('details');
    setApplicants([]);
    setApplicantsError('');
    
    // Uncomment if you want to fetch fresh data from API
    // await fetchJobDetail(job._id);
  };

  const fetchApplicants = async (jobId) => {
    try {
      setIsLoadingApplicants(true);
      setApplicantsError('');

      const response = await axios.get(`/api/applications/by-project/${jobId}`, {
        withCredentials: true,
      });

      if (response.data?.success) {
        const list = response.data.applicants || [];
        setApplicants(list);
        setApplicantCounts((prev) => ({
          ...prev,
          [jobId]: list.length,
        }));
      } else {
        setApplicantsError(response.data?.detail || response.data?.message || 'Failed to load applicants');
        setApplicants([]);
      }
    } catch (err) {
      console.error('Error fetching applicants:', err);
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to load applicants';
      setApplicantsError(msg);
      setApplicants([]);
    } finally {
      setIsLoadingApplicants(false);
    }
  };

  const handleViewApplicants = async (jobId, event) => {
    event.stopPropagation(); // Prevent triggering the job click
    setViewMode('applicants');

    if (!selectedJob || selectedJob._id !== jobId) {
      const job = jobs.find((j) => j._id === jobId);
      if (job) {
        setSelectedJob(job);
      }
    }

    await fetchApplicants(jobId);
  };

  const handleEditJob = (jobId, event) => {
    event.stopPropagation(); // Prevent triggering the job click
    console.log('Edit job:', jobId);
    // TODO: Implement edit job functionality
    // You can navigate to edit page or show edit form
  };

  const handleSkillToggle = (skill) => {
    setFilters(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skill]: !prev.skills[skill]
      }
    }));
  };

  const handleJobTypeToggle = (type) => {
    setFilters(prev => ({
      ...prev,
      jobType: {
        ...prev.jobType,
        [type]: !prev.jobType[type]
      }
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(date - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day left';
    if (diffDays < 7) return `${diffDays} days left`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks left`;
    return `${Math.floor(diffDays / 30)} months left`;
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getSalaryDisplay = (job) => {
    if (job.salary_min && job.salary_max) {
      const min = job.salary_min.toLocaleString();
      const max = job.salary_max.toLocaleString();
      const frequency = job.salary_frequency === 'hourly' ? '/hr' : 
                       job.salary_frequency === 'monthly' ? '/mo' : 
                       job.salary_frequency === 'annually' ? '/year' : '';
      
      return `$${min} - $${max}${frequency}`;
    }
    return 'Salary not specified';
  };

  const getApplicantCount = (jobId) => {
    return applicantCounts[jobId] || 0;
  };

  const handleStatusUpdate = async (applicationId, status) => {
    try {
      const response = await axios.patch(`/api/applications/${applicationId}/status`, {
        status,
      }, {
        withCredentials: true,
      });

      if (response.data?.success) {
        setApplicants((prev) =>
          prev.map((app) =>
            app.application_id === applicationId ? { ...app, status } : app
          )
        );
      } else {
        alert(response.data?.detail || response.data?.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating application status:', err);
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to update status';
      alert(msg);
    }
  };

  const handleRankFilterChange = (field, value) => {
    setRankFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLeadershipToggle = (value) => {
    setRankFilters((prev) => ({
      ...prev,
      has_leadership: value,
    }));
  };

  const handleGetRankedCandidates = async () => {
    if (!selectedJob?._id) return;

    try {
      setRankedLoading(true);
      setRankedError('');
      setRankedCandidates([]);

      const payload = {
        project_id: selectedJob._id,
        top_k: Number(rankFilters.top_k) || 20,
        filters: {
          has_leadership:
            rankFilters.has_leadership === null
              ? null
              : Boolean(rankFilters.has_leadership),
          highest_education: rankFilters.highest_education || null,
          seniority_level: rankFilters.seniority_level || null,
        },
      };

      const response = await api.post('/get-ranked-candidates', payload);

      if (response.data?.success) {
        setRankedCandidates(response.data.combined_ranked_results || []);
      } else {
        setRankedError(
          response.data?.detail || response.data?.message || 'Failed to get ranked candidates'
        );
      }
    } catch (err) {
      console.error('Error getting ranked candidates:', err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to get ranked candidates';
      setRankedError(msg);
    } finally {
      setRankedLoading(false);
    }
  };

  const handleInvite = async (candidate) => {
    if (candidate.has_applied || inviteLoadingId) return;
    if (!selectedJob?._id || !candidate.candidate_id) return;

    try {
      setInviteLoadingId(candidate.candidate_id);
      const response = await api.post('/invite-candidate', {
        project_id: selectedJob._id,
        candidate_id: candidate.candidate_id,
      });

      if (response.data?.success) {
        // Mark this candidate as invited
        setInvitedCandidates((prev) => new Set(prev).add(candidate.candidate_id));
        alert(response.data.message || 'Invitation email sent');
      } else {
        alert(response.data?.detail || response.data?.message || 'Failed to send invitation');
      }
    } catch (err) {
      console.error('Error sending invite:', err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to send invitation';
      alert(msg);
    } finally {
      setInviteLoadingId(null);
    }
  };

  if (selectedJob) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <button 
          onClick={() => setSelectedJob(null)}
          className="mb-4 flex items-center text-purple-600 hover:text-purple-700 font-medium text-base"
        >
          ← Back to Job Listings
        </button>
        
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
          {isLoadingJobDetail ? (
            <div className="text-center py-8">
              <div className="text-gray-600 text-lg">Loading job details...</div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedJob.job_title || 'No Title'}
                  </h2>
                  <p className="text-gray-600 text-base mb-2">
                    {formatDate(selectedJob.application_deadline)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    {getSalaryDisplay(selectedJob)}
                  </p>
                  <p className="text-gray-600 text-base capitalize">
                    {selectedJob.employment_type || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex space-x-4 border-b border-purple-100 pb-2">
                <button
                  onClick={() => setViewMode('details')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    viewMode === 'details'
                      ? 'bg-white text-purple-700 border border-purple-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Job Details
                </button>
                <button
                  onClick={() => {
                    setViewMode('applicants');
                    fetchApplicants(selectedJob._id);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    viewMode === 'applicants'
                      ? 'bg-white text-purple-700 border border-purple-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Applicants
                </button>
              </div>

              {viewMode === 'details' && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Job Description</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
                  {selectedJob.project_description || 'No description available'}
                </p>
              </div>
              )}

              {viewMode === 'details' && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.project_skills?.map((skill, index) => (
                    <span 
                      key={index}
                      className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-base font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {(!selectedJob.project_skills || selectedJob.project_skills.length === 0) && (
                    <p className="text-gray-500 text-base">No skills specified</p>
                  )}
                </div>
              </div>
              )}

              {viewMode === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-base">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Job Details</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Location:</span> {selectedJob.job_location || 'Not specified'}</p>
                    <p><span className="font-medium">Employment Type:</span> {selectedJob.employment_type || 'Not specified'}</p>
                    <p><span className="font-medium">Salary Frequency:</span> {selectedJob.salary_frequency || 'Not specified'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Application Info</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Deadline:</span> {selectedJob.application_deadline ? new Date(selectedJob.application_deadline).toLocaleDateString() : 'Not specified'}</p>
                    <p><span className="font-medium">Posted:</span> {getTimeAgo(selectedJob.created_at)}</p>
                    <p><span className="font-medium">Project ID:</span> {selectedJob._id}</p>
                  </div>
                </div>
              </div>
              )}

              {viewMode === 'details' && (
              <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium text-base">
                  {getApplicantCount(selectedJob._id)} Applicants
                </button>
                <button 
                  onClick={(e) => handleViewApplicants(selectedJob._id, e)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium text-base"
                >
                  View Applicants
                </button>
                <button 
                  onClick={(e) => handleEditJob(selectedJob._id, e)}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium text-base"
                >
                  Edit Job
                </button>
                <button
                  onClick={() => setViewMode('ranked')}
                  className="ml-auto bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:from-yellow-500 hover:via-orange-600 hover:to-pink-600 transition-all duration-200 font-semibold text-base border border-yellow-300"
                >
                  ★ Get Ranked Candidates (Premium)
                </button>
              </div>
              )}

              {viewMode === 'applicants' && (
                <div className="mt-4">
                  {isLoadingApplicants ? (
                    <div className="text-center py-8 text-gray-600">
                      Loading applicants...
                    </div>
                  ) : applicantsError ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {applicantsError}
                    </div>
                  ) : applicants.length === 0 ? (
                    <div className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded-lg">
                      No applicants have applied for this job yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applicants.map((app) => (
                        <div
                          key={app.application_id}
                          className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-base">
                                {app.candidate?.name || 'Unknown Candidate'}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {app.candidate?.current_role || 'Role not specified'}
                              </p>
                              {app.candidate?.total_experience_years != null && (
                                <p className="text-gray-500 text-xs">
                                  {app.candidate.total_experience_years} years experience
                                </p>
                              )}
                            </div>
                            <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
                              {app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Applied'}
                            </span>
                          </div>

                          <div className="flex justify-end space-x-2 mt-3 text-sm">
                            <button
                              onClick={() => handleStatusUpdate(app.application_id, 'shortlisted')}
                              className="px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                            >
                              Shortlist
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(app.application_id, 'rejected')}
                              className="px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(app.application_id, 'hired')}
                              className="px-3 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600"
                            >
                              Mark as Hired
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'ranked' && (
                <div className="mt-6 bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900 text-lg">Get Ranked Candidates (Premium)</h4>
                      <p className="text-gray-600 text-sm">
                        Use AI ranking to find the best-matching candidates for this job based on resume, projects, and skills.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-yellow-600 font-semibold bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full">
                        Premium Feature
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Leadership Experience
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleLeadershipToggle(true)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                            rankFilters.has_leadership === true
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-700 border-gray-300'
                          }`}
                        >
                          Required
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLeadershipToggle(false)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                            rankFilters.has_leadership === false
                              ? 'bg-purple-100 text-purple-700 border-purple-300'
                              : 'bg-white text-gray-700 border-gray-300'
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLeadershipToggle(null)}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                            rankFilters.has_leadership === null
                              ? 'bg-gray-100 text-gray-800 border-gray-300'
                              : 'bg-white text-gray-500 border-gray-200'
                          }`}
                        >
                          Any
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Highest Education
                      </label>
                      <select
                        value={rankFilters.highest_education}
                        onChange={(e) => handleRankFilterChange('highest_education', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Any</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Undergraduate">Undergraduate</option>
                        <option value="Postgraduate">Postgraduate</option>
                        <option value="Doctorate">Doctorate</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seniority Level
                      </label>
                      <select
                        value={rankFilters.seniority_level}
                        onChange={(e) => handleRankFilterChange('seniority_level', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Any</option>
                        <option value="Junior">Junior</option>
                        <option value="Mid">Mid</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Top K Candidates
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={rankFilters.top_k}
                        onChange={(e) => handleRankFilterChange('top_k', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <div className="text-xs text-gray-500">
                      Filters are optional. Leave as <span className="font-semibold">Any</span> to ignore a field.
                    </div>
                    <button
                      type="button"
                      onClick={handleGetRankedCandidates}
                      disabled={rankedLoading}
                      className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-5 py-2.5 rounded-full shadow-md hover:shadow-lg hover:from-yellow-500 hover:via-orange-600 hover:to-pink-600 transition-all duration-200 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {rankedLoading ? 'Ranking candidates...' : 'Search Ranked Candidates'}
                    </button>
                  </div>

                  {rankedError && (
                    <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                      {rankedError}
                    </div>
                  )}

                  {rankedCandidates.length > 0 && (
                    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-700 flex">
                        <div className="w-10">#</div>
                        <div className="flex-1">Candidate</div>
                        <div className="w-24 text-right">Overall</div>
                        <div className="w-24 text-right">Prof.</div>
                        <div className="w-24 text-right">Projects</div>
                        <div className="w-24 text-right">Skills</div>
                        <div className="w-32 text-right hidden md:block">Seniority</div>
                        <div className="w-32 text-right">Action</div>
                      </div>
                      {rankedCandidates.map((c, idx) => (
                        <div
                          key={c.candidate_id + '_' + idx}
                          className="px-4 py-2 text-sm text-gray-800 flex odd:bg-white even:bg-gray-50"
                        >
                          <div className="w-10 font-medium text-gray-600">{idx + 1}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{c.name || 'Unnamed Candidate'}</div>
                            <div className="text-xs text-gray-500">
                              {c.highest_education || 'Education: N/A'} • {c.has_leadership ? 'Leadership' : 'Individual contributor'}
                            </div>
                          </div>
                          <div className="w-24 text-right font-semibold text-purple-700">
                            {(c.overall_score * 100).toFixed(0)}%
                          </div>
                          <div className="w-24 text-right text-gray-700">
                            {(c.professional_score * 100).toFixed(0)}%
                          </div>
                          <div className="w-24 text-right text-gray-700">
                            {(c.project_score * 100).toFixed(0)}%
                          </div>
                          <div className="w-24 text-right text-gray-700">
                            {(c.skills_score * 100).toFixed(0)}%
                          </div>
                          <div className="w-32 text-right text-gray-700 hidden md:block">
                            {c.seniority_level || 'N/A'}
                          </div>
                          <div className="w-32 flex justify-end items-center">
                            {c.has_applied ? (
                              <button
                                type="button"
                                className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200 cursor-default"
                                disabled
                              >
                                Applied
                              </button>
                            ) : invitedCandidates.has(c.candidate_id) ? (
                              <button
                                type="button"
                                className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 cursor-default"
                                disabled
                              >
                                Invited
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInvite(c)}
                                disabled={inviteLoadingId === c.candidate_id}
                                className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {inviteLoadingId === c.candidate_id ? 'Inviting...' : 'Invite'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-semibold text-gray-900 text-xl">My Job Postings</h4>
        <button 
          onClick={fetchMyProjects}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-base font-medium"
        >
          Refresh Jobs
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3 text-base">Search Keyword</h5>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search jobs..."
                className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-base"
              />
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3 text-base">Filter by:</h5>
            
            {/* Type */}
            <div className="mb-4">
              <h6 className="font-medium text-gray-700 mb-2 text-base">Type</h6>
              <div className="space-y-2">
                {Object.keys(filters.jobType).map((type) => (
                  <label key={type} className="flex items-center text-base text-gray-700">
                    <input
                      type="checkbox"
                      checked={filters.jobType[type]}
                      onChange={() => handleJobTypeToggle(type)}
                      className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span className="ml-2 capitalize">{type.replace(/([A-Z])/g, ' $1').trim()} Jobs</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h6 className="font-medium text-gray-700 mb-2 text-base">Skills</h6>
              <div className="space-y-2 mb-3">
                {Object.keys(filters.skills).map((skill) => (
                  <label key={skill} className="flex items-center text-base text-gray-700">
                    <input
                      type="checkbox"
                      checked={filters.skills[skill]}
                      onChange={() => handleSkillToggle(skill)}
                      className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span className="ml-2">{skill}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div className="lg:col-span-3">
          {/* Header with sort and count */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-base focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="salary-high">Salary: High to Low</option>
                <option value="salary-low">Salary: Low to High</option>
              </select>
              <span className="text-gray-600 text-base">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
              </span>
            </div>
          </div>

          {/* Job List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-600 text-lg">Loading your job postings...</div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-600 text-lg">
                  {jobs.length === 0 ? 'No job postings found' : 'No jobs match your filters'}
                </div>
                <p className="text-gray-500 text-base mt-2">
                  {jobs.length === 0 ? 'Create your first job posting to get started.' : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div 
                  key={job._id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleJobClick(job)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {job.job_title || 'Untitled Job'}
                      </h3>
                      <p className="text-gray-600 text-base mb-2">
                        {formatDate(job.application_deadline)} • {job.employment_type || 'Not specified'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 mb-1">
                        {getSalaryDisplay(job)}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 line-clamp-2 text-base">
                    {job.project_description || 'No description available'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {job.project_skills?.slice(0, 6).map((skill, index) => (
                      <span 
                        key={index}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-base"
                      >
                        {skill}
                      </span>
                    ))}
                    {(!job.project_skills || job.project_skills.length === 0) && (
                      <span className="text-gray-500 text-base">No skills specified</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-base text-gray-600">
                      <span>{job.job_location || 'Location not specified'}</span>
                      <span className="ml-4">Posted {getTimeAgo(job.created_at)}</span>
                    </div>
                    
                    {/* Applicant and Action Buttons */}
                    <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                      <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg font-medium text-base">
                        {getApplicantCount(job._id)} Applicants
                      </div>
                      <button 
                        onClick={(e) => handleViewApplicants(job._id, e)}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium text-base"
                      >
                        View Applicants
                      </button>
                      <button 
                        onClick={(e) => handleEditJob(job._id, e)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-base"
                      >
                        Edit Job
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobPostings;