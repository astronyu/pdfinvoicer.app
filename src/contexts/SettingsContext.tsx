import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppUser, SenderInfo, BankInfo, PdfSchemeName, SignatureFontName } from '../types';
import * as supa from '../services/supabase';

// Define the shape of the context data
interface SettingsContextType {
    settings: { sender: SenderInfo; bank: BankInfo } | null;
    pdfTheme: PdfSchemeName;
    signatureFont: SignatureFontName; // Add signatureFont
    loading: boolean;
    reloadSettings: () => Promise<void>;
    updatePdfTheme: (theme: PdfSchemeName) => void;
    updateSignatureFont: (font: SignatureFontName) => void; // Add updateSignatureFont
}

// Create the context with a default undefined value
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Custom hook to use the settings context
export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// Define the props for the provider component
interface SettingsProviderProps {
    children: ReactNode;
    currentUser: AppUser | null;
}

// The provider component that will wrap parts of the app
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children, currentUser }) => {
    const [settings, setSettings] = useState<{ sender: SenderInfo; bank: BankInfo } | null>(null);
    const [pdfTheme, setPdfTheme] = useState<PdfSchemeName>('Classic');
    const [signatureFont, setSignatureFont] = useState<SignatureFontName>('Times-Italic'); // Initialize with new default

    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            // Fetch all settings concurrently
            const [senderInfo, bankInfo, themeSetting, profileData] = await Promise.all([
                supa.getSenderInfo(userId),
                supa.getBankInfo(userId),
                supa.getSetting(userId, 'pdfTheme'),
                supa.getProfile(userId) // Fetch profile to get signature_font
            ]);

            // Ensure default empty objects if info is missing
            const defaultSender: SenderInfo = { userId, name: '', address: '', phone: '' };
            const defaultBank: BankInfo = { userId, bankAddress: '', contactName: '', contactPhone: '', contactEmail: '', bankName: '', swiftCode: '', accountNumber: '' };

            const finalSender = senderInfo || defaultSender;
            const finalBank = bankInfo || defaultBank;

            console.log('[SettingsContext.tsx] fetchSettings - Fetched senderInfo:', senderInfo);
            console.log('[SettingsContext.tsx] fetchSettings - Fetched bankInfo:', bankInfo);
            console.log('[SettingsContext.tsx] fetchSettings - Final bank address for state:', finalBank.bankAddress);

            setSettings({
                sender: finalSender,
                bank: finalBank,
            });
            setPdfTheme((themeSetting as PdfSchemeName) || 'Classic');
            setSignatureFont((profileData?.signature_font as SignatureFontName) || 'Times-Italic'); // Set signature font from profile, new default

        } catch (error) {
            console.error("Failed to fetch settings:", error);
            setSettings(null); // Reset on error to indicate a problem
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect to fetch settings when the user logs in or changes
    useEffect(() => {
        if (currentUser?.id) {
            fetchSettings(currentUser.id);
        } else {
            // Reset state if there's no user (logged out)
            setLoading(false);
            setSettings(null);
            setPdfTheme('Classic');
            setSignatureFont('Times-Italic'); // Reset to new default
        }
    }, [currentUser, fetchSettings]);
    
    // A function to allow components to trigger a refetch of settings
    const reloadSettings = useCallback(async () => {
        if (currentUser?.id) {
            await fetchSettings(currentUser.id);
        }
    }, [currentUser, fetchSettings]);
    
    // Function for optimistic UI update for PDF theme
    const updatePdfTheme = useCallback((theme: PdfSchemeName) => {
        if (!currentUser?.id) return;
        setPdfTheme(theme); // Optimistically update the UI
        supa.saveSetting(currentUser.id, 'pdfTheme', theme)
            .catch(err => console.error("Failed to save PDF theme:", err)); // Save in background
    }, [currentUser]);

    // Function for optimistic UI update for Signature Font
    const updateSignatureFont = useCallback((font: SignatureFontName) => {
        if (!currentUser?.id) return;
        setSignatureFont(font); // Optimistically update the UI
        supa.updateProfile(currentUser.id, { signature_font: font }) // Save to profiles table
            .catch(err => console.error("Failed to save signature font:", err)); // Save in background
    }, [currentUser]);

    const value = {
        settings,
        pdfTheme,
        signatureFont, // Provide signatureFont
        loading,
        reloadSettings,
        updatePdfTheme,
        updateSignatureFont, // Provide updateSignatureFont
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
