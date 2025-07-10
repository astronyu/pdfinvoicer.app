import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SenderInfo, BankInfo, PdfSchemeName, AppUser } from '../../types';
import * as supa from '../../services/supabase';
import { colorSchemes } from '../../services/pdfGenerator';
import { UploadIcon, DownloadIcon } from '@radix-ui/react-icons';
import { supabase } from '../../services/db';
import { importDataFromJson, exportDataToJson } from '../../services/importer';
import { useToast } from '../Toast';
import { useSettings } from '../../contexts/SettingsContext';
import { ConfirmationModal } from '../ConfirmationModal';

interface SettingsProps {
    currentUser: AppUser;
    onUserUpdate: (profile: AppUser['profile']) => void;
    onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, onUserUpdate, onLogout }) => {
    const { 
        settings, 
        pdfTheme, 
        loading: settingsLoading, 
        reloadSettings,
        updatePdfTheme,
    } = useSettings();
    const toast = useToast();
    const navigate = useNavigate();

    const [sender, setSender] = useState<Omit<SenderInfo, 'id' | 'userId'>>({ name: '', address: '', phone: '' });
    const [bank, setBank] = useState<Omit<BankInfo, 'id' | 'userId'>>({ bankAddress: '', contactName: '', contactPhone: '', contactEmail: '', bankName: '', swiftCode: '', accountNumber: '' });
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isExporting, setIsExporting] = useState(false);
    const [isJsonImporting, setIsJsonImporting] = useState(false);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (settings) {
            setSender(settings.sender);
            setBank(settings.bank);
        }
    }, [settings]);

    const schemeNames = Object.keys(colorSchemes) as PdfSchemeName[];
    
    const handleExport = async () => {
        if (!window.confirm("This will generate a JSON file containing all your invoices, clients, and settings. Are you sure you want to proceed?")) {
            return;
        }
        setIsExporting(true);
        try {
            await exportDataToJson(currentUser.id);
            toast.addToast('Data exported successfully!', 'success');
        } catch (error) {
            toast.addToast(`Error exporting data: ${(error as Error).message}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };
    
    const handleJsonImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsJsonImporting(true);
        try {
            const fileContent = await file.text();
            const jsonData = JSON.parse(fileContent);
            
            const result = await importDataFromJson(currentUser.id, jsonData);
            
            toast.addToast(`Successfully imported ${result.invoices} invoices, ${result.clients} clients, and various settings.`, 'success');
            
            // Reload settings to reflect imported values
            await reloadSettings();
        } catch (error) {
            console.error("JSON import failed:", error);
            toast.addToast((error as Error).message || "An unknown error occurred during JSON import.", 'error');
        } finally {
            setIsJsonImporting(false);
            // Reset file input so user can upload the same file again if needed
            event.target.value = '';
        }
    };

    const handleSenderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSender({ ...sender, [e.target.name]: e.target.value });
    };

    const handleBankChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setBank({ ...bank, [e.target.name]: e.target.value });
    };

    const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTheme = e.target.value as PdfSchemeName;
        updatePdfTheme(newTheme);
        toast.addToast('PDF theme updated!', 'success');
    };

    const handleSave = async () => {
        try {
            await Promise.all([
                supa.saveSenderInfo({ ...sender, userId: currentUser.id }),
                supa.saveBankInfo({ ...bank, userId: currentUser.id }),
            ]);
            await reloadSettings();
            toast.addToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.addToast('Error saving settings. Please check the console.', 'error');
        }
    };
    
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.addToast("New passwords do not match.", 'error');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            toast.addToast("New password must be at least 6 characters long.", 'error');
            return;
        }
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.addToast("Password changed successfully!", 'success');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            toast.addToast(`Error changing password: ${(error as Error).message}`, 'error');
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await supa.deleteUserAccount();
            toast.addToast("Your account has been deactivated. You will now be logged out.", 'success');
            setIsDeleteModalOpen(false);
            setTimeout(onLogout, 3000);
        } catch (error) {
            console.error(error);
            toast.addToast(`Error deleting account: ${(error as Error).message}`, 'error');
            setIsDeleteModalOpen(false);
        }
    };


    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400";
    
    const renderInput = (label: string, name: string, value: string, handler: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, required = false) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <input type="text" id={name} name={name} value={value} onChange={handler} placeholder={placeholder} required={required} className={inputClasses} />
        </div>
    );

     const renderPasswordInput = (label: string, id: string, value: string, handler: (e: React.ChangeEvent<HTMLInputElement>) => void) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <input type="password" id={id} name={id} value={value} onChange={handler} required className={inputClasses}/>
        </div>
    );
    
    const renderTextarea = (label: string, name: string, value: string, handler: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string) => (
         <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <textarea id={name} name={name} value={value} onChange={handler} placeholder={placeholder} rows={3} className={inputClasses}/>
        </div>
    );

    if (settingsLoading) return <div className="p-10 text-center">Loading settings...</div>;
    const credits = currentUser.profile.credits ?? 0;

    return (
        <>
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Account"
                message={
                    <>
                        <p>This action is irreversible and will permanently deactivate your account and delete all associated data (invoices, clients, settings).</p>
                        <p className="font-bold mt-2">Are you absolutely sure?</p>
                    </>
                }
                confirmInput="DELETE"
            />
            <div className="max-w-4xl mx-auto space-y-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
                
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6">Credits</h3>
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                        <div className="text-center sm:text-left mb-4 sm:mb-0">
                            <p className="font-medium text-gray-600 dark:text-gray-300">Your Current Balance</p>
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{credits >= 9999 ? '∞' : credits}</p>
                        </div>
                        <button
                            onClick={() => navigate('/buy-credits')}
                            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
                        >
                            Buy More Credits
                        </button>
                    </div>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Creating a new invoice costs 1 credit. Editing or re-generating PDFs is free.
                    </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6">Sender Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInput("Your Name / Company", "name", sender.name, handleSenderChange, "e.g. John Doe", true)}
                        {renderInput("Phone Number", "phone", sender.phone, handleSenderChange, "e.g. +1 123 456 7890", true)}
                        <div className="md:col-span-2">
                            {renderTextarea("Address", "address", sender.address, handleSenderChange, "123 Main St\nNew York, NY 10001")}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6">Bank Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInput("Bank Name", "bankName", bank.bankName, handleBankChange, "e.g. Global Bank Inc.", true)}
                        {renderInput("Account Number", "accountNumber", bank.accountNumber, handleBankChange, "e.g. 1234567890", true)}
                        {renderInput("SWIFT Code / IBAN", "swiftCode", bank.swiftCode, handleBankChange, "e.g. GLOBUK2LXXX")}
                        {renderInput(
                            "Contact Name (for Signature)",
                            "contactName",
                            bank.contactName,
                            handleBankChange,
                            "e.g. Jane Doe (Finance)"
                        )}
                        {renderInput("Contact Phone", "contactPhone", bank.contactPhone, handleBankChange, "e.g. +1 123 456 7891")}
                        {renderInput("Contact Email", "contactEmail", bank.contactEmail, handleBankChange, "e.g. finance@example.com")}
                        <div className="md:col-span-2">
                            {renderTextarea("Bank Address", "bankAddress", bank.bankAddress, handleBankChange, "456 Banking Ave\nLondon, UK SW1A 0AA")}
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6">PDF Appearance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label htmlFor="pdfTheme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color Scheme</label>
                            <select id="pdfTheme" name="pdfTheme" value={pdfTheme} onChange={handleThemeChange} className={inputClasses}>
                                {schemeNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Select a color theme for your generated PDF invoices. Saved automatically.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Signature Preview</label>
                            <div className="mt-2 p-4 border dark:border-gray-600 rounded-md text-center bg-gray-50 dark:bg-gray-900/50">
                                <p className="text-2xl" style={{ fontFamily: 'Helvetica, sans-serif', fontStyle: 'italic' }}>
                                    {bank.contactName || sender.name || "Signature Preview"}
                                </p>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">The signature on your PDF will be rendered in an elegant, cursive style.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        Save General Settings
                    </button>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6">Data Management</h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Export Data</h4>
                            <p className="text-gray-600 dark:text-gray-400 mt-1 mb-3 text-sm">Download a full backup of all your invoices, clients, and settings as a single JSON file. Keep this file safe.</p>
                            <button 
                                onClick={handleExport} 
                                disabled={isExporting}
                                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                            >
                                <DownloadIcon className="mr-2"/>
                                {isExporting ? 'Exporting...' : 'Export All Data'}
                            </button>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Import Data</h4>
                            <p className="text-gray-600 dark:text-gray-400 mt-1 mb-3 text-sm">Restore your data from a previously exported JSON backup file. This will overwrite any conflicting data.</p>
                            <label htmlFor="json-importer" className="px-5 py-2 bg-gray-600 text-white font-bold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer w-full sm:w-auto">
                                <UploadIcon className="mr-2"/>
                                {isJsonImporting ? 'Importing...' : 'Import from JSON Backup'}
                            </label>
                            <input id="json-importer" type="file" className="hidden" accept=".json" onChange={handleJsonImport} disabled={isJsonImporting} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg mt-8">
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-4 mb-6">Security</h3>
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Change Password</h4>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderPasswordInput("New Password", "newPassword", newPassword, (e) => setNewPassword(e.target.value))}
                                {renderPasswordInput("Confirm New Password", "confirmPassword", confirmPassword, (e) => setConfirmPassword(e.target.value))}
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-6 rounded-xl shadow-lg mt-8">
                    <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">Danger Zone</h3>
                    <p className="text-red-600 dark:text-red-300 mt-2 mb-4 text-sm">This will permanently delete all your invoice data and deactivate your account.</p>
                    <button 
                        onClick={() => setIsDeleteModalOpen(true)} 
                        className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    >
                        Delete My Account
                    </button>
                </div>
            </div>
        </>
    );
};