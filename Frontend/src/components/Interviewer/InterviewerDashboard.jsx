import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import JobPostingForm from './JobPostingForm';
import JobPostings from './JobPostings';

const InterviewerDashboard = () => {
  const { user, backendUser, logout, isLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Get username from backend data
  const getUserName = () => {
    if (backendUser?.username) return backendUser.username;
    if (backendUser?.email) return backendUser.email.split('@')[0];
    if (user?.username) return user.username;
    if (user?.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.split('@')[0];
    }
    return 'interviewer';
  };

  const getUserDisplayName = () => {
    if (backendUser?.full_name) return backendUser.full_name;
    if (backendUser?.first_name || backendUser?.last_name) {
      return `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim();
    }
    if (user?.fullName) return user.fullName;
    return getUserName();
  };

  // Mock data for dashboard stats
  const dashboardStats = {
    interviewsToday: 5,
    totalCandidates: 47,
    pendingReviews: 12
  };

  // Handle successful job posting
  const handleJobPosted = (projectId) => {
    console.log('Job posted successfully with ID:', projectId);
    // You can add additional logic here like showing a toast notification
    // or automatically switching to the job postings tab
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, <span className="text-purple-600">{username}</span>
              </h1>
              <p className="text-gray-600 mt-1 text-base">
                Manage interviews and evaluate candidate profiles
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-base font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {displayName}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Senior Interviewer
                  </p>
                  <p className="text-purple-600 text-sm mt-1">
                    Technical Hiring Team
                  </p>
                  <p className="text-green-600 text-sm mt-1">✓ Active</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-4 text-lg">Interview Panel</h4>
              <nav className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { id: 'interviews', label: 'Interviews', icon: '🎯' },
                  { id: 'postnewjob', label: 'Post New Job', icon: '💼' },
                  { id: 'jobpostings', label: 'Job Postings', icon: '📋' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 text-base ${
                      activeTab === item.id
                        ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">Quick Actions</h4>
              <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                <h5 className="font-semibold text-gray-900 mb-2 text-base">Start New Interview</h5>
                <p className="text-purple-700 text-sm mb-2 font-medium">
                  AI-Powered Assessment
                </p>
                <p className="text-purple-600 text-sm mb-4 leading-relaxed">
                  Conduct structured interviews with AI assistance
                </p>
                <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium text-base">
                  Start Interview
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Dashboard Tab Content */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Performance Stats */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-900 text-lg">Interview Panel</h4>
                    <button 
                      onClick={() => setActiveTab('postnewjob')}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-base font-medium flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Job Posting</span>
                    </button>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                    <h5 className="font-semibold text-gray-900 mb-4 text-base">Today's Overview</h5>
                    <p className="text-gray-600 text-sm mb-6">Performance metrics</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {dashboardStats.interviewsToday}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">Interviews Today</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {dashboardStats.totalCandidates}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">Total Job Postings</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="text-2xl font-bold text-orange-600 mb-2">
                          {dashboardStats.pendingReviews}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">Active Jobs</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upcoming Interviews */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-900 text-lg">Reviewer</h4>
                    <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-base font-medium flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Schedule Interview</span>
                    </button>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                    <h5 className="font-semibold text-gray-900 mb-2 text-base">
                      Upcoming Interviews
                    </h5>
                    <p className="text-gray-600 text-sm mb-6">
                      Manage your scheduled interview sessions
                    </p>

                    <div className="space-y-4">
                      {/* Interview Card 1 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h6 className="font-semibold text-gray-900 text-base">Frontend Developer Role</h6>
                            <p className="text-gray-600 text-sm">Candidate: John Smith</p>
                            <p className="text-purple-600 text-sm mt-1">⏰ 10:00 AM - 11:00 AM</p>
                          </div>
                          <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full font-medium">
                            Confirmed
                          </span>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded text-sm hover:from-purple-600 hover:to-purple-700 transition-colors">
                            View Profile
                          </button>
                          <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded text-sm hover:from-purple-600 hover:to-purple-700 transition-colors">
                            Start Interview
                          </button>
                        </div>
                      </div>

                      {/* Interview Card 2 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h6 className="font-semibold text-gray-900 text-base">Backend Engineer</h6>
                            <p className="text-gray-600 text-sm">Candidate: Sarah Johnson</p>
                            <p className="text-purple-600 text-sm mt-1">⏰ 2:00 PM - 3:00 PM</p>
                          </div>
                          <span className="bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded-full font-medium">
                            Pending
                          </span>
                        </div>
                        <div className="flex space-x-2 mt-3">
                          <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded text-sm hover:from-purple-600 hover:to-purple-700 transition-colors">
                            View Profile
                          </button>
                          <button className="bg-gray-300 text-gray-600 px-3 py-1 rounded text-sm cursor-not-allowed">
                            Start in 4h
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Information */}
                <div className="bg-purple-50 rounded-xl border border-purple-200 p-5">
                  <h3 className="font-semibold text-purple-700 mb-2 text-base">Session Information</h3>
                  <p className="text-purple-600 text-sm">
                    • Secure interviewer session with role-based access
                  </p>
                  <p className="text-purple-600 text-sm mt-1">
                    • Real-time candidate evaluation system
                  </p>
                  <p className="text-purple-600 text-sm mt-1">
                    • AI-powered interview assistance available
                  </p>
                </div>
              </div>
            )}

            {/* Post New Job Tab Content */}
            {activeTab === 'postnewjob' && (
              <JobPostingForm onJobPosted={handleJobPosted} />
            )}

            {/* Job Postings Tab Content */}
            {activeTab === 'jobpostings' && (
              <JobPostings />
            )}

            {/* Interviews Tab Content */}
            {activeTab === 'interviews' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">Interviews</h4>
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-100 text-center py-12">
                  <p className="text-gray-600 text-lg">
                    Interview Management section coming soon...
                  </p>
                </div>
              </div>
            )}

            {/* Other Tabs Placeholder */}
            {activeTab !== 'dashboard' && activeTab !== 'interviews' && activeTab !== 'postnewjob' && activeTab !== 'jobpostings' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h4>
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-100 text-center py-12">
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

export default InterviewerDashboard;