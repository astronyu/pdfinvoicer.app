import { z } from 'zod';
import { colorSchemes } from './pdfGenerator';

export const LineItemSchema = z.object({
    id: z.number().optional(),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
});

export const InvoiceSchema = z.object({
    id: z.number().optional(),
    invoiceNumber: z.string(),
    date: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
    client: z.string().min(1, { message: "Client name cannot be empty" }),
    clientAddress: z.string(),
    clientReference: z.string(),
    projectReference: z.string(),
    expensesIncluded: z.boolean(),
    renderedService: z.string(),
    currency: z.string(),
    items: z.array(LineItemSchema).min(1, { message: "Invoice must have at least one line item" }),
    taxRate: z.number(),
    total: z.number(),
    workDates: z.array(z.string()).optional().nullable(),
    travelDates: z.array(z.string()).optional().nullable(),
    status: z.enum(['Paid', 'Unpaid', 'Overdue']).optional().nullable(),
});

export const ClientSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    address: z.string(),
});

export const SenderInfoSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    address: z.string(),
    phone: z.string(),
}).nullable();

export const BankInfoSchema = z.object({
    id: z.number().optional(),
    bankAddress: z.string(),
    contactName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().email(),
    bankName: z.string(),
    swiftCode: z.string(),
    accountNumber: z.string(),
}).nullable();

const pdfSchemeNames = Object.keys(colorSchemes) as [string, ...string[]];
export const AppSettingsSchema = z.object({
    pdfTheme: z.enum(pdfSchemeNames),
});

export const BackupDataSchema = z.object({
    invoices: z.array(InvoiceSchema).optional(),
    clients: z.array(ClientSchema).optional(),
    // Preprocess to handle cases where info is incorrectly wrapped in an array
    senderInfo: z.preprocess(
        (val) => (Array.isArray(val) ? val[0] : val),
        SenderInfoSchema
    ).optional(),
    bankInfo: z.preprocess(
        (val) => (Array.isArray(val) ? val[0] : val),
        BankInfoSchema
    ).optional(),
    settings: AppSettingsSchema.optional(),
});