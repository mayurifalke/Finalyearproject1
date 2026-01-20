import React, { useState } from 'react';
import axios from 'axios';

const JobPostingForm = ({ onJobPosted }) => {
  const [formData, setFormData] = useState({
    project_description: '',
    project_skills: [],
    application_deadline: '',
    job_title: '',
    job_location: '',
    employment_type: '',
    salary_min: '',
    salary_max: '',
    salary_frequency: 'annually'
  });
  
  const [currentSkill, setCurrentSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add skill to the list
  const handleAddSkill = (e) => {
    e.preventDefault();
    if (currentSkill.trim() && !formData.project_skills.includes(currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        project_skills: [...prev.project_skills, currentSkill.trim()]
      }));
      setCurrentSkill('');
    }
  };

  // Remove skill from the list
  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      project_skills: prev.project_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Handle skill input key press
  const handleSkillKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill(e);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate required fields according to backend
      if (!formData.project_description || !formData.project_skills.length) {
        setMessage({ 
          type: 'error', 
          text: 'Job Description and Required Skills are required fields' 
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare payload for backend - only include fields that backend expects
      const payload = {
        project_description: formData.project_description,
        project_skills: formData.project_skills,
        ...(formData.job_title && { job_title: formData.job_title }),
        ...(formData.job_location && { job_location: formData.job_location }),
        ...(formData.employment_type && { employment_type: formData.employment_type }),
        ...(formData.salary_min && { salary_min: parseFloat(formData.salary_min) }),
        ...(formData.salary_max && { salary_max: parseFloat(formData.salary_max) }),
        ...(formData.salary_frequency && { salary_frequency: formData.salary_frequency }),
        ...(formData.application_deadline && { 
          application_deadline: new Date(formData.application_deadline).toISOString()
        })
      };

      console.log('Submitting payload:', payload);

      // Make API call to backend
      const response = await axios.post('/api/register-project', payload);
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Job posted successfully! Project ID: ' + response.data.project_id 
        });
        
        // Reset form
        setFormData({
          project_description: '',
          project_skills: [],
          application_deadline: '',
          job_title: '',
          job_location: '',
          employment_type: '',
          salary_min: '',
          salary_max: '',
          salary_frequency: 'annually'
        });

        // Notify parent component
        if (onJobPosted) {
          onJobPosted(response.data.project_id);
        }
      }
    } catch (error) {
      console.error('Error posting job:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to post job. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h4 className="font-semibold text-gray-900 mb-6 text-xl">Post New Job</h4>
      
      {/* Success/Error Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Job Details Section */}
        <div className="mb-8">
          <h5 className="font-semibold text-gray-900 mb-4 text-lg">Job Details</h5>
          <p className="text-gray-600 text-sm mb-6">
            Fill in the details for your new job posting.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="mb-8">
            <h6 className="font-semibold text-gray-900 mb-4 text-base">Basic Information</h6>
            
            {/* Job Title */}
            <div className="mb-6">
              <label className="text-gray-700 text-sm font-medium block mb-2">
                Job Title
              </label>
              <input 
                type="text" 
                name="job_title"
                value={formData.job_title}
                onChange={handleInputChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="e.g., Senior Software Engineer"
              />
            </div>

            {/* Job Description - REQUIRED */}
            <div className="mb-6">
              <label className="text-gray-700 text-sm font-medium block mb-2">
                Job Description *
              </label>
              <textarea 
                rows="6"
                name="project_description"
                value={formData.project_description}
                onChange={handleInputChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Provide a detailed description of the role responsibilities and requirements."
                required
              />
              <p className="text-gray-500 text-xs mt-1">This field is required</p>
            </div>
          </div>

          <div className="border-t border-gray-200 my-8"></div>

          {/* Job Location */}
          <div className="mb-8">
            <h6 className="font-semibold text-gray-900 mb-4 text-base">Job Location</h6>
            <input 
              type="text" 
              name="job_location"
              value={formData.job_location}
              onChange={handleInputChange}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="e.g., Remote, New York, NY"
            />
          </div>

          {/* Employment & Compensation */}
          <div className="mb-8">
            <h6 className="font-semibold text-gray-900 mb-4 text-base">Employment & Compensation</h6>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              {/* Employment Type */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">
                  Employment Type
                </label>
                <select 
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select employment type</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              {/* Salary Frequency */}
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">
                  Salary Frequency
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="salary_frequency"
                      value="annually"
                      checked={formData.salary_frequency === 'annually'}
                      onChange={handleInputChange}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-gray-700 text-sm">Annually</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="salary_frequency"
                      value="monthly"
                      checked={formData.salary_frequency === 'monthly'}
                      onChange={handleInputChange}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-gray-700 text-sm">Monthly</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Salary Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">
                  Min Salary
                </label>
                <input 
                  type="number" 
                  name="salary_min"
                  value={formData.salary_min}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Min"
                />
              </div>
              <div>
                <label className="text-gray-700 text-sm font-medium block mb-2">
                  Max Salary
                </label>
                <input 
                  type="number" 
                  name="salary_max"
                  value={formData.salary_max}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* Required Skills - REQUIRED */}
          <div className="mb-8">
            <h6 className="font-semibold text-gray-900 mb-4 text-base">Required Skills *</h6>
            <p className="text-gray-600 text-sm mb-4">
              Add key skills and qualifications for this role.
            </p>
            
            {/* Skills Input */}
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.project_skills.map((skill, index) => (
                <div key={index} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-2 text-purple-500 hover:text-purple-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {formData.project_skills.length === 0 && (
              <p className="text-red-500 text-xs mb-4">At least one skill is required</p>
            )}

            <div className="flex space-x-2">
              <input 
                type="text" 
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                onKeyPress={handleSkillKeyPress}
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Type skill and press Enter or click Add"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                + Add Skill
              </button>
            </div>
          </div>

          {/* Application Deadline */}
          <div className="mb-8">
            <h6 className="font-semibold text-gray-900 mb-4 text-base">Application Deadline</h6>
            <p className="text-gray-600 text-sm mb-4">
              Set the last date for candidates to apply.
            </p>
            
            <input 
              type="datetime-local" 
              name="application_deadline"
              value={formData.application_deadline}
              onChange={handleInputChange}
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-200">
            <button 
              type="submit"
              disabled={isSubmitting || !formData.project_description || !formData.project_skills.length}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting Job...' : 'Post Job Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobPostingForm;