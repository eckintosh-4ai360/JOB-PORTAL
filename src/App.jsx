import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {Toaster} from "react-hot-toast";
import LandingPage from "./pages/LandingPage/LandingPage";
import SignUp from "./pages/Auth/SignUp";
import Login from "./pages/Auth/Login";
import SSOCallback from "./pages/Auth/SSOCallback";

import CandidateDashboard from "./pages/Candidate/CandidateDashboard";
import UserProfile from "./pages/Candidate/UserProfile";
import SavedJobs from "./pages/Candidate/SavedJobs";
import JobDetails from "./pages/Candidate/JobDetails";
import EmployerDashboard from "./pages/Employer/EmployerDashboard";
import JobPostingForm from "./pages/Employer/JobPostingForm";
import ApplicationViewer from "./pages/Employer/AppplicationViewer";
import ManageJobs from "./pages/Employer/ManageJobs";
import EmployerProfilePage from "./pages/Employer/EmployerProfilePage";
import ProtectedRoute from "./routes/ProtectedRoute"


export const App = () => {
  return (
    <div >
      <Router>
        <Routes>
          {/* public routes */}
          <Route path="/" element={<LandingPage/>} />
          <Route path="/signup" element={<SignUp/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/sso-callback" element={<SSOCallback/>} />

          {/* public candidate routes — no login required to browse */}
          <Route path="/find-jobs" element={<CandidateDashboard/>} />
          <Route path="/job/:jobId" element={<JobDetails/>} />

          {/* candidate-only routes — login required */}
          <Route element={<ProtectedRoute requiredRole="jobseeker" />}>
            <Route path="/saved-jobs" element={<SavedJobs/>} />
            <Route path="/profile" element={<UserProfile/>} />
          </Route>

          {/* employer-only routes — login required */}
          <Route element={<ProtectedRoute requiredRole="employer" />} >
            <Route path="/employer-dashboard" element={<EmployerDashboard/>} />
            <Route path="/post-job" element={<JobPostingForm/>} />
            <Route path="/manage-jobs" element={<ManageJobs/>} />
            <Route path="/applicants" element={<ApplicationViewer/>} />
            <Route path="/company-profile" element={<EmployerProfilePage/>} />
          </Route>

          {/* Catch all routes */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>

      <Toaster toastOptions={{
        className: "",
        style: {
          fontSize: "13px",
        }
      }}
      />


    </div>
  )
}

export default App