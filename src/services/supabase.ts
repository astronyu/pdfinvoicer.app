import { supabase } from './db';
import { Invoice, SenderInfo, BankInfo, Client, AppSettings, PdfSchemeName, LineItem } from '../types';
import type {
    Database,
    InvoiceRow,
    ClientRow,
    SenderInfoRow,
    BankInfoRow,
    AppSettingsRow,
    ProfileRow,
    AppSettingsInsert,
    InvoiceInsert,
    InvoiceUpdate,
    ClientInsert,
    SenderInfoInsert,
    BankInfoInsert,
    ProfileUpdate,
    AdminUserView,
    Json
} from '../types/supabase';
import { z } from 'zod';
import { LineItemSchema } from './schemas';

// Helper function to map snake_case DB rows to camelCase app types
const mapDbInvoiceToApp = (inv: InvoiceRow): Invoice => {
    // Safely parse the 'items' field to prevent crashes on malformed data
    const safeItemsParse = z.array(LineItemSchema).safeParse(inv.items);
    let validatedItems: LineItem[] = [];
    if (safeItemsParse.success) {
        validatedItems = safeItemsParse.data as LineItem[];
    } else if (inv.items) { // only log if there was something to parse
        console.warn(`Failed to parse line items for invoice #${inv.invoice_number}. Data was:`, inv.items, "Error:", safeItemsParse.error);
    }

    return {
        id: inv.id,
        userId: inv.user_id,
        invoiceNumber: inv.invoice_number,
        date: inv.date,
        client: inv.client,
        clientAddress: inv.client_address,
        clientReference: inv.client_reference,
        projectReference: inv.project_reference,
        expensesIncluded: inv.expenses_included,
        renderedService: inv.rendered_service,
        currency: inv.currency,
        items: validatedItems, // Use the safely parsed items
        taxRate: inv.tax_rate,
        total: inv.total,
        workDates: inv.work_dates || [],
        travelDates: inv.travel_dates || [],
        status: inv.status as 'Paid' | 'Unpaid' | 'Overdue' | undefined,
    };
};

// --- Settings ---
export const getSetting = async (userId: string, key: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();

    if (error) {
        console.error(`Error getting setting for key "${key}":`, error.message);
        return null;
    }
    return (data as AppSettingsRow)?.value || null;
};

export const saveSetting = async (userId: string, key: string, value: string) => {
    const payload: AppSettingsInsert = { user_id: userId, key, value };
    const { error } = await supabase
        .from('app_settings')
        .upsert(payload, { onConflict: 'user_id, key' });
    if (error) console.error(`Error saving setting for key "${key}":`, error.message);
};


// --- Invoice ---
export const getInvoiceById = async (invoiceId: number): Promise<Invoice | null> => {
    const { data: inv, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

    if (error) {
        console.error('Error getting invoice by ID:', error.message);
        return null;
    }

    return inv ? mapDbInvoiceToApp(inv as InvoiceRow) : null;
};

export const getAllUserInvoices = async (userId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error getting all user invoices:', error.message);
        return [];
    }
    const invoicesData: InvoiceRow[] = (data as InvoiceRow[]) || [];
    return invoicesData.map(mapDbInvoiceToApp);
};

export const updateInvoiceStatus = async (invoiceId: number, status: 'Paid' | 'Unpaid' | 'Overdue') => {
    const payload: InvoiceUpdate = { status };
    return await supabase.from('invoices').update(payload).eq('id', invoiceId);
};

export const getNextInvoiceNumber = async (userId: string): Promise<string> => {
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const pattern = `%-${yearSuffix}`;

    const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .like('invoice_number', pattern)
        .order('invoice_number', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching next invoice number:", error.message);
        return `0001-${yearSuffix}`;
    }

    if (data && data.length > 0) {
        try {
            const lastNum = parseInt((data[0] as Pick<InvoiceRow, 'invoice_number'>).invoice_number.split('-')[0], 10);
            return `${(lastNum + 1).toString().padStart(4, '0')}-${yearSuffix}`;
        } catch {
            // fallback
        }
    }
    return `0001-${yearSuffix}`;
};

