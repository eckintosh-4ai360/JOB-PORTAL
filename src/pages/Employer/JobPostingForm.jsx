import { useState } from "react";
import {
  Briefcase, MapPin, Users, FileText,
  Send, Eye, AlertCircle, Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/layout/dashboardLayout";
import { InputField, SelectField, TextAreaField } from "../../components/input/InputField";
import { LocationPicker } from "../../components/input/LocationPicker";
import JobPostingPreview from "../../components/cards/JobPostingPreview";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";

//  Static option lists 
const CATEGORY_OPTIONS = [
  { value: "technology",    label: "Technology & Software" },
  { value: "design",        label: "Design & Creative" },
  { value: "marketing",     label: "Marketing & Sales" },
  { value: "finance",       label: "Finance & Accounting" },
  { value: "healthcare",    label: "Healthcare & Medical" },
  { value: "education",     label: "Education & Training" },
  { value: "engineering",   label: "Engineering" },
  { value: "operations",    label: "Operations & Logistics" },
  { value: "hr",            label: "Human Resources" },
  { value: "other",         label: "Other" },
];

// Values MUST match the backend enum exactly (title-case)
const JOB_TYPE_OPTIONS = [
  { value: "Full-Time",   label: "Full-Time" },
  { value: "Part-Time",   label: "Part-Time" },
  { value: "Contract",    label: "Contract" },
  { value: "Internship",  label: "Internship" },
  { value: "Remote",      label: "Remote" },
  { value: "Other",       label: "Other" },
];

//  Initial form state ─
const INITIAL_FORM = {
  title:          "",
  location:       "",
  latitude:       null,
  longitude:      null,
  category:       "",
  customCategory: "",
  jobType:        "",
  customJobType:  "",
  description:    "",
  requirements:   "",
  salaryMin:      "",
  salaryMax:      "",
  deadline:       "",
};

//  Section wrapper ─
const FormSection = ({ title, children }) => (
  <div className="space-y-5">
    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
      {title}
    </h2>
    {children}
  </div>
);

//  GHS currency badge (used as icon prop in InputField) 
const GhsIcon = () => (
  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 leading-none">GH₵</span>
);

//  Divider
const Divider = () => <div className="h-px bg-gray-100 dark:bg-gray-800" />;

//  Main component 
const JobPostingForm = () => {
  const navigate = useNavigate();

  const [form, setForm]       = useState(INITIAL_FORM);
  const [errors, setErrors]   = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);

  //  Generic change handler 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  //  Validation 
  const validate = () => {
    const newErrors = {};
    if (!form.title.trim())        newErrors.title        = "Job title is required.";
    if (!form.location.trim())     newErrors.location     = "Location is required.";
    if (!form.category)            newErrors.category     = "Please select a category.";
    if (form.category === "other" && !form.customCategory.trim())
      newErrors.customCategory = "Please specify your category.";
    if (!form.jobType)             newErrors.jobType      = "Please select a job type.";
    if (form.jobType === "Other" && !form.customJobType.trim())
      newErrors.customJobType = "Please specify the job type.";
    if (!form.description.trim())  newErrors.description  = "Job description is required.";
    if (!form.requirements.trim()) newErrors.requirements = "Requirements are required.";
    if (form.salaryMin && form.salaryMax) {
      if (Number(form.salaryMin) > Number(form.salaryMax)) {
        newErrors.salaryMin = "Min salary cannot exceed max salary.";
      }
    }
    return newErrors;
  };

  //  Submit ─
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setIsSubmitting(true);
      // Map form fields → schema fields
      // DB: `type` (required, title-case enum), `salaryMin`, `salaryMax` (flat numbers)
      const payload = {
        title:          form.title,
        description:    form.description,
        requirements:   form.requirements,
        location:       form.location,
        latitude:       form.latitude || undefined,
        longitude:      form.longitude || undefined,
        category:       form.category,
        customCategory: form.category === "other" ? form.customCategory : undefined,
        type:           form.jobType,          // ← schema field is "type"
        customJobType:  form.jobType === "Other" ? form.customJobType : undefined,
        salaryMin:      Number(form.salaryMin) || undefined,
        salaryMax:      Number(form.salaryMax) || undefined,
        deadline:       form.deadline || undefined,
      };
      await axiosInstance.post(API_PATHS.JOBS.POST_JOB, payload);
      toast.success("Job posted successfully!");
      navigate("/employer-dashboard");
    } catch (error) {
      const msg = error?.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <DashboardLayout activeMenu="post-job">
      {/*  Preview overlay  */}
      {preview && (
        <JobPostingPreview
          form={form}
          onClose={() => setPreview(false)}
        />
      )}

      <div className="mx-auto max-w-3xl pb-16">

        {/*  Page header  */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Post a New Job</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Fill out the form below to create your job posting
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md"
          >
            <Eye className="h-4 w-4" />
            {preview ? "Edit" : "Preview"}
          </button>
        </div>

        {/*  Validation summary banner  */}
        {errorCount > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">
              Please fix <strong>{errorCount}</strong> error{errorCount > 1 ? "s" : ""} before publishing.
            </p>
          </div>
        )}

        {/*  Form card  */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm sm:p-8 space-y-8"
          noValidate
        >
          {/*  Basic Info  */}
          <FormSection title="Basic Information">
            <InputField
              label="Job Title"
              name="title"
              required
              icon={Briefcase}
              placeholder="e.g., Senior Frontend Developer"
              value={form.title}
              onChange={handleChange}
              error={errors.title}
            />

            <LocationPicker
              label="Job Location / Business Address"
              required
              value={form.location}
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ location, latitude, longitude }) => {
                setForm((prev) => ({ ...prev, location, latitude, longitude }));
                if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
              }}
              error={errors.location}
              placeholder="e.g., Accra Mall, East Legon, Accra or search Google Locator"
            />

            {/* Category + Job Type — side by side on sm+ */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <SelectField
                label="Category"
                name="category"
                required
                icon={Users}
                placeholder="Select a category"
                options={CATEGORY_OPTIONS}
                value={form.category}
                onChange={handleChange}
                error={errors.category}
              />
              <SelectField
                label="Job Type"
                name="jobType"
                required
                icon={Briefcase}
                placeholder="Select job type"
                options={JOB_TYPE_OPTIONS}
                value={form.jobType}
                onChange={handleChange}
                error={errors.jobType}
              />
            </div>

            {/* Conditional "Other" specification fields */}
            {form.category === "other" && (
              <InputField
                label="Specify Category"
                name="customCategory"
                required
                icon={Users}
                placeholder="e.g., Agriculture, Logistics…"
                value={form.customCategory}
                onChange={handleChange}
                error={errors.customCategory}
              />
            )}

            {form.jobType === "Other" && (
              <InputField
                label="Specify Job Type"
                name="customJobType"
                required
                icon={Briefcase}
                placeholder="e.g., Freelance, Volunteer…"
                value={form.customJobType}
                onChange={handleChange}
                error={errors.customJobType}
              />
            )}

            {/* Application Deadline */}
            <InputField
              label="Application Deadline"
              name="deadline"
              type="date"
              icon={Calendar}
              placeholder="Select closing date"
              value={form.deadline}
              onChange={handleChange}
              error={errors.deadline}
              hint="The date when this job listing stops accepting applications"
            />
          </FormSection>

          <Divider />

          {/*  Description & Requirements  */}
          <FormSection title="Job Details">
            <TextAreaField
              label="Job Description"
              name="description"
              required
              placeholder="Describe the role and responsibilities..."
              value={form.description}
              onChange={handleChange}
              error={errors.description}
              rows={6}
            />

            <TextAreaField
              label="Requirements"
              name="requirements"
              required
              placeholder={"· React, TypeScript, CSS\n· 3+ years experience..."}
              value={form.requirements}
              onChange={handleChange}
              error={errors.requirements}
              hint="Include required skills, experience level, education, and any preferred qualifications"
              rows={5}
            />
          </FormSection>

          <Divider />

          {/*  Salary ─ */}
          <FormSection title="Compensation">
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Salary Range <span className="text-red-500 dark:text-red-400">*</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  name="salaryMin"
                  type="number"
                  icon={GhsIcon}
                  iconPadding="pl-14"
                  placeholder="Min"
                  value={form.salaryMin}
                  onChange={handleChange}
                  error={errors.salaryMin}
                />
                <InputField
                  name="salaryMax"
                  type="number"
                  icon={GhsIcon}
                  iconPadding="pl-14"
                  placeholder="Max"
                  value={form.salaryMax}
                  onChange={handleChange}
                  error={errors.salaryMax}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Annual salary in GHS. Leave blank if not disclosed.
              </p>
            </div>
          </FormSection>

          {/*  Submit ─ */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Publishing…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Publish Job
              </>
            )}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default JobPostingForm;
