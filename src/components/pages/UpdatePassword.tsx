import React, { useState } from 'react';
import { supabase } from '../../services/db';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon } from '@radix-ui/react-icons';

export const UpdatePasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setError(error.message);
            } else {
                setMessage('Password updated successfully! Redirecting to sign in...');
                setTimeout(() => navigate('/login'), 3000);
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
                        <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Update Your Password</p>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your new password below.</p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div>
                            <label htmlFor="password"  className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                             <div className="mt-1 relative">
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full text-base pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="confirmPassword"  className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                             <div className="mt-1 relative">
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full text-base pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="••••••••"
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
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
