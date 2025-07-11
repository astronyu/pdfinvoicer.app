import React, { useState, useEffect, useCallback } from 'react';
import { AppUser } from '../../types';
import { AdminUserView, ProfileUpdate } from '../../types/supabase';
import * as supa from '../../services/supabase';
import { PersonIcon, CheckCircledIcon, CrossCircledIcon, PlusIcon, StarIcon, InfoCircledIcon, TrashIcon, ClipboardCopyIcon, ReloadIcon } from '@radix-ui/react-icons';
import { supabase } from '../../services/db';
import { useToast } from '../Toast';
import { ConfirmationModal } from '../ConfirmationModal';


interface AdminPanelProps {
    currentUser: AppUser;
}

const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400";
const buttonClasses = "px-5 py-2 mt-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:bg-gray-400";

const MAIN_ADMIN_EMAIL = 'shaiful.aizal@gmail.com';

const sqlForCreateProfile = `-- This function automatically creates a profile for a new user upon sign-up.
-- It's the most critical function for the app to work correctly.
CREATE OR REPLACE FUNCTION public.handle_create_profile_for_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, is_admin)
  VALUES (
    new.id,
    new.email,
    9999, -- Default beta credits for all new users
    false -- New users are never admins by default. Admin rights must be granted manually.
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger attaches the function to the authentication system.
-- It must be created for the function above to have any effect.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_create_profile_for_new_user();`;

const sqlForSoftDelete = `-- This function securely handles user account deletion from the Settings page.
CREATE OR REPLACE FUNCTION public.handle_soft_delete_user()
RETURNS void AS $$
BEGIN
  -- Deletes all data associated with the calling user
  DELETE FROM public.invoices WHERE user_id = auth.uid();
  DELETE FROM public.clients WHERE user_id = auth.uid();
  DELETE FROM public.sender_info WHERE user_id = auth.uid();
  DELETE FROM public.bank_info WHERE user_id = auth.uid();
  DELETE FROM public.app_settings WHERE user_id = auth.uid();
  
  -- Deactivates the profile instead of deleting it
  UPDATE public.profiles
  SET status = 'deactivated'
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

const sqlForAdminCheck = `-- This helper function is used in Row Level Security policies to check for admin privileges.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT is_admin
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

const sqlForGetAllUsers = `-- This function securely joins profile data with authentication data.
-- It MUST be created with SECURITY DEFINER to access the auth.users table.
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
    id uuid,
    email text,
    credits integer,
    is_admin boolean,
    status text,
    last_sign_in_at timestamptz,
    email_confirmed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.id,
        u.email,
        p.credits,
        p.is_admin,
        p.status::text,
        u.last_sign_in_at,
        u.email_confirmed_at
    FROM
        public.profiles p
    LEFT JOIN
        auth.users u ON p.id = u.id;
$$;`;

const sqlForCountInvoices = `-- This function securely and efficiently counts invoices for each user.
-- It MUST be created with SECURITY DEFINER to work correctly.
CREATE OR REPLACE FUNCTION admin_count_invoices_per_user()
RETURNS TABLE (
    email text,
    invoice_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.email,
        COUNT(i.id) as invoice_count
    FROM
        public.profiles p
    LEFT JOIN
        public.invoices i ON p.id = i.user_id
    GROUP BY
        p.email
    ORDER BY
        p.email;
$$;`;


const handleCopySql = (sql: string, toast: ReturnType<typeof useToast>) => {
    navigator.clipboard.writeText(sql).then(() => {
        toast.addToast('SQL copied to clipboard!', 'success');
    }, (err) => {
        console.error('Failed to copy SQL: ', err);
        toast.addToast('Failed to copy SQL.', 'error');
    });
};

