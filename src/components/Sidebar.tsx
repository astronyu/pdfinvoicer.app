import React, { Dispatch, SetStateAction } from 'react';
import { NavLink } from 'react-router-dom';
import { AppUser } from '../types';
import { FilePlusIcon, ListBulletIcon, GearIcon, DashboardIcon, ExitIcon, QuestionMarkCircledIcon, LockClosedIcon, Cross2Icon, EnvelopeClosedIcon, IdCardIcon } from '@radix-ui/react-icons';

interface SidebarProps {
    currentUser: AppUser;
    onCreateNew: () => void;
    onLogout: () => void;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onCreateNew, onLogout, isOpen, setIsOpen }) => {
    let hostname = 'pdfinvoicer.app';
    if (typeof window !== 'undefined' && window.location.hostname) {
        hostname = window.location.hostname;
    }

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { to: '/create-invoice', label: 'Create Invoice', icon: FilePlusIcon, action: onCreateNew },
        { to: '/invoice-history', label: 'Invoice History', icon: ListBulletIcon },
        { to: '/settings', label: 'Settings', icon: GearIcon },
        { to: '/contact', label: 'Contact', icon: EnvelopeClosedIcon },
    ];
    
    if (currentUser?.profile?.is_admin) {
        navItems.push({ to: '/admin', label: 'Admin Panel', icon: LockClosedIcon });
    }
    const credits = currentUser.profile.credits ?? 0;

    const NavItem: React.FC<typeof navItems[0]> = ({ to, label, icon: Icon, action }) => {
        const handleClick = (e: React.MouseEvent) => {
            if (action) {
                e.preventDefault();
                action();
            }
            setIsOpen(false);
        };

        return (
            <li>
                <NavLink
                    to={to}
                    onClick={handleClick}
                    className={({ isActive }) => `w-full flex items-center px-4 py-3 my-2 text-left text-base font-medium rounded-lg transition-colors duration-200
                        ${isActive
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100'
                        }`
                    }
                >
                    <Icon className="w-6 h-6 mr-4" />
                    {label}
                </NavLink>
            </li>
        );
    };

    const sidebarContent = (
        <div className="flex flex-col h-full">
             <div className="h-20 flex items-center justify-between pl-6 pr-4 border-b-2 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <img src="https://upgvvoufmlhrecgltdge.supabase.co/storage/v1/object/public/assets/logo.svg" alt="PDF Invoicer Logo" className="w-10 h-10" />
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">PDF Invoicer</h1>
                        <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">BETA</span>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="md:hidden p-2">
                    <Cross2Icon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
                </button>
            </div>
            <nav className="flex-1 px-4 py-6">
                <ul>
                    {navItems.map((item) => <NavItem key={item.to} {...item} />)}
                     <li>
                        <NavLink
                            to="/faq"
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center px-4 py-3 my-2 text-left text-base font-medium rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100"
                        >
                            <QuestionMarkCircledIcon className="w-6 h-6 mr-4" />
                            Help / FAQ
                        </NavLink>
                    </li>
                </ul>
            </nav>
            <div className="px-4 mb-4">
                <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg text-center">
                    <div className="flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        <IdCardIcon className="w-4 h-4 mr-2"/>
                        CREDIT BALANCE
                    </div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">{credits >= 9999 ? '∞' : credits}</p>
                    <NavLink
                        to="/buy-credits"
                        onClick={() => setIsOpen(false)}
                        className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Buy More Credits
                    </NavLink>
                </div>
            </div>
            <div className="p-4 border-t-2 dark:border-gray-700">
                 <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center px-4 py-3 text-left text-base font-medium rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300"
                >
                    <ExitIcon className="w-6 h-6 mr-4" />
                    Logout
                 </button>
                 <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">©2025 <a href="/" className="text-inherit no-underline" target="_blank" rel="noopener noreferrer">{hostname}</a></p>
            </div>
        </div>
    );
    
    return (
        <>
            {/* Overlay for mobile */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-40 transition-transform transform md:static md:translate-x-0 md:flex-shrink-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {sidebarContent}
            </aside>
        </>
    );
};