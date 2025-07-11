import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@radix-ui/react-icons';

export const TermsOfService: React.FC = () => {
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Terms of Service</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="prose dark:prose-invert max-w-none space-y-4 text-gray-700 dark:text-gray-300">
                    <p>Welcome to PDF Invoicer! These terms and conditions outline the rules and regulations for the use of our application.</p>

                    <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
                    <p>By accessing and using our application, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement.</p>

                    <h2 className="text-xl font-semibold">2. Description of Service</h2>
                    <p>Our application provides users with the ability to create, manage, and download invoices in PDF format. The service is provided "as is" and we assume no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.</p>

                    <h2 className="text-xl font-semibold">3. User Accounts</h2>
                    <p>To access most features of the application, you must register for a user account. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

                    <h2 className="text-xl font-semibold">4. User Content</h2>
                    <p>You are solely responsible for all information, data, text, or other materials ("content") that you upload, post, or otherwise transmit via the service. We do not claim ownership of any content you submit. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, and process such content solely for the purpose of providing the service to you.</p>

                    <h2 className="text-xl font-semibold">5. Limitation of Liability</h2>
                    <p>In no event shall PDF Invoicer, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
                    
                    <h2 className="text-xl font-semibold">6. Changes to Terms</h2>
                    <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this page. Your continued use of the service after any such changes constitutes your acceptance of the new Terms.</p>

                    <p>If you have any questions about these Terms, please contact us.</p>
                </div>
            </div>
        </div>
    );
};
