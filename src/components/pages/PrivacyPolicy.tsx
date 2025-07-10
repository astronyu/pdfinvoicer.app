import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@radix-ui/react-icons';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10">
                 <Link
                    to="/dashboard"
                    className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-6"
                >
                    <ArrowLeftIcon className="mr-2" />
                    Back to App
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Privacy Policy</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="prose dark:prose-invert max-w-none space-y-4 text-gray-700 dark:text-gray-300">
                    <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>

                    <h2 className="text-xl font-semibold">1. Information Collection and Use</h2>
                    <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
                    
                    <h3 className="text-lg font-medium">Personal Data</h3>
                    <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to: Email address and Password.</p>

                    <h3 className="text-lg font-medium">Invoice Data</h3>
                    <p>All invoice information, client details, and financial data you enter into the application is linked to your account and stored securely on our backend servers.</p>

                    <h2 className="text-xl font-semibold">2. Data Storage and Security</h2>
                    <p>Your data is stored securely in a cloud database. We implement industry-standard security practices to protect your data. We use Supabase as our backend service provider, which provides the database and authentication infrastructure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>

                    <h2 className="text-xl font-semibold">3. Use of Your Personal Data</h2>
                    <p>The Application may use Personal Data for the following purposes:
                    <ul className="list-disc pl-6">
                        <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
                        <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.</li>
                    </ul>
                    </p>
                    
                    <h2 className="text-xl font-semibold">4. Changes to This Privacy Policy</h2>
                    <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

                    <p>If you have any questions about this Privacy Policy, please contact us, or for specific data protection inquiries in Malaysia, contact the Personal Data Protection Department at their official portal: <a href="https://daftar.pdp.gov.my/p_aduan" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">https://daftar.pdp.gov.my/p_aduan</a>.</p>
                </div>
            </div>
        </div>
    );
};