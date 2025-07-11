import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, RocketIcon, CheckIcon } from '@radix-ui/react-icons';

export const BuyCreditsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto">
            <button 
                onClick={() => navigate('/settings')}
                className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-6"
            >
                <ArrowLeftIcon className="mr-2" />
                Back to Settings
            </button>
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Buy Credits</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Purchase credits to create new invoices. 1 credit = 1 new invoice.
                </p>
            </div>

            <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 my-6 rounded-r-lg" role="alert">
                <div className="flex items-center">
                    <RocketIcon className="h-6 w-6 mr-3"/>
                    <div>
                        <p className="font-bold">Feature Coming Soon!</p>
                        <p className="text-sm">Purchasing is currently disabled during our beta phase. All users have been granted complimentary credits. Enjoy!</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <CreditPackage credits={5} price="RM10" />
                <CreditPackage credits={15} price="RM15" tag="Popular" isFeatured />
                <CreditPackage credits={30} price="RM50" tag="Best Value" tagColor="bg-green-400 text-green-900" />
            </div>

            <div className="mt-12">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-center text-gray-700 dark:text-gray-200">All Packages Include</h3>
                    <ul className="mt-6 space-y-3 text-gray-600 dark:text-gray-300">
                        <li className="flex items-center"><CheckIcon className="w-5 h-5 text-green-500 mr-3" /> One-time payment, no subscription.</li>
                        <li className="flex items-center"><CheckIcon className="w-5 h-5 text-green-500 mr-3" /> Credits never expire.</li>
                        <li className="flex items-center"><CheckIcon className="w-5 h-5 text-green-500 mr-3" /> Secure payment processing.</li>
                    </ul>
                     <div className="mt-8 text-center">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Supported Payment Methods:</p>
                        <div className="flex justify-center items-center mt-3">
                            <img 
                                src="https://upgvvoufmlhrecgltdge.supabase.co/storage/v1/object/public/assets/Billplz_checkout.png" 
                                alt="Supported payment methods including Billplz, FPX, credit cards, and e-wallets" 
                                className="h-auto max-w-full sm:max-w-sm rounded-md shadow-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">...and major Malaysian e-wallets like TnG, GrabPay, Boost & more via our payment gateway.</p>
                     </div>
                </div>
            </div>
        </div>
    );
};

const CreditPackage: React.FC<{
    credits: number;
    price: string;
    tag?: string;
    tagColor?: string;
    isFeatured?: boolean;
}> = ({ credits, price, tag, tagColor = 'bg-yellow-400 text-yellow-900', isFeatured = false }) => (
    <div className={`relative border-2 ${isFeatured ? 'border-blue-600' : 'border-gray-200 dark:border-gray-700'} rounded-xl p-6 text-center flex flex-col`}>
        {tag && (
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full ${tagColor}`}>
                {tag}
            </div>
        )}
        <div className="flex-grow">
            <p className="text-5xl font-extrabold text-gray-800 dark:text-gray-100">{credits}</p>
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Credits</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-4">{price}</p>
        </div>
        <button
            disabled
            className="w-full mt-6 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition"
        >
            Purchase
        </button>
    </div>
);
