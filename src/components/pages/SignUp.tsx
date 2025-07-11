import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LockClosedIcon, EnvelopeClosedIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { supabase } from '../../services/db';

export const SignUpPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            setError("Password should be at least 6 characters.");
            setLoading(false);
            return;
        }
        if (!agreedToTerms) {
            setError("You must agree to the terms and conditions to sign up.");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // This is crucial for ensuring the user is redirected back to the
                    // correct application instance after clicking the confirmation link.
                    // The URL must contain the full path including the hash to the page.
                    // Supabase will append its own params after this.
                    emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
                },
            });

            if (error) {
                setError(error.message);
            } else if (data.user) {
                // Now handled by the trigger in Supabase.
                setSuccess("Account created! Check your email for a confirmation link to log in.");
            } else {
                 setError('An unknown error occurred during sign up.');
            }

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred during sign up.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 md:p-12">
                    <div className="text-center mb-8">
                        <img src="https://upgvvoufmlhrecgltdge.supabase.co/storage/v1/object/public/assets/logo.svg" alt="PDF Invoicer Logo" className="w-20 h-20 mx-auto mb-4" />
                        <div className="flex items-baseline justify-center gap-2">
                            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">PDF Invoicer</h1>
                            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">BETA</span>
                        </div>
                        <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Create Your Account</p>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full text-base pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="you@example.com" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password"  className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                             <div className="mt-1 relative">
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full text-base pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="••••••••" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword"  className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                             <div className="mt-1 relative">
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="confirmPassword" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full text-base pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="••••••••" />
                            </div>
                        </div>

                         <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input id="terms" name="terms" type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="terms" className="text-gray-600 dark:text-gray-400">
                                    I agree to the{' '}
                                    <Link to="/terms" className="font-medium text-blue-600 hover:underline">Terms of Service</Link>
                                    {' and '}
                                    <Link to="/privacy" className="font-medium text-blue-600 hover:underline">Privacy Policy</Link>.
                                </label>
                            </div>
                        </div>
                        
                        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                        {success && <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>}

                        <div>
                            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:bg-blue-400">
                                {loading ? 'Signing Up...' : 'Sign Up'}
                            </button>
                        </div>
                    </form>
                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
                 <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6 space-x-4">
                     <Link to="/terms" className="hover:underline">Terms of Service</Link>
                     <span>&bull;</span>
                     <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
                     <span>&bull;</span>
                     <Link to="/faq" className="hover:underline">FAQ</Link>
                 </div>
            </div>
        </div>
    );
};
