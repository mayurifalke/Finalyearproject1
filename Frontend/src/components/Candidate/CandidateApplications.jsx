import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CandidateApplications = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        setError('');

        const response = await axios.get('/api/applications/mine', {
          withCredentials: true,
        });

        if (response.data?.success) {
          setApplications(response.data.applications || []);
        } else {
          setError(response.data?.detail || response.data?.message || 'Failed to load applications');
        }
      } catch (err) {
        console.error('Error fetching applications:', err);
        const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to load applications';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const formatStatus = (status) => {
    if (!status) return 'Applied';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'shortlisted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 text-lg">Loading your applications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
        You haven't applied to any jobs yet. Browse the <span className="font-semibold">Relevant Jobs</span> tab to find opportunities.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => {
        const details = app.project_snapshot || {};
        const createdAt = app.created_at ? new Date(app.created_at).toLocaleString() : 'Recently';

        return (
          <div
            key={app.application_id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {details.job_title || 'Untitled Job'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {details.employment_type || 'Not specified'} • {details.job_location || 'Location not specified'}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                  app.status
                )}`}
              >
                {formatStatus(app.status)}
              </span>
            </div>

            <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
              <span>Applied on {createdAt}</span>
              <span className="text-gray-500">Project ID: {app.project_id}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CandidateApplications;

