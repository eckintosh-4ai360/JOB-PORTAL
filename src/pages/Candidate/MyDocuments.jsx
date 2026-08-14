import { useState, useRef, useEffect } from "react";
import {
  FileText, Upload, Eye, Download, Trash2, Loader2,
  Inbox, Info, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import moment from "moment";
import CandidateHeader from "../../components/layout/CandidateHeader";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useAuth } from "../../context/AuthContext";

const CATEGORIES = ["Resume", "Cover Letter", "Certificate", "ID Document", "Other"];

const CATEGORY_STYLES = {
  Resume: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "Cover Letter": "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Certificate: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "ID Document": "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  Other: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/jpg", "image/png",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MyDocuments = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [category, setCategory] = useState("Resume");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get(API_PATHS.DOCUMENTS.GET_DOCUMENTS);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast.error("Failed to load your documents.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PDF, DOC, DOCX, JPEG, or PNG files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File must be under 10 MB.");
      return;
    }

    setIsUploading(true);
    const id = toast.loading("Uploading document…");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("category", category);

      const res = await axiosInstance.post(API_PATHS.DOCUMENTS.UPLOAD_DOCUMENT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDocuments(res.data?.documents || []);
      updateUser({ documents: res.data?.documents || [], resume: res.data?.resume ?? user?.resume });
      toast.dismiss(id);
      toast.success("Document uploaded!");
    } catch (err) {
      toast.dismiss(id);
      console.error(err);
      toast.error("Document upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;

    setDeletingId(doc._id);
    const id = toast.loading("Deleting document…");

    try {
      const res = await axiosInstance.delete(API_PATHS.DOCUMENTS.DELETE_DOCUMENT(doc._id));
      setDocuments(res.data?.documents || []);
      updateUser({ documents: res.data?.documents || [], resume: res.data?.resume ?? "" });
      toast.dismiss(id);
      toast.success("Document deleted.");
    } catch (err) {
      toast.dismiss(id);
      console.error(err);
      toast.error("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <CandidateHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <p className="mt-1 text-sm text-gray-400">
            Upload your CV and other documents once, then reuse them across job applications.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
          <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 leading-relaxed">
            Documents marked <span className="font-bold">Resume</span> are automatically used for
            1-click Apply on job listings.
          </p>
        </div>

        {/* Upload Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Upload className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Upload a Document</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative sm:w-56">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-900 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 px-4 py-3 text-sm font-semibold text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? "Uploading…" : "Choose File to Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">PDF, DOC, DOCX, JPEG, or PNG — max 10 MB.</p>
        </div>

        {/* Documents List */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Your Documents</h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-500">No documents uploaded yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Upload your resume and other files above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...documents]
                .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
                .map((doc) => (
                  <div
                    key={doc._id}
                    className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-gray-100 bg-slate-50/40 p-4 text-center sm:text-left"
                  >
                    <div className="h-11 w-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[220px]">{doc.name}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_STYLES[doc.category] || CATEGORY_STYLES.Other}`}>
                          {doc.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatSize(doc.size)} • Uploaded {moment(doc.uploadedAt).fromNow()}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 shadow-sm transition"
                        title="View"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </a>
                      <a
                        href={doc.url}
                        download
                        className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 shadow-sm transition"
                        title="Download"
                      >
                        <Download className="h-4.5 w-4.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc._id}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-100 hover:bg-red-50/50 shadow-sm transition"
                        title="Delete"
                      >
                        {deletingId === doc._id ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default MyDocuments;
