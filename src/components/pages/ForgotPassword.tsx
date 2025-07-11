import React, { useState } from 'react';
import { supabase } from '../../services/db';
import { Link } from 'react-router-dom';
import { EnvelopeClosedIcon, ArrowLeftIcon } from '@radix-ui/react-icons';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        try {
            // The redirect URL needs to be the base URL of the app.
            // Supabase will automatically append the necessary hash params for recovery.
            // e.g., https://yourapp.com/#access_token=...&type=recovery
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}${window.location.pathname}`,
            });
            if (error) {
                setError(error.message);
            } else {
                setMessage('Password reset instructions have been sent to your email.');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
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
                        <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Reset Password</p>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your email to get a reset link.</p>
                    </div>

                    <form onSubmit={handlePasswordReset} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full text-base pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                        {message && <p className="text-sm text-green-600 dark:text-green-400 text-center">{message}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading || !!message}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:bg-blue-400"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </div>
                    </form>

                     <div className="text-center mt-6">
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 flex items-center justify-center mx-auto">
                            <ArrowLeftIcon className="mr-2"/>
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
