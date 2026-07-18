const Application = require("../models/Application");
const Job = require("../models/Job");
const { uploadToCloudinary, uploadToLocalDisk } = require("../middlewares/uploadMiddleware");

// @desc    Apply for a job (authenticated users OR guests)
// @route   POST /api/applications/:jobId
// @access  Public (optionalAuth — works with or without JWT)
const applyForJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        if (job.isClosed) {
            return res.status(400).json({ message: "This job is no longer accepting applications" });
        }

        const isLoggedIn = !!req.user;

        // ── Role check (logged-in users only) ─────────────────────────────
        if (isLoggedIn && req.user.role !== "jobseeker") {
            return res.status(403).json({ message: "Only jobseekers can apply for jobs" });
        }

        // ── Duplicate prevention ───────────────────────────────────────────
        if (isLoggedIn) {
            const alreadyApplied = await Application.findOne({
                job: req.params.jobId,
                applicant: req.user._id,
            });
            if (alreadyApplied) {
                return res.status(400).json({ message: "You have already applied for this job" });
            }
        } else {
            // Guest: require name & email
            const { guestName, guestEmail } = req.body;
            if (!guestName || !guestEmail) {
                return res.status(400).json({ message: "Name and email are required for guest applications" });
            }
            const alreadyApplied = await Application.findOne({
                job: req.params.jobId,
                guestEmail: guestEmail.toLowerCase().trim(),
            });
            if (alreadyApplied) {
                return res.status(400).json({ message: "An application with this email already exists for this job" });
            }
        }

        // ── Resume handling ────────────────────────────────────────────────
        let resume = req.body.resume;
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer, {
                    folder: "job-portal/resumes",
                    resource_type: "raw",
                });
                resume = result.secure_url;
            } catch (cloudinaryError) {
                console.warn("Cloudinary upload failed, falling back to local disk storage:", cloudinaryError.message || cloudinaryError);
                const filename = await uploadToLocalDisk(req.file.buffer, req.file.originalname);
                resume = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
            }
        }

        if (!resume) {
            return res.status(400).json({ message: "A resume (file or URL) is required" });
        }

        // ── Create application ─────────────────────────────────────────────
        const applicationData = {
            job: req.params.jobId,
            resume,
            coverLetter: req.body.coverLetter || "",
        };

        if (isLoggedIn) {
            applicationData.applicant = req.user._id;
        } else {
            applicationData.guestName = req.body.guestName.trim();
            applicationData.guestEmail = req.body.guestEmail.toLowerCase().trim();
            applicationData.guestPhone = req.body.guestPhone?.trim() || "";
        }

        const application = await Application.create(applicationData);

        res.status(201).json({ message: "Application submitted successfully", application });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get all applications submitted by the logged-in jobseeker
// @route   GET /api/applications/my-applications
// @access  Private (Jobseeker only)
const getMyApplications = async (req, res) => {
    try {
        if (req.user.role !== "jobseeker") {
            return res.status(403).json({ message: "Only jobseekers can access this route" });
        }

        const applications = await Application.find({ applicant: req.user._id })
            .populate("job", "title location type company isClosed")
            .sort({ createdAt: -1 });

        res.status(200).json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get all applications for a specific job (employer view)
// @route   GET /api/applications/job/:jobId
// @access  Private (Employer only — must own the job)
const getApplicationsForJob = async (req, res) => {
    try {
        if (req.user.role !== "employer") {
            return res.status(403).json({ message: "Only employers can access this route" });
        }

        const job = await Job.findById(req.params.jobId);

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        if (job.company.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to view applications for this job" });
        }

        const applications = await Application.find({ job: req.params.jobId })
            .populate("applicant", "name email avatar resume")
            .sort({ createdAt: -1 });

        // Normalize output so employers see consistent name/email for both
        // registered and guest applicants
        const normalized = applications.map((app) => {
            const obj = app.toObject();
            if (obj.isGuest) {
                obj.applicantName = obj.guestName;
                obj.applicantEmail = obj.guestEmail;
                obj.applicantPhone = obj.guestPhone || "";
            } else if (obj.applicant) {
                obj.applicantName = obj.applicant.name;
                obj.applicantEmail = obj.applicant.email;
            }
            return obj;
        });

        res.status(200).json(normalized);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Get a single application by ID
// @route   GET /api/applications/:id
// @access  Private (Owner applicant or job's employer)
const getApplicationById = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate("job", "title location type company")
            .populate("applicant", "name email avatar");

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const isApplicant = application.applicant && application.applicant._id.toString() === req.user._id.toString();
        const job = await Job.findById(application.job._id);
        const isJobOwner = job && job.company.toString() === req.user._id.toString();

        if (!isApplicant && !isJobOwner) {
            return res.status(403).json({ message: "Not authorized to view this application" });
        }

        res.status(200).json(application);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Update application status (employer action)
// @route   PATCH /api/applications/:id/status
// @access  Private (Employer only — must own the job)
const updateApplicationStatus = async (req, res) => {
    try {
        if (req.user.role !== "employer") {
            return res.status(403).json({ message: "Only employers can update application status" });
        }

        const { status } = req.body;
        const allowedStatuses = ["Applied", "Under Review", "Offered", "Rejected"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(", ")}` });
        }

        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const job = await Job.findById(application.job);

        if (!job || job.company.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to update this application" });
        }

        application.status = status;
        await application.save();

        res.status(200).json({ message: "Application status updated", application });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Withdraw (delete) an application
// @route   DELETE /api/applications/:id
// @access  Private (Jobseeker — must be the applicant)
const withdrawApplication = async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        if (application.applicant.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to withdraw this application" });
        }

        await application.deleteOne();

        res.status(200).json({ message: "Application withdrawn successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    applyForJob,
    getMyApplications,
    getApplicationsForJob,
    getApplicationById,
    updateApplicationStatus,
    withdrawApplication,
};
