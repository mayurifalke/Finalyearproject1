import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RelevantProjects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState({
    employmentType: {
      'full-time': false,
      'part-time': false,
      'contract': false,
      'remote': false
    },
    skills: {
      'React.js': false,
      'Node.js': false,
      'TypeScript': false,
      'JavaScript': false,
      'Python': false,
      'Java': false
    }
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchRelevantProjects();
  }, []);


  // Fetch relevant projects from the API using cookie-based endpoint
  const fetchRelevantProjects = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get('/api/candidate/relevant-projects', {
        withCredentials: true,
        params: {
          top_k: 50
        }
      });
      
      if (response.data.success) {
        setProjects(response.data.projects || []);
        setFilteredProjects(response.data.projects || []);
        setStats({
          candidateName: response.data.candidate_name,
          totalMatched: response.data.total_projects_matched,
          totalValid: response.data.total_valid_projects
        });
      } else {
        setError(response.data.message || 'Failed to fetch relevant projects');
      }
      
    } catch (error) {
      console.error('Error fetching relevant projects:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        setError('Candidate profile not found. Please complete your profile first.');
      } else if (error.response?.status === 401) {
        setError('Please log in to view job recommendations');
      } else if (error.response?.status === 400) {
        setError('Please complete your profile to get personalized job recommendations');
      } else {
        setError(error.response?.data?.detail || 'Failed to load job opportunities');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let filtered = [...projects];

    // Search keyword filter
    if (searchKeyword) {
      filtered = filtered.filter(project => {
        const details = project.project_details;
        return (
          details?.job_title?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          details?.project_description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          details?.job_location?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          details?.project_skills?.some(skill => 
            skill.toLowerCase().includes(searchKeyword.toLowerCase())
          )
        );
      });
    }

    // Employment type filter
    const selectedEmploymentTypes = Object.keys(filters.employmentType).filter(type => filters.employmentType[type]);
    if (selectedEmploymentTypes.length > 0) {
      filtered = filtered.filter(project => {
        const employmentType = project.project_details?.employment_type?.toLowerCase();
        return selectedEmploymentTypes.some(selectedType => 
          employmentType?.includes(selectedType.toLowerCase())
        );
      });
    }

    // Skills filter
    const selectedSkills = Object.keys(filters.skills).filter(skill => filters.skills[skill]);
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(project => 
        project.project_details?.project_skills?.some(skill => 
          selectedSkills.some(selectedSkill => 
            skill.toLowerCase().includes(selectedSkill.toLowerCase())
          )
        )
      );
    }

    // Sort projects
    if (sortBy === 'relevance') {
      filtered.sort((a, b) => b.overall_score - a.overall_score);
    } else if (sortBy === 'salary-high') {
      filtered.sort((a, b) => (b.project_details?.salary_max || 0) - (a.project_details?.salary_max || 0));
    } else if (sortBy === 'salary-low') {
      filtered.sort((a, b) => (a.project_details?.salary_min || 0) - (b.project_details?.salary_min || 0));
    } else if (sortBy === 'deadline') {
      filtered.sort((a, b) => new Date(a.project_details?.application_deadline) - new Date(b.project_details?.application_deadline));
    }

    setFilteredProjects(filtered);
  }, [projects, searchKeyword, filters, sortBy]);

  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  const handleApply = async (projectId, event) => {
    event.stopPropagation();
    console.log('Apply to project:', projectId);
    // TODO: Implement application functionality
    alert('Application feature coming soon!');
  };

  const handleSaveProject = async (projectId, event) => {
    event.stopPropagation();
    console.log('Save project:', projectId);
    // TODO: Implement save project functionality
    alert('Save project feature coming soon!');
  };

  const handleEmploymentTypeToggle = (type) => {
    setFilters(prev => ({
      ...prev,
      employmentType: {
        ...prev.employmentType,
        [type]: !prev.employmentType[type]
      }
    }));
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

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(date - now);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day left';
      if (diffDays < 7) return `${diffDays} days left`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks left`;
      return `${Math.floor(diffDays / 30)} months left`;
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  const getSalaryDisplay = (project) => {
    const details = project.project_details;
    if (details?.salary_min && details?.salary_max) {
      const min = details.salary_min.toLocaleString();
      const max = details.salary_max.toLocaleString();
      const frequency = details.salary_frequency === 'hourly' ? '/hr' : 
                       details.salary_frequency === 'monthly' ? '/mo' : 
                       details.salary_frequency === 'annually' ? '/year' : '';
      
      return `$${min} - $${max}${frequency}`;
    }
    return 'Salary not specified';
  };

  const getMatchPercentage = (score) => {
    return Math.round(score * 100);
  };

  if (selectedProject) {
    const details = selectedProject.project_details;
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <button 
          onClick={() => setSelectedProject(null)}
          className="mb-4 flex items-center text-purple-600 hover:text-purple-700 font-medium text-base"
        >
          ← Back to Job Opportunities
        </button>
        
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {details?.job_title || 'No Title'}
                </h2>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {getMatchPercentage(selectedProject.overall_score)}% Match
                </span>
              </div>
              <p className="text-gray-600 text-base mb-2">
                {formatDate(details?.application_deadline)} • {details?.employment_type || 'Not specified'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-gray-900 mb-2">
                {getSalaryDisplay(selectedProject)}
              </p>
              <p className="text-gray-600 text-base capitalize">
                {details?.job_location || 'Location not specified'}
              </p>
            </div>
          </div>

          {/* Match Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-lg font-bold text-purple-600 mb-1">
                {getMatchPercentage(selectedProject.overall_score)}%
              </div>
              <div className="text-gray-600 text-sm">Overall Match</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-lg font-bold text-blue-600 mb-1">
                {getMatchPercentage(selectedProject.description_score)}%
              </div>
              <div className="text-gray-600 text-sm">Role Match</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-lg font-bold text-green-600 mb-1">
                {getMatchPercentage(selectedProject.skills_score)}%
              </div>
              <div className="text-gray-600 text-sm">Skills Match</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-lg">Job Description</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
              {details?.project_description || 'No description available'}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-lg">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {details?.project_skills?.map((skill, index) => (
                <span 
                  key={index}
                  className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-base font-medium"
                >
                  {skill}
                </span>
              ))}
              {(!details?.project_skills || details.project_skills.length === 0) && (
                <p className="text-gray-500 text-base">No skills specified</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-base">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Job Details</h4>
              <div className="space-y-2">
                <p><span className="font-medium">Location:</span> {details?.job_location || 'Not specified'}</p>
                <p><span className="font-medium">Employment Type:</span> {details?.employment_type || 'Not specified'}</p>
                <p><span className="font-medium">Salary Frequency:</span> {details?.salary_frequency || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Application Info</h4>
              <div className="space-y-2">
                <p><span className="font-medium">Deadline:</span> {details?.application_deadline ? new Date(details.application_deadline).toLocaleDateString() : 'Not specified'}</p>
                <p><span className="font-medium">Posted:</span> {getTimeAgo(details?.created_at)}</p>
                <p><span className="font-medium">Project ID:</span> {selectedProject.project_id}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-6 border-t border-gray-200">
            <button 
              onClick={(e) => handleApply(selectedProject.project_id, e)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium text-base"
            >
              Apply Now
            </button>
            <button 
              onClick={(e) => handleSaveProject(selectedProject.project_id, e)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium text-base"
            >
              Save for Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="font-semibold text-gray-900 text-xl">Recommended Job Opportunities</h4>
          {stats && (
            <p className="text-gray-600 mt-1 text-sm">
              Personalized matches {stats.candidateName ? `for ${stats.candidateName}` : ''} • {stats.totalValid} opportunities found
            </p>
          )}
        </div>
        <button 
          onClick={fetchRelevantProjects}
          disabled={isLoading}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-base font-medium disabled:bg-purple-300"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Matches'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3 text-base">Search Jobs</h5>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search jobs, skills, location..."
                className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-base"
              />
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-3 text-base">Filter by:</h5>
            
            {/* Employment Type */}
            <div className="mb-4">
              <h6 className="font-medium text-gray-700 mb-2 text-base">Employment Type</h6>
              <div className="space-y-2">
                {Object.keys(filters.employmentType).map((type) => (
                  <label key={type} className="flex items-center text-base text-gray-700">
                    <input
                      type="checkbox"
                      checked={filters.employmentType[type]}
                      onChange={() => handleEmploymentTypeToggle(type)}
                      className="text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span className="ml-2 capitalize">{type.replace('-', ' ')}</span>
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
                <option value="relevance">Best Match</option>
                <option value="salary-high">Salary: High to Low</option>
                <option value="salary-low">Salary: Low to High</option>
                <option value="deadline">Application Deadline</option>
              </select>
              <span className="text-gray-600 text-base">
                {filteredProjects.length} {filteredProjects.length === 1 ? 'opportunity' : 'opportunities'} found
              </span>
            </div>
          </div>

          {/* Project List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-600 text-lg">Finding your perfect matches...</div>
                <p className="text-gray-500 text-sm mt-2">Analyzing your profile against available opportunities</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-600 text-lg">
                  {projects.length === 0 ? 'No job opportunities found' : 'No opportunities match your filters'}
                </div>
                <p className="text-gray-500 text-base mt-2">
                  {projects.length === 0 
                    ? 'Try refreshing or check back later for new opportunities.' 
                    : 'Try adjusting your filters or search terms.'
                  }
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const details = project.project_details;
                
                return (
                  <div 
                    key={project.project_id}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleProjectClick(project)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {details?.job_title || 'Untitled Position'}
                          </h3>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                            {getMatchPercentage(project.overall_score)}% Match
                          </span>
                        </div>
                        <p className="text-gray-600 text-base mb-2">
                          {formatDate(details?.application_deadline)} • {details?.employment_type || 'Not specified'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 mb-1">
                          {getSalaryDisplay(project)}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {details?.job_location || 'Remote'}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4 line-clamp-2 text-base">
                      {details?.project_description || 'No description available'}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {details?.project_skills?.slice(0, 6).map((skill, index) => (
                        <span 
                          key={index}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-base"
                        >
                          {skill}
                        </span>
                      ))}
                      {(!details?.project_skills || details.project_skills.length === 0) && (
                        <span className="text-gray-500 text-base">No skills specified</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-base text-gray-600">
                        <span>Posted {getTimeAgo(details?.created_at)}</span>
                        <span className="ml-4">Match Score: {getMatchPercentage(project.overall_score)}%</span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleApply(project.project_id, e)}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium text-base"
                        >
                          Apply Now
                        </button>
                        <button 
                          onClick={(e) => handleSaveProject(project.project_id, e)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-base"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelevantProjects;