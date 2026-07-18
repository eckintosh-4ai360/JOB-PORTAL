const express = require("express");
const router = express.Router();
const {
    applyForJob,
    getMyApplications,
    getApplicationsForJob,
    getApplicationById,
    updateApplicationStatus,
    withdrawApplication,
} = require("../controllers/applicationController");
const { protect, optionalAuth } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// Apply for a job — works for both logged-in users and guests
router.post("/:jobId", optionalAuth, upload.single("resume"), applyForJob);

// Jobseeker — view all their own applications
router.get("/my-applications", protect, getMyApplications);

// Employer — view all applications for a specific job
router.get("/job/:jobId", protect, getApplicationsForJob);

// Shared — view a single application (applicant or employer)
router.get("/:id", protect, getApplicationById);

// Employer — update application status
router.patch("/:id/status", protect, updateApplicationStatus);

// Jobseeker — withdraw an application
router.delete("/:id", protect, withdrawApplication);

module.exports = router;
