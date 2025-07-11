import React from 'react';
import { PersonIcon } from '@radix-ui/react-icons';

export const ContactPage: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">Contact</h2>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8">
                <div className="flex items-start">
                     <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50">
                            <PersonIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                        </span>
                    </div>
                    <div className="ml-6 flex-grow">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">A Note from the Creator</h3>
                        <div className="prose dark:prose-invert max-w-none mt-4 text-gray-600 dark:text-gray-300">
                             <p>Hi there! Aizal here 👋</p>
                            <p>Thank you so much for checking out PDF Invoicer — whether you're just exploring or already using it to manage your invoices, I truly appreciate your time and support. This app was built with simplicity, privacy, and productivity in mind, and it means a lot to see it being used by people like you.</p>
                            <p>
                                If you have any feedback, ideas, or just want to say hi, feel free to reach out to me on{' '}
                                <a href="https://x.com/ShaifulAizal" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">X (formerly Twitter)</a>. I’d love to hear from you!
                            </p>
                            <p className="mt-6">
                                Warm regards,<br />
                                Aizal Abdullah<br />
                                Creator of PDF Invoicer
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
