import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ChevronDownIcon, PersonIcon, GearIcon, FilePlusIcon, ListBulletIcon, BarChartIcon, Pencil1Icon, ReloadIcon, DownloadIcon, EyeOpenIcon, TrashIcon } from '@radix-ui/react-icons';

interface AccordionItemProps {
    item: {
        question: string;
        answer: React.ReactNode;
        icon: React.ElementType;
    };
    isOpen: boolean;
    onClick: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ item, isOpen, onClick }) => {
    const { question, answer, icon: Icon } = item;
    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <button
                onClick={onClick}
                className="w-full flex justify-between items-center text-left py-5 px-6"
            >
                <div className="flex items-center">
                    <Icon className="w-6 h-6 mr-4 text-blue-500" />
                    <span className="text-lg font-medium text-gray-800 dark:text-gray-100">{question}</span>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="prose dark:prose-invert max-w-none p-6 pt-0 text-gray-600 dark:text-gray-300">
                        {answer}
                    </div>
                </div>
            </div>
        </div>
    );
};


const faqData = [
    {
        icon: PersonIcon,
        question: "Getting Started & Account Management",
        answer: (
            <>
                <p>Welcome to PDF Invoicer! Here’s what you need to know to get started with your new cloud-powered account:</p>
                <ul className="list-disc pl-5 mt-4 space-y-3">
                    <li>
                        <strong className="text-green-600 dark:text-green-400">Your Data is Now in the Cloud!</strong>
                        <p className="mt-1">This application securely stores your data (invoices, clients, settings) on our servers, powered by Supabase. This means you get the best of both worlds: robust security and the convenience of accessing your information from anywhere.</p>
                    </li>
                    <li><strong>Cross-Device & Cross-Browser Syncing</strong>
                        <p className="mt-1">You can now log in from any computer or browser and your data will be there waiting for you. All your information is synchronized automatically.</p>
                    </li>
                    <li><strong>Account Creation:</strong> To begin, use the 'Sign Up' link. You'll need to verify your email address. Once confirmed, you can log in and start creating invoices.</li>
                    <li><strong>Account Management:</strong> You can change your password or permanently delete your account from the 'Settings' page. Deleting your account will remove all of your data from our servers and is an irreversible action.</li>
                </ul>
            </>
        )
    },
    {
        icon: BarChartIcon,
        question: "Understanding the Dashboard",
        answer: (
            <>
                <p>The dashboard gives you a complete overview of your invoicing activity. Key features include:</p>
                <ul className="list-disc pl-5 mt-4 space-y-2">
                    <li><strong>Statistics Cards:</strong> At the top, you'll find quick stats for Total Earnings, Total Invoices, and unique Clients for the selected time period.</li>
                    <li><strong>Currency & Time Filters:</strong> You can change the currency for your financial summaries and filter the dashboard data by "Last 12 Months" or specific years.</li>
                    <li><strong>Earnings Chart:</strong> A bar chart visualizes your earnings over time, adjusted to your selected filters.</li>
                    <li><strong>Activity Calendar:</strong> This calendar provides a visual heat-map of your work. It shows dates you've marked as 'Work Days' (green), 'Travel Days' (orange), and days you've issued an invoice (yellow).</li>
                     <li><strong>Client & Reference Lists:</strong> See your top clients by earnings and a list of all client/project references used in your invoices. Click 'See All' for a complete, detailed list in a pop-up window.</li>
                </ul>
            </>
        )
    },
    {
        icon: GearIcon,
        question: "Configuring Your Settings",
        answer: (
            <>
                <p>The 'Settings' page is where you personalize your invoices and manage your account. It's important to fill this out before creating your first invoice.</p>
                <ul className="list-disc pl-5 mt-4 space-y-2">
                    <li><strong>Sender & Bank Information:</strong> Enter your company/personal details and bank information. This data will automatically appear on your generated PDFs, saving you time.</li>
                    <li><strong>PDF Appearance:</strong> Choose from over a dozen professional color schemes for your PDFs. Your selection is saved automatically and will be the default for all new invoices.</li>
                    <li><strong>Account Security:</strong> Secure your account by changing your password here.</li>
                    <li><strong>Danger Zone:</strong> You can permanently delete your account and all its data from this section. Please be aware that this action is irreversible.</li>
                </ul>
            </>
        )
    },
    {
        icon: FilePlusIcon,
        question: "How to Create an Invoice",
        answer: (
             <>
                <p>Click 'Create Invoice' in the sidebar to start. The form is designed to be comprehensive:</p>
                 <ul className="list-disc pl-5 mt-4 space-y-3">
                    <li><strong>Core Details:</strong> Fill in the Invoice #, Date, Client information, and any references. If you select a saved client from the dropdown, their address will auto-fill.</li>
                    <li><strong>Activity Dates (Optional):</strong> Click this section to open a calendar where you can select specific 'Work Dates' and 'Travel Dates'. These are automatically reflected in your Dashboard's Activity Calendar, helping you track your time.</li>
                    <li><strong>Line Items:</strong>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>Add as many items as you need with the 'Add Line Item' button.</li>
                            <li>The description field has a dropdown of common tasks (like 'Consulting work') to speed up entry.</li>
                            <li>Totals for each line are calculated automatically.</li>
                        </ul>
                    </li>
                    <li><strong>Totals Section:</strong> You can add a tax rate (in percent), and the final invoice total is calculated for you instantly.</li>
                    <li><strong>Saving & Generating:</strong>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                           <li><strong>Save Invoice:</strong> Saves the invoice data to the server. You can come back and edit it later.</li>
                           <li><strong>Save & Generate PDF:</strong> Saves the invoice and immediately generates and downloads the PDF file using your currently selected theme.</li>
                        </ul>
                    </li>
                </ul>
            </>
        )
    },
    {
        icon: ListBulletIcon,
        question: "Managing Your Invoice History",
        answer: (
             <>
                <p>The 'Invoice History' page lists all your saved invoices. Click on any invoice to expand it and see the available actions:</p>
                <ul className="list-disc pl-5 mt-4 space-y-3">
                    <li><strong className="flex items-center"><ReloadIcon className="mr-2 text-purple-500"/>Re-generate:</strong> If you've changed your PDF theme or company settings, click this to create a new PDF for this invoice without changing its financial data. You can also quickly select a new theme from the dropdown before regenerating.</li>
                    <li><strong className="flex items-center"><EyeOpenIcon className="mr-2 text-indigo-500"/>View:</strong> Opens the generated PDF in a new browser tab for a quick preview.</li>
                    <li><strong className="flex items-center"><DownloadIcon className="mr-2 text-green-500"/>Download:</strong> Downloads the PDF file to your computer.</li>
                    <li><strong className="flex items-center"><Pencil1Icon className="mr-2 text-blue-500"/>Edit:</strong> Opens this invoice in the 'Create Invoice' form, allowing you to make and save changes.</li>
                    <li><strong className="flex items-center"><TrashIcon className="mr-2 text-red-500"/>Delete:</strong> Permanently deletes the invoice from the server. A confirmation prompt will appear to prevent accidental deletion.</li>
                </ul>
             </>
        )
    }
];

export const FAQPage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Link
                    to="/dashboard"
                    className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-6"
                >
                    <ArrowLeftIcon className="mr-2" />
                    Back to App
                </Link>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Help & Frequently Asked Questions</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">A guide to the essential features of the PDF Invoicer application.</p>

                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                    {faqData.map((item, index) => (
                        <AccordionItem
                            key={index}
                            item={item}
                            isOpen={openIndex === index}
                            onClick={() => handleToggle(index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};