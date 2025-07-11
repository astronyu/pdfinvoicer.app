import * as supa from './supabase';
import { PdfSchemeName, Client, Invoice, SenderInfo, BankInfo, LineItem } from '../types';
import { BackupDataSchema } from './schemas';
import { ZodError } from 'zod';


export async function exportDataToJson(userId: string): Promise<void> {
    try {
        const [invoices, clients, senderInfo, bankInfo, pdfTheme] = await Promise.all([
            supa.getAllUserInvoices(userId),
            supa.getAllClients(userId),
            supa.getSenderInfo(userId),
            supa.getBankInfo(userId),
            supa.getSetting(userId, 'pdfTheme')
        ]);

        const backupData = {
            invoices,
            clients,
            senderInfo,
            bankInfo,
            settings: { pdfTheme }
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf_invoicer_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Data export failed:", error);
        if (error instanceof Error) {
            throw new Error(`Export failed during processing: ${error.message}`);
        }
        throw new Error("An unknown error occurred during data export.");
    }
}


export async function importDataFromJson(userId: string, jsonData: any): Promise<{invoices: number, clients: number, settings: number}> {
    try {
        // Validate the entire JSON structure at once using Zod
        const validatedData = BackupDataSchema.parse(jsonData);
        
        const importSummary = { invoices: 0, clients: 0, settings: 0 };

        // Import Clients
        if (validatedData.clients) {
            for (const client of validatedData.clients) {
                const newClient: Client = {
                    id: client.id,
                    userId,
                    name: client.name,
                    address: client.address,
                };
                await supa.addOrUpdateClient(newClient);
            }
            importSummary.clients = validatedData.clients.length;
        }

        // Import Invoices
        if (validatedData.invoices) {
            for (const invoice of validatedData.invoices) {
                const newInvoice: Invoice = {
                    id: invoice.id,
                    userId,
                    invoiceNumber: invoice.invoiceNumber,
                    date: invoice.date,
                    client: invoice.client,
                    clientAddress: invoice.clientAddress,
                    clientReference: invoice.clientReference,
                    projectReference: invoice.projectReference,
                    expensesIncluded: invoice.expensesIncluded,
                    renderedService: invoice.renderedService,
                    currency: invoice.currency,
                    items: invoice.items as LineItem[],
                    taxRate: invoice.taxRate,
                    total: invoice.total,
                    workDates: invoice.workDates ?? undefined,
                    travelDates: invoice.travelDates ?? undefined,
                    status: invoice.status ?? undefined,
                };
                await supa.addOrUpdateInvoice(newInvoice);
            }
            importSummary.invoices = validatedData.invoices.length;
        }

        // Import Settings
        let settingsCount = 0;
        if (validatedData.senderInfo) {
            const newSenderInfo: SenderInfo = {
                id: validatedData.senderInfo.id,
                userId,
                name: validatedData.senderInfo.name,
                address: validatedData.senderInfo.address,
                phone: validatedData.senderInfo.phone,
            };
            await supa.saveSenderInfo(newSenderInfo);
            settingsCount++;
        }
        if (validatedData.bankInfo) {
            const newBankInfo: BankInfo = {
                id: validatedData.bankInfo.id,
                userId,
                bankAddress: validatedData.bankInfo.bankAddress,
                contactName: validatedData.bankInfo.contactName,
                contactPhone: validatedData.bankInfo.contactPhone,
                contactEmail: validatedData.bankInfo.contactEmail,
                bankName: validatedData.bankInfo.bankName,
                swiftCode: validatedData.bankInfo.swiftCode,
                accountNumber: validatedData.bankInfo.accountNumber,
            };
            await supa.saveBankInfo(newBankInfo);
            settingsCount++;
        }
        if (validatedData.settings?.pdfTheme) {
            await supa.saveSetting(userId, 'pdfTheme', validatedData.settings.pdfTheme as PdfSchemeName);
            settingsCount++;
        }
        importSummary.settings = settingsCount;

        return importSummary;

    } catch (error) {
        console.error("JSON data import failed:", error);
        if (error instanceof ZodError) {
            const issue = error.issues[0];
            const path = issue.path.join(' -> ');
            const errorMessage = `Invalid data in backup file. Field '${path}': ${issue.message}.`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
        if (error instanceof Error) {
            throw new Error(`Import failed during processing: ${error.message}`);
        }
        throw new Error("An unknown error occurred during JSON data import.");
    }
}
