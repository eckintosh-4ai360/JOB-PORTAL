import { useEffect, useState } from "react";
import {
  Bookmark, MapPin, Briefcase, Calendar, DollarSign,
  Loader2, Trash2, ArrowRight, Clock, Star, Inbox,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import CandidateHeader from "../../components/layout/CandidateHeader";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import moment from "moment";

// Currency helper
const GhsIcon = () => (
  <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 mr-0.5">GH₵</span>
);

export const SavedJobs = () => {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnsavingId, setIsUnsavingId] = useState(null);

  // Fetch saved jobs
  const fetchSavedJobs = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(API_PATHS.JOBS.GET_SAVED_JOBS);
      // Backend returns list of SavedJob objects. Let's extract and filter open/valid jobs.
      const data = Array.isArray(res.data) ? res.data : [];
      setSavedJobs(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load saved jobs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  // Unsave Job Handler
  const handleUnsave = async (e, jobId) => {
    e.stopPropagation(); // Prevent card navigation
    if (isUnsavingId) return;

    setIsUnsavingId(jobId);
    try {
      await axiosInstance.delete(API_PATHS.JOBS.UNSAVE_JOB(jobId));
      setSavedJobs((prev) => prev.filter((item) => {
        const jId = item.job?._id || item.job;
        return jId !== jobId;
      }));
      toast.success("Job removed from bookmarks");
    } catch (err) {
      console.error(err);
      toast.error("Failed to unsave job.");
    } finally {
      setIsUnsavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-gray-950 flex flex-col">
      <CandidateHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-indigo-600 fill-current" />
            Saved Jobs
          </h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Keep track of opportunities you have bookmarked for later
          </p>
        </div>

        {/* Saved Jobs List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Loading your saved jobs list…</p>
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs px-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
              <Inbox className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No saved jobs</h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              You haven't bookmarked any jobs yet. Browse available jobs and click the bookmark icon to save them.
            </p>
            <button
              onClick={() => navigate("/find-jobs")}
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedJobs.map((item) => {
              // Handle potential populated vs unpopulated fields
              const job = item.job || {};
              const jobId = job._id || job;
              const hasLogo = !!(job.companyLogo || job.company?.companyLogo);
              const logoUrl = job.companyLogo || job.company?.companyLogo;

              if (!job.title) return null; // Skip if job details were deleted on backend

              return (
                <div
                  key={item._id}
                  onClick={() => navigate(`/job/${jobId}`)}
                  className="group flex flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer relative overflow-hidden"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      {/* Logo */}
                      <div className="h-11 w-11 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center border border-slate-100 dark:border-gray-700 shrink-0">
                        {hasLogo ? (
                          <img
                            src={logoUrl}
                            alt="Logo"
                            className="h-full w-full object-cover rounded-xl"
                          />
                        ) : (
                          <Briefcase className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 transition-colors text-base line-clamp-1">
                          {job.title}
                        </h3>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                          {job.company?.companyName || job.company?.name || "SPG Member"}
                        </p>
                      </div>
                    </div>

                    {/* Unsave button */}
                    <button
                      disabled={isUnsavingId === jobId}
                      onClick={(e) => handleUnsave(e, jobId)}
                      className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border bg-indigo-50 border-indigo-150 text-indigo-600 hover:bg-red-50 hover:border-red-150 hover:text-red-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 dark:hover:text-red-400 transition"
                      title="Remove Bookmark"
                    >
                      {isUnsavingId === jobId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50/50 border border-indigo-100/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400">
                      <Clock className="h-3 w-3" />
                      {job.type}
                    </span>
                  </div>

                  {/* Salary & Action button */}
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-gray-800 pt-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Salary Range</p>
                      <div className="flex items-center mt-0.5">
                        <GhsIcon />
                        <span className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                          {job.salaryMin ? `${Math.round(job.salaryMin / 1000)}k` : "Open"}
                        </span>
                        {(job.salaryMin && job.salaryMax) && (
                          <>
                            <span className="mx-1 text-gray-400 dark:text-gray-500 text-xs">-</span>
                            <GhsIcon />
                            <span className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                              {`${Math.round(job.salaryMax / 1000)}k`}
                            </span>
                          </>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">/mo</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/job/${jobId}`)}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
};

export default SavedJobs;