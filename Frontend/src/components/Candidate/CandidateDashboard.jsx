import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import CandidateProfile from './CandidateProfile';
import RelevantProjects from './RelevantProjects';
import CandidateApplications from './CandidateApplications';

const CandidateDashboard = () => {
  const { user, backendUser, logout, isLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [candidateId, setCandidateId] = useState(null);
  const [tempParsedData, setTempParsedData] = useState(null);

  // Load profile data on component mount
  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.id) return;

    setProfileLoading(true);
    try {
      const storedCandidateId = localStorage.getItem(`candidate_id_${user.id}`);

      // First try using stored candidate_id if we have it
      if (storedCandidateId) {
        setCandidateId(storedCandidateId);

        const response = await fetch(`/api/candidate-get/${storedCandidateId}`);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.candidate) {
            setParsedResumeData(result.candidate);
            setResumeUploaded(true);
            console.log('Loaded profile from MongoDB using stored candidate_id:', result.candidate);
            return;
          }
        } else {
          console.log('Failed to fetch candidate data with stored ID, clearing localStorage');
          localStorage.removeItem(`candidate_id_${user.id}`);
        }
      }

      // Fallback: fetch candidate based on JWT user_id from backend
      console.log('No stored candidate_id found. Trying /api/candidate/me ...');
      const meResponse = await fetch('/api/candidate/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (meResponse.ok) {
        const meResult = await meResponse.json();
        if (meResult.success && meResult.candidate) {
          const idFromBackend = meResult.candidate._id;
          setCandidateId(idFromBackend);
          setParsedResumeData(meResult.candidate);
          setResumeUploaded(true);

          if (user?.id && idFromBackend) {
            localStorage.setItem(`candidate_id_${user.id}`, idFromBackend);
          }

          console.log('Loaded profile via /api/candidate/me:', meResult.candidate);
          return;
        }
      } else if (meResponse.status !== 404) {
        // 404 just means no profile yet; other errors log for debugging
        console.log('Failed to fetch candidate via /api/candidate/me:', meResponse.status);
      }

      console.log('No existing profile found for this user');

    } catch (error) {
      console.log('Error loading profile:', error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Get username from backend data
  const getUserName = () => {
    if (backendUser?.username) return backendUser.username;
    if (backendUser?.email) return backendUser.email.split('@')[0];
    if (user?.username) return user.username;
    if (user?.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.split('@')[0];
    }
    return 'candidate';
  };

  const getUserDisplayName = () => {
    if (parsedResumeData?.name) return parsedResumeData.name;
    if (tempParsedData?.name) return tempParsedData.name;
    if (backendUser?.full_name) return backendUser.full_name;
    if (backendUser?.first_name || backendUser?.last_name) {
      return `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim();
    }
    if (user?.fullName) return user.fullName;
    return getUserName();
  };

  // Handle resume upload and parsing
  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['.pdf'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validTypes.includes(fileExtension)) {
      alert('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 Uploading resume for parsing...', file.name);

      const parseResponse = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Parse response status:', parseResponse.status);

      if (!parseResponse.ok) {
        const errorText = await parseResponse.text();
        throw new Error(`Parse failed: ${parseResponse.status} - ${errorText}`);
      }

      const parseResult = await parseResponse.json();
      console.log('✅ Resume parsed successfully:', parseResult);

      if (!parseResult.success) {
        throw new Error(parseResult.message || 'Failed to parse resume');
      }

      // Store the parsed data temporarily and navigate to profile tab
      setTempParsedData(parseResult.data);
      setActiveTab('profile');
      console.log(' Resume parsed successfully! Navigate to Profile tab to review and save.');

    } catch (error) {
      console.error('❌ Resume upload error:', error);
      alert(`Failed to process resume: ${error.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle saving NEW profile to database (calls register-json)
  // Handle saving NEW profile to database (calls register-json)
  const handleSaveNewProfile = async (profileData) => {
    setUploadLoading(true);

    try {
      console.log('📤 Saving NEW profile to database...');

      // Get the user_id from backendUser (which comes from JWT)
      const user_id = backendUser?.id;

      if (!user_id) {
        throw new Error("User ID not found. Please log in again.");
      }

      // Add user_id to the profile data
      const profileDataWithUserId = {
        ...profileData,
        user_id: user_id
      };

      console.log('🔍 Sending profile data with user_id:', user_id);

      // Register the profile data in MongoDB and Pinecone
      const registerResponse = await fetch('/api/register-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileDataWithUserId),
      });

      console.log('📥 Register response status:', registerResponse.status);

      if (!registerResponse.ok) {
        let errorMessage = `Registration failed: ${registerResponse.status} ${registerResponse.statusText}`;
        try {
          const errorData = await registerResponse.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          const errorText = await registerResponse.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const registerResult = await registerResponse.json();
      console.log('✅ Profile saved successfully:', registerResult);

      if (registerResult.success) {
        // Store candidate ID for future retrieval
        const newCandidateId = registerResult.candidate_id;
        setCandidateId(newCandidateId);

        // Store in localStorage for persistence
        if (user?.id) {
          localStorage.setItem(`candidate_id_${user.id}`, newCandidateId);
        }

        // Now fetch the complete candidate data from MongoDB
        const candidateResponse = await fetch(`/api/candidate-get/${newCandidateId}`);
        if (candidateResponse.ok) {
          const candidateResult = await candidateResponse.json();
          if (candidateResult.success) {
            setParsedResumeData(candidateResult.candidate);
            setResumeUploaded(true);
            setTempParsedData(null); // Clear temporary data
            console.log(' Loaded complete candidate data from MongoDB');
          }
        }

        console.log(' Profile saved permanently!');
        return true;
      } else {
        throw new Error(registerResult.message || 'Failed to save profile');
      }

    } catch (error) {
      console.error('❌ Profile save error:', error);
      alert(`Failed to save profile: ${error.message}`);
      return false;
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle updating EXISTING profile (calls PUT /candidate/{candidate_id})
  const handleUpdateProfile = async (profileData) => {
    setUploadLoading(true);

    try {
      console.log('📤 Updating existing profile...');

      const updateResponse = await fetch(`/api/candidate-put/${candidateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!updateResponse.ok) {
        let errorMessage = `Update failed: ${updateResponse.status} ${updateResponse.statusText}`;
        try {
          const errorData = await updateResponse.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          const errorText = await updateResponse.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const updateResult = await updateResponse.json();

      if (updateResult.success) {
        // Refresh the candidate data
        const candidateResponse = await fetch(`/api/candidate-get/${candidateId}`);
        if (candidateResponse.ok) {
          const candidateResult = await candidateResponse.json();
          if (candidateResult.success) {
            setParsedResumeData(candidateResult.candidate);
            console.log('✅ Profile updated successfully');
            return true;
          }
        }
      } else {
        throw new Error(updateResult.message || 'Failed to update profile');
      }

    } catch (error) {
      console.error('❌ Profile update error:', error);
      alert(`Failed to update profile: ${error.message}`);
      return false;
    } finally {
      setUploadLoading(false);
    }
  };

  // Mock data for dashboard stats
  const dashboardStats = {
    profileComplete: parsedResumeData ? 95 : 65,
    applications: 12,
    interviews: 3
  };

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-700 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const username = getUserName();
  const displayName = getUserDisplayName();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome <span className="text-blue-600">{username}</span>
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                Track your progress and manage your interview opportunities
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {displayName}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {parsedResumeData?.experience?.[0]?.designation || tempParsedData?.experience?.[0]?.designation || 'Web Developer'}
                  </p>
                  {(parsedResumeData?.total_experience_years || tempParsedData?.total_experience_years) && (
                    <p className="text-blue-600 text-xs mt-1">
                      {parsedResumeData?.total_experience_years || tempParsedData?.total_experience_years} years experience
                    </p>
                  )}
                  {resumeUploaded && (
                    <p className="text-green-600 text-xs mt-1">✓ Profile Complete</p>
                  )}
                  {tempParsedData && !resumeUploaded && (
                    <p className="text-yellow-600 text-xs mt-1">✎ Draft Ready</p>
                  )}
                  {candidateId && (
                    <p className="text-gray-500 text-xs mt-1">ID: {candidateId.slice(0, 8)}...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-4 text-lg">Tasker</h4>
              <nav className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'profile', label: 'Profile' },
                  { id: 'relevantjobs', label: 'Relevant Jobs' },
                  { id: 'interviews', label: 'Interviews' },
                  { id: 'applications', label: 'Applications' },
                  { id: 'settings', label: 'Settings' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Mock Interview Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">Tasker</h4>
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <h5 className="font-semibold text-gray-900 mb-2 text-base">Mock Interview</h5>
                <p className="text-blue-700 text-sm mb-2 font-medium">
                  Practice with AI
                </p>
                <p className="text-blue-600 text-xs mb-4 leading-relaxed">
                  Test your skills with our AI-powered mock interview system
                </p>
                <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium text-sm">
                  Start Interview
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Dashboard Tab Content */}
            {activeTab === 'dashboard' && (
              <>
                {/* Progress Stats */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">Tasker</h4>
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h5 className="font-semibold text-gray-900 mb-4 text-base">Your Progress</h5>
                    <p className="text-gray-600 text-sm mb-6">Performance metrics</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          {dashboardStats.profileComplete}%
                        </div>
                        <div className="text-gray-600 text-sm font-medium">Profile Complete</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {dashboardStats.applications}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">Applications</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {dashboardStats.interviews}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">Interviews</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resume Management */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">Reviewer</h4>
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h5 className="font-semibold text-gray-900 mb-2 text-base">
                      {resumeUploaded ? 'Your Profile' : 'Resume Management'}
                    </h5>
                    <p className="text-gray-600 text-sm mb-6">
                      {resumeUploaded
                        ? 'Your complete profile stored in MongoDB & Pinecone'
                        : 'Upload your resume to create your profile'
                      }
                    </p>

                    {!resumeUploaded ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                        <div className="max-w-md mx-auto">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="mt-2">
                            <label htmlFor="resume-upload" className="cursor-pointer">
                              <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium text-sm">
                                {uploadLoading ? 'Processing...' : 'Upload Resume'}
                              </span>
                              <input
                                id="resume-upload"
                                name="resume-upload"
                                type="file"
                                className="sr-only"
                                accept=".pdf"
                                onChange={handleResumeUpload}
                                disabled={uploadLoading}
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-3">
                              PDF files only, up to 10MB
                            </p>
                            {uploadLoading && (
                              <div className="mt-4">
                                <p className="text-blue-600 text-xs">Parsing resume...</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-semibold text-green-700 text-sm">Profile Complete!</p>
                                <p className="text-green-600 text-xs">Your profile is permanently stored</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('profile')}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all duration-200 font-medium text-sm ml-4"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Information */}
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                  <h3 className="font-semibold text-blue-700 mb-2 text-sm">Session Information</h3>
                  <p className="text-blue-600 text-xs">
                    • Upload resume to parse and review data before saving
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    • Data will be stored permanently only after you click "Save Changes"
                  </p>
                  {candidateId && (
                    <p className="text-blue-600 text-xs mt-1">
                      • Candidate ID: {candidateId}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">Profile</h4>
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  {resumeUploaded || tempParsedData ? (
                    <CandidateProfile
                      parsedResumeData={parsedResumeData || tempParsedData}
                      candidateId={candidateId}
                      isNewProfile={!resumeUploaded && tempParsedData}
                      onSaveProfile={resumeUploaded ? handleUpdateProfile : handleSaveNewProfile}
                      saveLoading={uploadLoading}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Found</h3>
                      <p className="text-gray-600 mb-4">Please upload your resume first to create your profile</p>
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'relevantjobs' && (
              <RelevantProjects />
            )}

            {activeTab === 'applications' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">My Applications</h4>
                <CandidateApplications />
              </div>
            )}

            {/* Other Tabs Placeholder */}
            {activeTab !== 'dashboard' && activeTab !== 'profile' && activeTab !== 'relevantjobs' && activeTab !== 'applications' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h4>
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-center py-12">
                  <p className="text-gray-600 text-lg">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section coming soon...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;