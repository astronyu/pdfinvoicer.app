
import { User as SupabaseUser } from '@supabase/supabase-js';

// This combines the Supabase user with our custom profile data
export type AppUser = SupabaseUser & {
    profile: {
        is_admin?: boolean;
        credits?: number;
        status?: 'active' | 'deactivated' | null;
    };
};

export interface SenderInfo {
    id?: number;
    userId: string;
    name: string;
    address: string;
    phone: string;
}

export interface BankInfo {
    id?: number;
    userId: string;
    bankAddress: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    bankName: string;
    swiftCode: string;
    accountNumber: string;
}

export interface Client {
    id?: number;
    userId: string;
    name: string;
    address: string;
}

export interface AppSettings {
    pdfTheme: PdfSchemeName;
}

export type PdfSchemeName =
    | 'Classic'
    | 'Sapphire & Gold'
    | 'Emerald & Silver'
    | 'Ruby & Slate'
    | 'Amethyst & Pearl'
    | 'Ocean & Coral'
    | 'Sunset & Vineyard'
    | 'Forest & Birch'
    | 'Midnight & Mint'
    | 'Charcoal & Amber'
    | 'Plum & Copper'
    | 'Teal & Terracotta';


export interface PdfColorTheme {
    primary: string;
    secondary: string;
    accent: string;
    headerBar: string;
    headerBg: string;
    textLight: string;
    textDark: string;
    tableBgPrimary: string;
    tableBgSecondary: string;
}

export interface Settings {
    sender: SenderInfo;
    bank: BankInfo;
}

export interface LineItem {
    id?: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
}

export interface Invoice {
    id?: number;
    userId: string;
    invoiceNumber: string;
    date: string;
    client: string;
    clientAddress: string;
    clientReference: string;
    projectReference: string;
    expensesIncluded: boolean;
    renderedService: string;
    currency: string;
    items: LineItem[];
    taxRate: number;
    total: number;
    workDates?: string[];
    travelDates?: string[];
    status?: 'Paid' | 'Unpaid' | 'Overdue';
}