const StatusBadge: React.FC<{ user: AdminUserView }> = ({ user }) => {
    const getDisplayStatus = (): { text: string, color: string } => {
        if (user.status === 'deactivated') {
            return { text: 'Deactivated', color: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
        }
        if (!user.email_confirmed_at) {
            return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
        }
        if (user.last_sign_in_at) {
            const daysSinceLogin = (new Date().getTime() - new Date(user.last_sign_in_at).getTime()) / (1000 * 3600 * 24);
            if (daysSinceLogin > 90) {
                return { text: 'Inactive', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' };
            }
        }
        return { text: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
    };

    const { text, color } = getDisplayStatus();

    return (
        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>
            {text}
        </span>
    );
};


export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<AdminUserView[]>([]);
    const [invoiceCounts, setInvoiceCounts] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUserView | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const toast = useToast();


    // State for adding a new user
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [allUsersData, counts] = await Promise.all([
                supa.adminGetAllUsers(),
                supa.adminCountInvoicesPerUser(),
            ]);
            const allUsers: AdminUserView[] = allUsersData || [];
            // Defensively sort to prevent crash on null/undefined email
            setUsers(allUsers.sort((a, b) => (a.email || '').localeCompare(b.email || '')));
            setInvoiceCounts(counts);
        } catch (e: any) {
            const errorMessage = (e as Error).message || 'An unknown error occurred';
            console.error("Failed to load admin data", e);
            if (errorMessage.includes('Could not find the function')) {
                setError("A required database function is missing. The Admin Panel cannot load. Please create the function in your Supabase SQL Editor and then refresh this page. See below for the required SQL code.");
            } else {
                setError(`An unexpected error occurred while loading admin data: ${errorMessage}`);
            }
            toast.addToast('Error loading admin data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePromoteUser = async (user: AdminUserView) => {
        const newAdminStatus = !user.is_admin;
        const action = newAdminStatus ? 'promote' : 'demote';
        if (window.confirm(`Are you sure you want to ${action} ${user.email}?`)) {
            try {
                await supa.adminPromoteUser(user.id!, newAdminStatus);
                toast.addToast(`User ${user.email} has been ${action}d.`, 'success');
                fetchData(); // Refresh data
            } catch (error) {
                console.error(error);
                toast.addToast(`Error: ${(error as Error).message}`, 'error');
            }
        }
    };
    
    const handleAwardCredits = async (user: AdminUserView) => {
        if (window.confirm(`Are you sure you want to award unlimited credits to ${user.email}?`)) {
            try {
                await supa.adminAwardUnlimitedCredits(user.id!);
                toast.addToast(`Unlimited credits awarded to ${user.email}.`, 'success');
                fetchData(); // Refresh data
            } catch (error) {
                console.error(error);
                toast.addToast(`Error: ${(error as Error).message}`, 'error');
            }
        }
    };

    const openDeleteModal = (user: AdminUserView) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await supa.adminDeleteUser(userToDelete.id!);
            toast.addToast(`User ${userToDelete.email} has been permanently deleted.`, 'success');
            fetchData(); // Refresh data
        } catch (error) {
            console.error(error);
            toast.addToast(`Error deleting user: ${(error as Error).message}`, 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };
    
    const handleAddNewUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail || !newUserPassword) {
            toast.addToast("Email and password are required.", 'error');
            return;
        }
        try {
            // This is a simplified admin action. In a real app, this would be a secure Edge Function.
            const { data: { user }, error: authError } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword
            });

            if (authError) throw authError;

            // The trigger should create the profile, but we update it with admin status if needed.
            if (user && newUserIsAdmin) {
                 const payload: ProfileUpdate = { is_admin: true, credits: 9999 };
                 await supabase.from('profiles').update(payload as any).eq('id', user.id);
            }

            toast.addToast(`User ${newUserEmail} created successfully.`, 'success');
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserIsAdmin(false);
            fetchData(); // Refresh the user list
        } catch (error) {
            console.error(error);
            toast.addToast(`Error creating user: ${(error as Error).message}`, 'error');
        }
    };

    if (loading && !error && users.length === 0) {
        return <div className="p-10 text-center">Loading Admin Panel...</div>;
    }
    
    return (
        <>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete User Account"
                message={
                    <>
                        <p>This action is irreversible. It will permanently deactivate the user <strong className="text-red-700 dark:text-red-300">{userToDelete?.email}</strong> and all associated data (invoices, clients, settings).</p>
                        <p className="font-bold mt-2">Are you absolutely sure?</p>
                    </>
                }
                confirmInput="DELETE"
            />
            <div className="max-w-7xl mx-auto space-y-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Admin Panel</h2>

                {/* User Management */}
                {error ? (
                     <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">Action Required: Database Setup</h3>
                        <p className="text-red-600 dark:text-red-300 mt-2 mb-4">{error}</p>
                        <div className="text-center">
                            <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition">
                                <ReloadIcon className={loading ? 'animate-spin' : ''}/> {loading ? 'Refreshing...' : 'Refresh Admin Panel'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6 flex items-center">
                            <PersonIcon className="mr-3" /> User Management
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Email</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.email}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center font-semibold">{user.credits >= 9999 ? '∞' : user.credits}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                                <StatusBadge user={user} />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-center">{invoiceCounts.get(user.email || '') || 0}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                                {user.is_admin ? <CheckCircledIcon className="h-5 w-5 text-green-500 mx-auto" /> : <CrossCircledIcon className="h-5 w-5 text-red-500 mx-auto" />}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {user.email && user.email.toLowerCase() !== MAIN_ADMIN_EMAIL.toLowerCase() ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleAwardCredits(user)}
                                                                disabled={user.credits >= 9999}
                                                                className="p-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                                                                title="Award unlimited credits"
                                                            >
                                                                <StarIcon className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handlePromoteUser(user)}
                                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md ${user.is_admin ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white transition`}
                                                            >
                                                                {user.is_admin ? 'Demote' : 'Promote'}
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(user)}
                                                                className="p-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white transition"
                                                                title="Delete User"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Main Admin</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* Add New User */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6 flex items-center">
                        <PlusIcon className="mr-3" /> Add New User
                    </h3>
                    <form onSubmit={handleAddNewUser} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <input type="email" id="newUserEmail" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className={inputClasses} />
                        </div>
                        <div>
                            <label htmlFor="newUserPassword"  className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <input type="password" id="newUserPassword" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className={inputClasses} />
                        </div>
                        <div className="flex flex-col justify-end h-full">
                            <div className="flex items-center mb-2">
                                 <input type="checkbox" id="newUserIsAdmin" checked={newUserIsAdmin} onChange={e => setNewUserIsAdmin(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                                 <label htmlFor="newUserIsAdmin" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Make this user an admin</label>
                            </div>
                        </div>
                        <div className="md:col-span-3 text-right">
                            <button type="submit" className={buttonClasses}>Create User</button>
                        </div>
                    </form>
                </div>
                
                {/* Core Database Functions */}
                <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6 flex items-center">
                        <InfoCircledIcon className="mr-3 text-blue-500" /> Core Database Functions
                    </h3>
                     <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                        These SQL functions are required for the application to work correctly. If you're experiencing issues with user sign-ups, deletions, or this admin panel, ensure these functions exist and are up-to-date in your Supabase SQL Editor.
                    </p>
                    <div className="space-y-6">
                         <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">1. User Profile Creation (CRITICAL)</h4>
                            <p className="text-gray-600 dark:text-gray-400 mt-1 mb-3 text-sm">This function automatically creates a user profile upon sign-up. If this is missing, new users cannot log in.</p>
                            <pre className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg text-xs overflow-x-auto">
                                <code>{sqlForCreateProfile}</code>
                            </pre>
                            <button onClick={() => handleCopySql(sqlForCreateProfile, toast)} className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                                <ClipboardCopyIcon/> Copy SQL
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">2. Self-Service User Deletion</h4>
                             <p className="text-gray-600 dark:text-gray-400 mt-1 mb-3 text-sm">This function powers the "Delete My Account" button in the settings page.</p>
                            <pre className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg text-xs overflow-x-auto">
                                <code>{sqlForSoftDelete}</code>
                            </pre>
                             <button onClick={() => handleCopySql(sqlForSoftDelete, toast)} className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                                <ClipboardCopyIcon/> Copy SQL
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">3. Admin Check</h4>
                             <p className="text-gray-600 dark:text-gray-400 mt-1 mb-3 text-sm">This function is used by Row Level Security policies to grant admins special permissions.</p>
                            <pre className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-lg text-xs overflow-x-auto">
                                <code>{sqlForAdminCheck}</code>
                            </pre>
                             <button onClick={() => handleCopySql(sqlForAdminCheck, toast)} className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                                <ClipboardCopyIcon/> Copy SQL
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">4. Admin Panel Functions</h4>
                             <p className="text-gray-600 dark:text-gray-400 mt-1 mb-3 text-sm">These two functions (`admin_get_all_users` and `admin_count_invoices_per_user`) are required for this admin panel to display user data.</p>
                            <pre className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 mt-4 rounded-lg text-xs overflow-x-auto">
                                <code>{sqlForGetAllUsers}</code>
                            </pre>
                             <button onClick={() => handleCopySql(sqlForGetAllUsers, toast)} className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                                <ClipboardCopyIcon/> Copy `admin_get_all_users`
                            </button>
                            <pre className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 mt-4 rounded-lg text-xs overflow-x-auto">
                                <code>{sqlForCountInvoices}</code>
                            </pre>
                             <button onClick={() => handleCopySql(sqlForCountInvoices, toast)} className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                                <ClipboardCopyIcon/> Copy `admin_count_invoices_per_user`
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
