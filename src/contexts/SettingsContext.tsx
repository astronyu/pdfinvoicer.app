import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppUser, SenderInfo, BankInfo, PdfSchemeName } from '../types';
import * as supa from '../services/supabase';

// Define the shape of the context data
interface SettingsContextType {
    settings: { sender: SenderInfo; bank: BankInfo } | null;
    pdfTheme: PdfSchemeName;
    loading: boolean;
    reloadSettings: () => Promise<void>;
    updatePdfTheme: (theme: PdfSchemeName) => void;
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
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            // Fetch all settings concurrently
            const [senderInfo, bankInfo, theme] = await Promise.all([
                supa.getSenderInfo(userId),
                supa.getBankInfo(userId),
                supa.getSetting(userId, 'pdfTheme'),
            ]);

            // Both sender and bank info are required for creating invoices.
            // If either is missing, we consider settings incomplete.
            if (senderInfo && bankInfo) {
                setSettings({ sender: senderInfo, bank: bankInfo });
            } else {
                setSettings(null); // Mark as incomplete
            }
            setPdfTheme((theme as PdfSchemeName) || 'Classic');

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

    const value = {
        settings,
        pdfTheme,
        loading,
        reloadSettings,
        updatePdfTheme,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