export const addOrUpdateInvoice = async (invoice: Invoice) => {
    // Map from camelCase app type to snake_case DB type.
    // NOTE: 'id' is intentionally omitted from this payload.
    // It is used in the .eq() filter for updates or is auto-generated for inserts.
    const dbInvoicePayload = {
        user_id: invoice.userId,
        invoice_number: invoice.invoiceNumber,
        date: invoice.date,
        client: invoice.client,
        client_address: invoice.clientAddress,
        client_reference: invoice.clientReference,
        project_reference: invoice.projectReference,
        expenses_included: invoice.expensesIncluded,
        rendered_service: invoice.renderedService,
        currency: invoice.currency,
        items: invoice.items as unknown as Json,
        tax_rate: invoice.taxRate,
        total: invoice.total,
        work_dates: invoice.workDates,
        travel_dates: invoice.travelDates,
        status: invoice.status,
    };

    // Ensure the client exists in the 'clients' table before saving the invoice.
    // This can remain as an upsert since client names are unique per user.
    if (invoice.client) {
        const clientPayload: ClientInsert = { user_id: invoice.userId, name: invoice.client, address: invoice.clientAddress };
        const { error: clientError } = await supabase.from('clients').upsert(
            clientPayload,
            { onConflict: 'user_id, name' }
        );
        if (clientError) {
             console.error('Failed to upsert client:', clientError);
             return { data: null, error: clientError };
        }
    }

    if (invoice.id) {
        // UPDATE an existing invoice
        const { data, error } = await supabase
            .from('invoices')
            .update(dbInvoicePayload)
            .eq('id', invoice.id)
            .select()
            .single();

        return { data, error };

    } else {
        // CREATE a new invoice
        const { data, error } = await supabase
            .from('invoices')
            .insert(dbInvoicePayload)
            .select()
            .single();

        return { data, error };
    }
};

export const deleteInvoiceById = async (invoiceId: number) => {
    return await supabase.from('invoices').delete().eq('id', invoiceId);
};


// --- Clients ---
export const getAllClients = async (userId: string): Promise<Client[]> => {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('name');
    if (error) {
        console.error("Error getting clients:", error.message);
        return [];
    }
    const clientsData: ClientRow[] = (data as ClientRow[]) || [];
    return clientsData.map((c) => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        address: c.address
    }));
};

export const addOrUpdateClient = async (client: Client) => {
    const dbClient: ClientInsert = { id: client.id, user_id: client.userId, name: client.name, address: client.address };
    return await supabase.from('clients').upsert(dbClient, { onConflict: 'user_id, name' });
};


export const deleteClient = async (clientId: number) => {
    // Note: You might want to handle what happens to invoices associated with this client.
    // A database trigger/cascade could do this, or it can be handled here.
    return await supabase.from('clients').delete().eq('id', clientId);
};

// --- Sender Info ---
export const getSenderInfo = async (userId: string): Promise<SenderInfo | null> => {
    const { data, error } = await supabase
        .from('sender_info')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error getting sender info:', error.message);
        return null;
    }
    if (!data) return null;
    const senderInfoRow = data as SenderInfoRow;
    return {
        id: senderInfoRow.id,
        userId: senderInfoRow.user_id,
        name: senderInfoRow.name,
        address: senderInfoRow.address,
        phone: senderInfoRow.phone
    };
};

export const saveSenderInfo = async (info: SenderInfo) => {
    const dbInfo: SenderInfoInsert = { id: info.id, user_id: info.userId, name: info.name, address: info.address, phone: info.phone };
    return await supabase.from('sender_info').upsert(dbInfo, { onConflict: 'user_id' });
};

// --- Bank Info ---
export const getBankInfo = async (userId: string): Promise<BankInfo | null> => {
    const { data, error } = await supabase
        .from('bank_info')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error getting bank info:', error.message);
        return null;
    }
    if (!data) {
        console.log('[supabase.ts] getBankInfo - No bank info found for user:', userId);
        return null;
    }
    const bankInfoRow = data as BankInfoRow;
    console.log('[supabase.ts] getBankInfo - Raw data from DB:', bankInfoRow);
    console.log('[supabase.ts] getBankInfo - Mapped bankAddress:', bankInfoRow.bank_address);
    return {
        id: bankInfoRow.id,
        userId: bankInfoRow.user_id,
        bankAddress: bankInfoRow.bank_address,
        contactName: bankInfoRow.contact_name,
        contactPhone: bankInfoRow.contact_phone,
        contactEmail: bankInfoRow.contact_email,
        bankName: bankInfoRow.bank_name,
        swiftCode: bankInfoRow.swift_code,
        accountNumber: bankInfoRow.account_number
    };
};

