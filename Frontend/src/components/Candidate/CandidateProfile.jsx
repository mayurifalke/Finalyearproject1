// src/components/CandidateProfile.jsx
import React, { useState, useEffect } from 'react';

const CandidateProfile = ({ parsedResumeData, candidateId, isNewProfile, onSaveProfile, saveLoading }) => {
  const [formData, setFormData] = useState(parsedResumeData);

  // Update form data when parsedResumeData changes
  useEffect(() => {
    setFormData(parsedResumeData);
  }, [parsedResumeData]);

  if (!parsedResumeData) {
    return null;
  }

  // Handle form input changes
  const handleInputChange = (section, field, value, index = null) => {
    setFormData(prevData => {
      if (index !== null) {
        // For array fields (experience, education, etc.)
        const updatedArray = [...(prevData[section] || [])];
        if (updatedArray[index]) {
          updatedArray[index] = {
            ...updatedArray[index],
            [field]: value
          };
        }
        return {
          ...prevData,
          [section]: updatedArray
        };
      } else if (section) {
        // For nested objects
        return {
          ...prevData,
          [section]: {
            ...prevData[section],
            [field]: value
          }
        };
      } else {
        // For simple fields
        return {
          ...prevData,
          [field]: value
        };
      }
    });
  };

  // Handle adding new items to arrays
  const handleAddItem = (section, template) => {
    setFormData(prevData => ({
      ...prevData,
      [section]: [...(prevData[section] || []), template]
    }));
  };

  // Handle removing items from arrays
  const handleRemoveItem = (section, index) => {
    setFormData(prevData => ({
      ...prevData,
      [section]: (prevData[section] || []).filter((_, i) => i !== index)
    }));
  };

  // Handle skill changes
  const handleSkillsChange = (newSkills) => {
    setFormData(prevData => ({
      ...prevData,
      skills: newSkills.split(',').map(skill => skill.trim()).filter(skill => skill)
    }));
  };

  // Save profile
  const handleSave = async () => {
    const success = await onSaveProfile(formData);
    if (success) {
      // Success is handled in parent component
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h5 className="font-semibold text-gray-900 text-lg">Your Profile</h5>
          <p className="text-gray-600 text-sm">
            {isNewProfile 
              ? 'Review and edit your parsed resume data before saving' 
              : 'View and update your profile information'
            }
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveLoading}
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center space-x-2"
        >
          {saveLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>

      {isNewProfile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-yellow-700 text-sm">Review Before Saving</p>
              <p className="text-yellow-600 text-xs">Please review the parsed data and make any necessary changes before saving to database.</p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <h6 className="font-semibold text-gray-900 mb-3 text-sm">Personal Information</h6>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-600 text-xs block mb-1">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('', 'name', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="text-gray-600 text-xs block mb-1">Email</label>
            <input
              type="email"
              value={formData.mail || ''}
              onChange={(e) => handleInputChange('', 'mail', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="text-gray-600 text-xs block mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('', 'phone', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your phone number"
            />
          </div>
          <div>
            <label className="text-gray-600 text-xs block mb-1">Total Experience (Years)</label>
            <input
              type="number"
              step="0.1"
              value={formData.total_experience_years || ''}
              onChange={(e) => handleInputChange('', 'total_experience_years', parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Years of experience"
            />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h6 className="font-semibold text-gray-900 text-sm">Skills</h6>
          <button
            onClick={() => setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), ''] }))}
            className="text-blue-600 hover:text-blue-700 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
          >
            + Add Skill
          </button>
        </div>
        <div className="space-y-2">
          {formData.skills?.map((skill, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={skill}
                onChange={(e) => {
                  const newSkills = [...formData.skills];
                  newSkills[index] = e.target.value;
                  setFormData(prev => ({ ...prev, skills: newSkills }));
                }}
                className="flex-1 bg-white border border-gray-300 rounded px-3 py-1 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter skill"
              />
              <button
                onClick={() => handleRemoveItem('skills', index)}
                className="text-red-600 hover:text-red-700 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {(!formData.skills || formData.skills.length === 0) && (
          <p className="text-gray-500 text-xs italic">No skills added yet</p>
        )}
      </div>

      {/* Experience */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h6 className="font-semibold text-gray-900 text-sm">Experience</h6>
          <button
            onClick={() => handleAddItem('experience', {
              designation: '',
              company_name: '',
              start: '',
              end: '',
              description: '',
              experiance_skills: []
            })}
            className="text-blue-600 hover:text-blue-700 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
          >
            + Add Experience
          </button>
        </div>
        <div className="space-y-4">
          {formData.experience?.map((exp, index) => (
            <div key={index} className="border-l-2 border-blue-500 pl-4 relative bg-blue-50 rounded p-3">
              <button
                onClick={() => handleRemoveItem('experience', index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Designation"
                    value={exp.designation || ''}
                    onChange={(e) => handleInputChange('experience', 'designation', e.target.value, index)}
                    className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={exp.company_name || ''}
                    onChange={(e) => handleInputChange('experience', 'company_name', e.target.value, index)}
                    className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Start Date (MM/YYYY)"
                    value={exp.start || ''}
                    onChange={(e) => handleInputChange('experience', 'start', e.target.value, index)}
                    className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="End Date (MM/YYYY) or Present"
                    value={exp.end || ''}
                    onChange={(e) => handleInputChange('experience', 'end', e.target.value, index)}
                    className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={exp.description || ''}
                  onChange={(e) => handleInputChange('experience', 'description', e.target.value, index)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows="3"
                />
                <div>
                  <label className="text-gray-600 text-xs block mb-1">Skills Used</label>
                  <input
                    type="text"
                    placeholder="Skills (comma separated)"
                    value={exp.experiance_skills?.join(', ') || ''}
                    onChange={(e) => handleInputChange('experience', 'experiance_skills', e.target.value.split(',').map(s => s.trim()).filter(s => s), index)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
          {(!formData.experience || formData.experience.length === 0) && (
            <p className="text-gray-500 text-xs italic text-center py-4">No experience added yet</p>
          )}
        </div>
      </div>

      {/* Education */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h6 className="font-semibold text-gray-900 text-sm">Education</h6>
          <button
            onClick={() => handleAddItem('education', {
              qualification: '',
              name: '',
              category: '',
              start: '',
              end: ''
            })}
            className="text-blue-600 hover:text-blue-700 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
          >
            + Add Education
          </button>
        </div>
        <div className="space-y-3">
          {formData.education?.map((edu, index) => (
            <div key={index} className="relative bg-gray-50 rounded p-3">
              <button
                onClick={() => handleRemoveItem('education', index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Qualification"
                  value={edu.qualification || ''}
                  onChange={(e) => handleInputChange('education', 'qualification', e.target.value, index)}
                  className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Institution Name"
                  value={edu.name || ''}
                  onChange={(e) => handleInputChange('education', 'name', e.target.value, index)}
                  className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Category/Field"
                  value={edu.category || ''}
                  onChange={(e) => handleInputChange('education', 'category', e.target.value, index)}
                  className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g., 2020 - 2024)"
                  value={`${edu.start || ''}${edu.start && edu.end ? ' - ' : ''}${edu.end || ''}`}
                  onChange={(e) => {
                    const value = e.target.value;
                    const [start, end] = value.split(' - ');
                    handleInputChange('education', 'start', start || '', index);
                    handleInputChange('education', 'end', end || '', index);
                  }}
                  className="bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
          {(!formData.education || formData.education.length === 0) && (
            <p className="text-gray-500 text-xs italic text-center py-4">No education added yet</p>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h6 className="font-semibold text-gray-900 text-sm">Projects</h6>
          <button
            onClick={() => handleAddItem('projects', {
              title: '',
              description: '',
              project_skills: []
            })}
            className="text-blue-600 hover:text-blue-700 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
          >
            + Add Project
          </button>
        </div>
        <div className="space-y-3">
          {formData.projects?.map((project, index) => (
            <div key={index} className="border-l-2 border-green-500 pl-4 relative bg-green-50 rounded p-3">
              <button
                onClick={() => handleRemoveItem('projects', index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Project Title"
                  value={project.title || ''}
                  onChange={(e) => handleInputChange('projects', 'title', e.target.value, index)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Description"
                  value={project.description || ''}
                  onChange={(e) => handleInputChange('projects', 'description', e.target.value, index)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows="3"
                />
                <div>
                  <label className="text-gray-600 text-xs block mb-1">Technologies Used</label>
                  <input
                    type="text"
                    placeholder="Technologies (comma separated)"
                    value={project.project_skills?.join(', ') || ''}
                    onChange={(e) => handleInputChange('projects', 'project_skills', e.target.value.split(',').map(s => s.trim()).filter(s => s), index)}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
          {(!formData.projects || formData.projects.length === 0) && (
            <p className="text-gray-500 text-xs italic text-center py-4">No projects added yet</p>
          )}
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h6 className="font-semibold text-gray-900 text-sm">Certifications</h6>
          <button
            onClick={() => handleAddItem('certifications', '')}
            className="text-blue-600 hover:text-blue-700 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
          >
            + Add Certification
          </button>
        </div>
        <div className="space-y-2">
          {formData.certifications?.map((cert, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={cert}
                onChange={(e) => {
                  const newCerts = [...formData.certifications];
                  newCerts[index] = e.target.value;
                  setFormData(prev => ({ ...prev, certifications: newCerts }));
                }}
                className="flex-1 bg-white border border-gray-300 rounded px-3 py-1 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Certification name"
              />
              <button
                onClick={() => handleRemoveItem('certifications', index)}
                className="text-red-600 hover:text-red-700 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200"
              >
                Remove
              </button>
            </div>
          ))}
          {(!formData.certifications || formData.certifications.length === 0) && (
            <p className="text-gray-500 text-xs italic">No certifications added yet</p>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h6 className="font-semibold text-gray-900 text-sm">Achievements</h6>
          <button
            onClick={() => handleAddItem('achievements', '')}
            className="text-blue-600 hover:text-blue-700 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
          >
            + Add Achievement
          </button>
        </div>
        <div className="space-y-2">
          {formData.achievements?.map((achievement, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={achievement}
                onChange={(e) => {
                  const newAchievements = [...formData.achievements];
                  newAchievements[index] = e.target.value;
                  setFormData(prev => ({ ...prev, achievements: newAchievements }));
                }}
                className="flex-1 bg-white border border-gray-300 rounded px-3 py-1 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Achievement description"
              />
              <button
                onClick={() => handleRemoveItem('achievements', index)}
                className="text-red-600 hover:text-red-700 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200"
              >
                Remove
              </button>
            </div>
          ))}
          {(!formData.achievements || formData.achievements.length === 0) && (
            <p className="text-gray-500 text-xs italic">No achievements added yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;