import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, LineItem, Client, AppUser } from '../../types';
import * as supa from '../../services/supabase';
import { supabase } from '../../services/db';
import { PlusIcon, TrashIcon, ChevronDownIcon, IdCardIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { DateRangePicker } from '../DateRangePicker';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../Toast';
import { generatePdf } from '../../services/pdfClient';
import type { PdfPayload } from '../../services/pdfClient';

interface CreateInvoiceProps {
    currentUser: AppUser;
    invoiceToEdit: Invoice | null;
    onInvoiceSaved: () => void;
    onUserUpdate: (profile: AppUser['profile']) => void;
}

export const CreateInvoice: React.FC<CreateInvoiceProps> = ({ currentUser, invoiceToEdit, onInvoiceSaved, onUserUpdate }) => {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [creditError, setCreditError] = useState(false);

    const { settings, pdfTheme, loading: settingsLoading } = useSettings();
    const toast = useToast();
    const navigate = useNavigate();

    const emptyInvoice: Omit<Invoice, 'invoiceNumber' | 'id'> = useMemo(() => ({
        userId: currentUser.id,
        date: new Date().toISOString().split('T')[0],
        client: '',
        clientAddress: '',
        clientReference: '',
        projectReference: '',
        expensesIncluded: false,
        renderedService: '',
        currency: '£',
        items: [ { description: '', quantity: 1, unit: 'day', unitPrice: 0 } ],
        taxRate: 0,
        total: 0,
        workDates: [],
        travelDates: [],
        status: 'Unpaid',
    }), [currentUser.id]);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [nextInvoiceNumber, savedClients] = await Promise.all([
                    supa.getNextInvoiceNumber(currentUser.id),
                    supa.getAllClients(currentUser.id),
                ]);
                
                setClients(savedClients);

                if (invoiceToEdit) {
                    const items = [...invoiceToEdit.items];
                    if (items.length === 0) {
                        items.push({ description: '', quantity: 1, unit: 'day', unitPrice: 0 });
                    }
                    setInvoice({
                        ...invoiceToEdit, 
                        items, 
                        taxRate: invoiceToEdit.taxRate ?? 0,
                        workDates: invoiceToEdit.workDates || [],
                        travelDates: invoiceToEdit.travelDates || [],
                    });
                } else {
                    setInvoice({
                        ...emptyInvoice,
                        invoiceNumber: nextInvoiceNumber,
                    });
                }
            } catch (error) {
                console.error("Failed to load initial data", error);
                toast.addToast('Failed to load invoice data.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, [invoiceToEdit, currentUser.id, emptyInvoice, toast]);

    const { subtotal, taxAmount, finalTotal } = useMemo(() => {
        const sub = invoice?.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) ?? 0;
        const tax = sub * ((invoice?.taxRate ?? 0) / 100);
        const final = sub + tax;
        return { subtotal: sub, taxAmount: tax, finalTotal: final };
    }, [invoice?.items, invoice?.taxRate]);
    
    useEffect(() => {
        setInvoice(currentInvoice => {
            if (currentInvoice && currentInvoice.total !== finalTotal) {
                return { ...currentInvoice, total: finalTotal };
            }
            return currentInvoice;
        });
    }, [finalTotal]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumber = e.target.type === 'number';
        setInvoice(prev => prev ? ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }) : null);
    };

    const handleClientSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const clientName = e.target.value;
        const selectedClient = clients.find(c => c.name === clientName);
        setInvoice(prev => prev ? ({
            ...prev,
            client: clientName,
            clientAddress: selectedClient ? selectedClient.address : ''
        }) : null);
    };
    
    const handleLineItemChange = (index: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
        if (!invoice) return;
        const newItems = [...invoice.items];
        const currentItem = { ...newItems[index] };

        if (field === 'quantity' || field === 'unitPrice') {
             (currentItem as any)[field] = parseFloat(value as string) || 0;
        } else {
             (currentItem as any)[field] = value;
        }
       
        newItems[index] = currentItem;
        setInvoice({ ...invoice, items: newItems });
    };

    const addLineItem = () => {
        if (!invoice) return;
        const newItems = [...invoice.items, { description: '', quantity: 1, unit: 'day', unitPrice: 0 }];
        setInvoice({ ...invoice, items: newItems });
    };

    const removeLineItem = (index: number) => {
        if (!invoice || invoice.items.length <= 1) return;
        const newItems = invoice.items.filter((_, i) => i !== index);
        setInvoice({ ...invoice, items: newItems });
    };

    const handleDateChange = (type: 'workDates' | 'travelDates', dates: string[]) => {
         setInvoice(prev => prev ? ({ ...prev, [type]: dates }) : null);
    };

    const handleSave = async (invoiceToSave: Invoice): Promise<boolean> => {
        setIsSaving(true);
        const isNewInvoice = !invoiceToSave.id;

        try {
            const { data, error } = await supa.addOrUpdateInvoice(invoiceToSave);
            if (error) throw error;
            
            if (data) {
                setInvoice(prev => prev ? ({...prev, id: (data as any).id}) : null);
            }

            if (isNewInvoice) {
                // Credit deduction is disabled in beta, but we still call the function
                // to keep the flow consistent. The function itself does nothing.
                const updatedProfile = await supa.deductCredit(currentUser.id);
                if (updatedProfile) onUserUpdate(updatedProfile);
            }
            return true;
        } catch (error) {
            console.error("Failed to save invoice:", error);
            // This robustly checks if the caught object has a 'message' property
            // which covers both standard Error objects and Supabase's PostgrestError.
            let errorMessage = 'An unknown error occurred.';
            if (typeof error === 'object' && error !== null && 'message' in error) {
                errorMessage = String((error as { message: string }).message);
            }
            toast.addToast(`Error saving invoice: ${errorMessage}`, 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleJustSave = async () => {
        if (!invoice) return;
        if (!invoice.client || !invoice.date) {
            toast.addToast('Client Name and Invoice Date are required.', 'error');
            return;
        }
        
        const invoiceToSave = { ...invoice };

        if (await handleSave(invoiceToSave)) {
            toast.addToast('Invoice saved successfully!', 'success');
            onInvoiceSaved();
        }
    };

    const handleSaveAndGeneratePdf = async () => {
        if (!invoice || !settings) {
            toast.addToast('Invoice data or settings are missing.', 'error');
            return;
        }
        if (!invoice.client || !invoice.date) {
            toast.addToast('Client Name and Invoice Date are required.', 'error');
            return;
        }
    
        setIsGeneratingPdf(true);
        // First, save the invoice to get an ID if it's new
        if (!(await handleSave(invoice))) {
            setIsGeneratingPdf(false);
            return;
        }
        
        try {
            const payload: PdfPayload = {
                type: 'single',
                payload: {
                    invoice,
                    settings,
                    schemeName: pdfTheme,
                },
            };
            const blob = await generatePdf(payload);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            toast.addToast('Invoice saved and PDF generated!', 'success');
            onInvoiceSaved();

        } catch (error) { 
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast.addToast(`Could not generate PDF: ${errorMessage}`, 'error');
            console.error("Error during PDF generation:", error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    const baseInputStyle = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base";


    if (isLoading || settingsLoading) {
        return <div className="text-center p-10">Loading...</div>;
    }

    if (!settings) {
        return (
            <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-yellow-500" />
                <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-100">Incomplete Settings</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Please complete your Sender and Bank information in the Settings page before creating an invoice.
                </p>
                <button
                    onClick={() => navigate('/settings')}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700"
                >
                    Go to Settings
                </button>
            </div>
        );
    }
    
    if (!invoice) {
        return <div className="text-center p-10">Could not load invoice data.</div>
    }
    const credits = currentUser.profile.credits ?? 0;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{invoiceToEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
                <div className="flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-3 py-1.5 rounded-full font-semibold">
                     <IdCardIcon className="w-5 h-5" />
                    <span>Credits: {credits >= 9999 ? '∞' : credits}</span>
                </div>
            </div>

            {creditError && (
                 <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-800 dark:text-red-200 p-4 my-4 rounded-r-lg" role="alert">
                    <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-6 w-6 mr-3 text-red-500"/>
                        <div>
                            <p className="font-bold">Insufficient Credits</p>
                            <p className="text-sm">You do not have enough credits to create a new invoice.</p>
                            <button onClick={() => navigate('/buy-credits')} className="mt-2 text-sm font-bold underline hover:text-red-600 dark:hover:text-red-100">
                                Buy More Credits
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-xl shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="lg:col-span-1">
                        <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice #</label>
                        <input type="text" name="invoiceNumber" id="invoiceNumber" value={invoice.invoiceNumber} onChange={handleInputChange} className={baseInputStyle} />
                    </div>
                    <div className="lg:col-span-1">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input type="date" name="date" id="date" value={invoice.date} onChange={handleInputChange} className={baseInputStyle} />
                    </div>
                    <div className="lg:col-span-2">
                         <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                         <select name="currency" id="currency" value={invoice.currency} onChange={handleInputChange} className={baseInputStyle}>
                            <option value="£">GBP (£)</option>
                            <option value="$">USD ($)</option>
                            <option value="€">EUR (€)</option>
                            <option value="¥">JPY (¥)</option>
                            <option value="A$">AUD (A$)</option>
                            <option value="RM">MYR (RM)</option>
                         </select>
                    </div>

                    <div className="lg:col-span-2">
                        <label htmlFor="client" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                        <input list="client-list" name="client" id="client" value={invoice.client} onChange={handleClientSelect} className={baseInputStyle} />
                        <datalist id="client-list"> {clients.map(c => <option key={c.id} value={c.name} />)} </datalist>
                    </div>
                    <div className="lg:col-span-2">
                        <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Address</label>
                        <textarea name="clientAddress" id="clientAddress" value={invoice.clientAddress} onChange={handleInputChange} rows={3} className={baseInputStyle}></textarea>
                    </div>
                    
                    <div className="lg:col-span-2">
                        <label htmlFor="clientReference" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Reference</label>
                        <input type="text" name="clientReference" id="clientReference" value={invoice.clientReference} onChange={handleInputChange} className={baseInputStyle} />
                    </div>
                    <div className="lg:col-span-2">
                        <label htmlFor="projectReference" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Reference</label>
                        <input type="text" name="projectReference" id="projectReference" value={invoice.projectReference} onChange={handleInputChange} className={baseInputStyle} />
                    </div>

                    <div className="lg:col-span-4">
                        <label htmlFor="renderedService" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rendered Service Description</label>
                        <textarea name="renderedService" id="renderedService" value={invoice.renderedService} onChange={handleInputChange} rows={3} className={baseInputStyle} placeholder="e.g., Consultancy services for Q3 project from May 1st to May 3rd, including travel on April 30th." />
                    </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-6 mt-6">
                    <button onClick={() => setIsActivityOpen(!isActivityOpen)} className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-700 dark:text-gray-200">
                        Activity Dates (Optional)
                        <ChevronDownIcon className={`w-6 h-6 transition-transform ${isActivityOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isActivityOpen && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Work Dates</h4>
                                <DateRangePicker selectedDates={invoice.workDates || []} onDatesChange={(dates) => handleDateChange('workDates', dates)} initialDate={invoice.date} />
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Travel Dates</h4>
                                <DateRangePicker selectedDates={invoice.travelDates || []} onDatesChange={(dates) => handleDateChange('travelDates', dates)} initialDate={invoice.date} />
                            </div>
                        </div>
                    )}
                </div>

                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-8 mb-2">Line Items</h3>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Qty</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Unit</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Unit Price</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Total</th>
                                <th className="w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {invoice.items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <input type="text" list="line-item-descriptions" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} className="w-full p-2 bg-transparent border-none focus:ring-0 dark:text-white text-base" placeholder="Service or Item" />
                                    </td>
                                    <td><input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} className="w-full p-2 bg-transparent border-none focus:ring-0 dark:text-white text-base" /></td>
                                    <td>
                                        <select
                                            value={item.unit}
                                            onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                                            className="w-full p-2 border-none focus:ring-0 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-base"
                                        >
                                            <option value="day">day</option>
                                            <option value="hour">hour</option>
                                            <option value="item">item</option>
                                            <option value="">(none)</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">{invoice.currency}</span>
                                            <input type="number" value={item.unitPrice} onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)} className="w-full p-2 pl-7 text-center bg-transparent border-none focus:ring-0 dark:text-white text-base" />
                                        </div>
                                    </td>
                                    <td className="p-2 text-right">
                                         <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">{invoice.currency}</span>
                                            <span className="block w-full p-2 pl-7 text-right dark:text-white text-base">{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</span>
                                         </div>
                                    </td>
                                    <td className="text-center">
                                        {invoice.items.length > 1 && ( <button onClick={() => removeLineItem(index)} className="p-2 text-red-500 hover:text-red-700" title="Remove item"><TrashIcon /></button> )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     <datalist id="line-item-descriptions">
                        <option value="Travel" />
                        <option value="Offshore" />
                        <option value="Onshore" />
                        <option value="Consulting" />
                        <option value="Training" />
                        <option value="Expenses" />
                     </datalist>
                </div>

                <div className="flex justify-start mt-4">
                    <button onClick={addLineItem} className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">
                        <PlusIcon className="mr-2" /> Add Line Item
                    </button>
                </div>
                
                <div className="flex justify-end mt-6">
                    <div className="w-full max-w-xs space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-100">{invoice.currency}{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Tax (%):</span>
                            <input type="number" name="taxRate" value={invoice.taxRate} onChange={handleInputChange} className="w-24 p-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base" />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Tax Amount:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-100">{invoice.currency}{taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t dark:border-gray-600 my-2"></div>
                        <div className="flex justify-between text-xl font-bold">
                            <span className="text-gray-800 dark:text-gray-100">Total:</span>
                            <span className="text-blue-600 dark:text-blue-400">{invoice.currency}{finalTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-4">
                 <button onClick={handleJustSave} disabled={isSaving || isGeneratingPdf} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors duration-200 disabled:bg-gray-400">
                    {isSaving ? 'Saving...' : 'Save Invoice'}
                </button>
                <button onClick={handleSaveAndGeneratePdf} disabled={isSaving || isGeneratingPdf} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:bg-blue-400">
                    {isGeneratingPdf ? 'Generating...' : (invoiceToEdit ? 'Update & Generate PDF' : 'Save & Generate PDF')}
                </button>
            </div>
        </div>
    );
};
