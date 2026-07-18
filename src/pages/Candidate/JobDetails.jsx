import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Briefcase, MapPin, DollarSign, Calendar, Clock,
  ArrowLeft, Bookmark, CheckCircle2, ChevronRight,
  FileText, Shield, Sparkles, Building2, ExternalLink,
  Award, Globe, Mail, Phone, Loader2, Send, X, User,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import CandidateHeader from "../../components/layout/CandidateHeader";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useAuth } from "../../context/AuthContext";
import moment from "moment";

// Currency helper
const GhsIcon = () => (
  <span className="text-sm font-extrabold text-gray-400 mr-0.5">GH₵</span>
);

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [appliedStatus, setAppliedStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Application Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeOption, setResumeOption] = useState("profile"); // profile or custom
  const [customResumeFile, setCustomResumeFile] = useState(null);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Guest applicant fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Fetch job details (public). Only fetch saved/applied status when logged in.
  useEffect(() => {
    const fetchJobDetails = async () => {
      setIsLoading(true);
      try {
        // Job details are public — always fetch
        const requests = [axiosInstance.get(API_PATHS.JOBS.GET_JOB_BY_ID(jobId))];

        // Saved & application status require authentication
        if (isAuthenticated) {
          requests.push(
            axiosInstance.get(API_PATHS.JOBS.GET_SAVED_JOBS),
            axiosInstance.get(API_PATHS.APPLICATIONS.GET_MY_APPLICATIONS)
          );
        }

        const [jobRes, savedRes, appRes] = await Promise.allSettled(requests);

        if (jobRes.status === "fulfilled") {
          setJob(jobRes.value.data);
        } else {
          toast.error("Job details could not be loaded.");
          navigate("/find-jobs");
          return;
        }

        if (savedRes && savedRes.status === "fulfilled") {
          const savedJobs = Array.isArray(savedRes.value.data) ? savedRes.value.data : [];
          const savedIds = savedJobs.map((item) => item.job?._id || item.job);
          setIsSaved(savedIds.includes(jobId));
        }

        if (appRes && appRes.status === "fulfilled") {
          const apps = Array.isArray(appRes.value.data) ? appRes.value.data : [];
          const matchingApp = apps.find((app) => (app.job?._id || app.job) === jobId);
          if (matchingApp) {
            setAppliedStatus(matchingApp.status);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId, navigate, isAuthenticated]);

  // Toggle Save Job — requires authentication
  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/job/${jobId}` } } });
      return;
    }
    if (isActionLoading) return;
    setIsActionLoading(true);

    try {
      if (isSaved) {
        await axiosInstance.delete(API_PATHS.JOBS.UNSAVE_JOB(jobId));
        setIsSaved(false);
        toast.success("Job removed from bookmarks");
      } else {
        await axiosInstance.post(API_PATHS.JOBS.SAVE_JOB(jobId));
        setIsSaved(true);
        toast.success("Job bookmarked successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update bookmark");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open apply modal — always opens, no login redirect
  const handleApplyClick = () => {
    // Reset guest fields when opening the modal
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setCoverLetter("");
    setCustomResumeFile(null);
    setResumeOption(isAuthenticated ? "profile" : "custom");
    setShowApplyModal(true);
  };

  // Submit Application
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingApp) return;

    // ── Validation ──────────────────────────────────────────────────
    if (!isAuthenticated) {
      // Guest validation
      if (!guestName.trim()) {
        toast.error("Please enter your full name.");
        return;
      }
      if (!guestEmail.trim()) {
        toast.error("Please enter your email address.");
        return;
      }
      // Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail.trim())) {
        toast.error("Please enter a valid email address.");
        return;
      }
      if (!customResumeFile) {
        toast.error("Please upload your resume.");
        return;
      }
    } else {
      // Logged-in validation
      if (resumeOption === "profile" && !user?.resume) {
        toast.error("You don't have a profile resume. Please upload one or select a custom file.");
        return;
      }
      if (resumeOption === "custom" && !customResumeFile) {
        toast.error("Please select a resume file.");
        return;
      }
    }

    setIsSubmittingApp(true);
    const id = toast.loading("Submitting application…");

    try {
      const formData = new FormData();
      formData.append("coverLetter", coverLetter);

      if (!isAuthenticated) {
        // Guest fields
        formData.append("guestName", guestName.trim());
        formData.append("guestEmail", guestEmail.trim().toLowerCase());
        formData.append("guestPhone", guestPhone.trim());
        formData.append("resume", customResumeFile);
      } else {
        // Logged-in user
        if (resumeOption === "custom") {
          formData.append("resume", customResumeFile);
        } else {
          formData.append("resume", user?.resume);
        }
      }

      await axiosInstance.post(API_PATHS.APPLICATIONS.APPLY_FOR_JOB(jobId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.dismiss(id);
      toast.success("Application submitted successfully!");
      setAppliedStatus("Applied");
      setShowApplyModal(false);
      setCoverLetter("");
      setCustomResumeFile(null);
      setGuestName("");
      setGuestEmail("");
      setGuestPhone("");
    } catch (err) {
      toast.dismiss(id);
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit application.");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CandidateHeader />
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-gray-400">Loading job details…</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const hasLogo = !!(job.companyLogo || job.company?.companyLogo);
  const logoUrl = job.companyLogo || job.company?.companyLogo;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <CandidateHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation row */}
        <div>
          <button
            onClick={() => navigate("/find-jobs")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition group"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to Job Listings
          </button>
        </div>

        {/* ── Header details card ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Company Logo */}
              <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 shadow-xs">
                {hasLogo ? (
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-400" />
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                <p className="mt-1 text-sm font-semibold text-indigo-600">
                  {job.company?.companyName || job.company?.name || "SPG Company"}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.type}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Posted {moment(job.createdAt).fromNow()}</span>
                </div>
              </div>
            </div>

            {/* Actions: Save & Apply */}
            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-center">
              <button
                disabled={isActionLoading}
                onClick={handleToggleSave}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                  isSaved
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100/50"
                    : "bg-white border-gray-200 text-gray-400 hover:border-indigo-200 hover:bg-indigo-50/20 hover:text-indigo-600"
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
              </button>

              {appliedStatus ? (
                <div className="flex-1 sm:flex-initial text-center rounded-xl bg-emerald-50 border border-emerald-250 px-6 py-2.5 text-sm font-bold text-emerald-700">
                  Application: {appliedStatus}
                </div>
              ) : (
                <button
                  onClick={handleApplyClick}
                  className="flex-1 sm:flex-initial rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:scale-[1.02] active:scale-100"
                >
                  Apply for Job
                </button>
              )}
            </div>
          </div>

          {/* Highlights Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-50 pt-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <DollarSign className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Salary Monthly</p>
                <p className="text-sm font-bold text-gray-800 flex items-center">
                  <GhsIcon />
                  {job.salaryMin ? `${Math.round(job.salaryMin / 1000)}k` : "Open"}
                  {job.salaryMax && ` - GH₵${Math.round(job.salaryMax / 1000)}k`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Award className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Category</p>
                <p className="text-sm font-bold text-gray-800 capitalize">{job.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Shield className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status</p>
                <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Accepting Candidates
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content grid: details + sidebar ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Details (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Job Description</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Requirements */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Requirements</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
            </div>
          </div>

          {/* Sidebar: Company details (Right 1 col) */}
          <div className="space-y-6">
            
            {/* About Company Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-gray-900">About the Company</h3>
              
              <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {hasLogo ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-full w-full object-cover rounded-xl"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 line-clamp-1">
                    {job.company?.companyName || job.company?.name || "SPG User"}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                    Verified Employer
                  </span>
                </div>
              </div>

              {job.company?.companyDescription ? (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-6">
                  {job.company.companyDescription}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">No description added by the company.</p>
              )}
            </div>

            {/* Safety Tips Card */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
              <div className="flex items-center gap-2 mb-2.5">
                <Shield className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">Job Safety Tips</p>
              </div>
              <ul className="space-y-2 text-xs text-amber-700 list-disc list-inside">
                <li>Never send money to recruiters.</li>
                <li>Avoid sharing highly personal information like bank details.</li>
                <li>Report suspicious job postings to our help center.</li>
              </ul>
            </div>

          </div>
        </div>
      </main>

      {/* ── Apply Modal ─────────────────────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Apply to {job.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isAuthenticated
                    ? "Submit your application documents"
                    : "Fill in your details to apply — no account required"}
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleApplySubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">

              {/* ── Guest Info Fields (only when not logged in) ──────────── */}
              {!isAuthenticated && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 px-4 py-3 flex items-start gap-3">
                    <User className="h-4.5 w-4.5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-indigo-800">Applying as a Guest</p>
                      <p className="text-[11px] text-indigo-600/80 mt-0.5">
                        No account needed. Just fill in your details below.
                      </p>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Kwame Asante"
                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                      />
                    </div>
                  </div>

                  {/* Phone (optional) */}
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+233 24 000 0000"
                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Resume Section ──────────────────────────────────────── */}
              {isAuthenticated ? (
                /* Logged-in: Resume option toggle */
                <div className="space-y-2.5">
                  <label className="text-sm font-bold text-gray-700">Resume / CV Option</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setResumeOption("profile")}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border-2 text-xs font-bold transition ${
                        resumeOption === "profile"
                          ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-xs"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600"
                      }`}
                    >
                      <User className="h-4.5 w-4.5" />
                      Use Profile Resume
                    </button>

                    <button
                      type="button"
                      onClick={() => setResumeOption("custom")}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border-2 text-xs font-bold transition ${
                        resumeOption === "custom"
                          ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-xs"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600"
                      }`}
                    >
                      <FileText className="h-4.5 w-4.5" />
                      Upload Custom Resume
                    </button>
                  </div>

                  {/* Resume Selection display */}
                  {resumeOption === "profile" ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-3.5 flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        {user?.resume ? (
                          <>
                            <p className="text-xs font-bold text-gray-800">Default Profile Resume</p>
                            <p className="text-[10px] text-gray-400 truncate break-all">{user.resume}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-red-600">No Profile Resume Found</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Please choose "Upload Custom" or add it in profile first.</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setCustomResumeFile(e.target.files?.[0])}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                      <p className="text-[10px] text-gray-400 mt-2">Only PDF files are accepted (Max 10 MB)</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Guest: Upload only (no profile resume) */
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Resume / CV <span className="text-red-500">*</span>
                  </label>
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setCustomResumeFile(e.target.files?.[0])}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-400 mt-2">Only PDF files are accepted (Max 10 MB)</p>
                  </div>
                  {customResumeFile && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700 truncate">{customResumeFile.name}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cover Letter Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Cover Letter (Optional)</label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={5}
                  placeholder="Introduce yourself to the hiring manager and explain why you're a great fit for this job…"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                />
              </div>

              {/* ── Optional Account Prompt (guest only) ─────────────────── */}
              {!isAuthenticated && (
                <div className="rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-indigo-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">
                      Want to track your applications?{" "}
                      <Link
                        to="/signup"
                        className="font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 transition"
                      >
                        Create a free account
                      </Link>
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons inside Modal */}
              <div className="flex gap-3 justify-end border-t border-gray-50 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  disabled={isSubmittingApp}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:scale-[1.02] active:scale-100 flex items-center gap-1.5 disabled:opacity-75 disabled:scale-100"
                >
                  {isSubmittingApp ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;