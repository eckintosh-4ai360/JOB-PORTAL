import { useCallback, useEffect, useRef, useState } from "react";
import { useClerk, useSignIn, useSignUp } from "@clerk/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useAuth } from "../../context/AuthContext";

/**
 * SSOCallback
 *
 * Clerk redirects here after Google completes OAuth.
 * We:
 *   1. Finalize the Clerk sign-in or sign-up resource
 *   2. Get the session token from Clerk
 *   3. POST it to our backend /api/auth/clerk
 *   4. If the user is brand-new, we show a role selector first
 *   5. Store JWT in our AuthContext and navigate by role
 */
const SSOCallback = () => {
    const clerk = useClerk();
    const { signIn } = useSignIn();
    const { signUp } = useSignUp();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedRole = searchParams.get("role");

    const hasRun = useRef(false);
    const [step, setStep] = useState("loading"); // "loading" | "pick-role" | "done" | "error"
    const [pendingToken, setPendingToken] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const exchangeSession = useCallback(async (clerkSession) => {
        if (!clerkSession) {
            throw new Error("No Clerk session was created.");
        }

        try {
            const clerkToken = await clerkSession.getToken();
            const response = await axiosInstance.post(API_PATHS.AUTH.CLERK_AUTH, {
                clerkToken,
                ...(selectedRole ? { role: selectedRole } : {}),
            });

            const { token, user } = response.data;
            login(user, token);
            toast.success(`Welcome, ${user.name}!`);

            navigate(
                user.role === "employer" ? "/employer-dashboard" : "/find-jobs",
                { replace: true },
            );
        } catch (err) {
            const data = err.response?.data;

            if (data?.requiresRole) {
                const clerkToken = await clerkSession.getToken();
                setPendingToken(clerkToken);
                setStep("pick-role");
                return;
            }

            throw new Error(data?.message || "Authentication failed. Please try again.");
        }
    }, [login, navigate, selectedRole]);

    const finalizeResource = useCallback(async (resource) => {
        const { error } = await resource.finalize({
            navigate: async ({ session }) => {
                await exchangeSession(session);
            },
        });

        if (error) throw error;
    }, [exchangeSession]);

    // Complete the Clerk Core 3 flow before exchanging the session with our API.
    useEffect(() => {
        if (!clerk.loaded || !signIn || !signUp || hasRun.current) return;
        hasRun.current = true;

        const complete = async () => {
            try {
                if (signIn.status === "complete") {
                    await finalizeResource(signIn);
                    return;
                }

                if (signUp.isTransferable) {
                    await signIn.create({ transfer: true });
                    if (signIn.status === "complete") {
                        await finalizeResource(signIn);
                        return;
                    }
                }

                if (signIn.isTransferable) {
                    await signUp.create({ transfer: true });
                    if (signUp.status === "complete") {
                        await finalizeResource(signUp);
                        return;
                    }

                    setErrorMsg("Google signup needs additional information before it can continue.");
                    setStep("error");
                    return;
                }

                if (["needs_second_factor", "needs_new_password", "needs_client_trust"].includes(signIn.status)) {
                    setErrorMsg("Google sign-in needs additional verification. Please try again.");
                    setStep("error");
                    return;
                }

                const existingSessionId = signIn.existingSession?.sessionId || signUp.existingSession?.sessionId;
                if (existingSessionId) {
                    await clerk.setActive({
                        session: existingSessionId,
                        navigate: async ({ session }) => {
                            await exchangeSession(session);
                        },
                    });
                    return;
                }

                // Recover a Clerk session left active by a previous incomplete callback.
                if (clerk.session) {
                    await exchangeSession(clerk.session);
                    return;
                }

                throw new Error(`Google sign-in did not complete (${signIn.status}).`);
            } catch (err) {
                console.error("Clerk redirect callback error:", err);
                setErrorMsg(err?.longMessage || err?.message || "Google sign-in failed. Please try again.");
                setStep("error");
            }
        };

        complete();
    }, [clerk, exchangeSession, finalizeResource, signIn, signUp]);

    // Step 3 — user picks role (first-time Google sign-in only)
    const handleRoleSelect = async (role) => {
        try {
            setStep("loading");
            const response = await axiosInstance.post(API_PATHS.AUTH.CLERK_AUTH, {
                clerkToken: pendingToken,
                role,
            });

            const { token, user } = response.data;
            login(user, token);
            toast.success(`Welcome to SPG JobPortal, ${user.name}!`);

            if (user.role === "employer") {
                navigate("/employer-dashboard", { replace: true });
            } else {
                navigate("/find-jobs", { replace: true });
            }
        } catch (err) {
            console.error("Role selection error:", err);
            setErrorMsg(err.response?.data?.message || "Something went wrong.");
            setStep("error");
        }
    };

    if (step === "loading") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <svg className="w-10 h-10 animate-spin text-orange-500 mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="text-gray-500 font-medium text-sm">Signing you in with Google...</p>
            </div>
        );
    }

    if (step === "pick-role") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-6 text-center">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">One last step</h2>
                        <p className="text-gray-500 text-sm mt-1">How will you be using SPG JobPortal?</p>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={() => handleRoleSelect("jobseeker")}
                            className="w-full border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 py-4 rounded-xl transition-all font-semibold text-gray-700 flex flex-col items-center gap-1 cursor-pointer"
                        >
                            <span className="text-2xl">🔍</span>
                            <span>I'm looking for a job</span>
                            <span className="text-xs text-gray-400 font-normal">Browse and apply for positions</span>
                        </button>
                        <button
                            onClick={() => handleRoleSelect("employer")}
                            className="w-full border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 py-4 rounded-xl transition-all font-semibold text-gray-700 flex flex-col items-center gap-1 cursor-pointer"
                        >
                            <span className="text-2xl">🏢</span>
                            <span>I'm hiring</span>
                            <span className="text-xs text-gray-400 font-normal">Post jobs and find candidates</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "error") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="text-5xl mb-4">😕</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Sign-in failed</h2>
                <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
                <button
                    onClick={() => navigate("/login")}
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return null;
};

export default SSOCallback;