export const saveBankInfo = async (info: BankInfo) => {
    console.log('[supabase.ts] saveBankInfo - Info received for saving:', info);
    const dbInfo: BankInfoInsert = {
        id: info.id,
        user_id: info.userId,
        bank_address: info.bankAddress,
        contact_name: info.contactName,
        contact_phone: info.contactPhone,
        contact_email: info.contactEmail,
        bank_name: info.bankName,
        swift_code: info.swiftCode,
        account_number: info.account_number
    };
    console.log('[supabase.ts] saveBankInfo - Payload sent to DB:', dbInfo);
    const { data, error } = await supabase.from('bank_info').upsert(dbInfo, { onConflict: 'user_id' });
    if (error) {
        console.error('[supabase.ts] saveBankInfo - Error saving bank info:', error.message);
    } else {
        console.log('[supabase.ts] saveBankInfo - Successfully saved bank info:', data);
    }
    return { data, error };
};

// --- User Profile/Account ---
export const getProfile = async (userId: string): Promise<ProfileRow | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error getting profile:', error.message);
        return null;
    }
    return data as ProfileRow;
};

export const updateProfile = async (userId: string, updates: ProfileUpdate) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) {
        console.error("Error updating profile:", error.message);
        throw error;
    }
};

export const deductCredit = async (userId: string) => {
    // BETA MODE: Credit deduction is disabled to prevent app crashes and allow free testing.
    return null;

    /*
    // This should ideally be an RPC call to prevent race conditions
    // and for security, but for simplicity, we do it client-side.
    const { data: profile } = await supabase.from('profiles').select('credits, is_admin').single();
    if (!profile || profile.is_admin || profile.credits >= 9999) return null;
    if (profile.credits <= 0) throw new Error("Insufficient credits");

    const newCredits = profile.credits - 1;
    await supabase.from('profiles').update({ credits: newCredits }).eq('id', userId);
    return { credits: newCredits };
    */
};

export const deleteUserAccount = async () => {
    // This calls a secure database function that deletes all a user's data
    // (invoices, clients, etc.) and then deactivates their profile.
    const { error } = await supabase.rpc('handle_soft_delete_user');
    if (error) {
        console.error("Error during soft delete RPC call:", error);
        throw error;
    }
};

// --- Admin ---
export const adminGetAllUsers = async (): Promise<AdminUserView[]> => {
    const { data, error } = await supabase.rpc('admin_get_all_users');
    if (error) {
        console.error("Admin error getting users:", error.message);
        throw error;
    }
    return (data as AdminUserView[]) || [];
};

export const adminCountInvoicesPerUser = async (): Promise<Map<string, number>> => {
    const { data, error } = await supabase.rpc('admin_count_invoices_per_user');
    if (error) {
        console.error("Admin error getting invoice counts:", error.message);
        throw error;
    }
    const countsMap = new Map<string, number>();
    if (data) {
        for (const item of data) {
            if (item.email) {
                countsMap.set(item.email, item.invoice_count);
            }
        }
    }
    return countsMap;
};

export const adminPromoteUser = async(userId: string, isAdmin: boolean) => {
    const payload: ProfileUpdate = { is_admin: isAdmin };
    return await supabase.from('profiles').update(payload).eq('id', userId);
};

export const adminAwardUnlimitedCredits = async (userId: string) => {
    const payload: ProfileUpdate = { credits: 9999 };
    return await supabase.from('profiles').update(payload).eq('id', userId);
};

export const adminDeleteUser = async (userId: string) => {
    // Perform a "soft delete" by deactivating the user's profile.
    const { error } = await supabase.from('profiles').update({ status: 'deactivated' }).eq('id', userId);
    if (error) {
        throw error;
    }
};
