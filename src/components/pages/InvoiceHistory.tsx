import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Invoice, AppUser, PdfSchemeName } from '../../types';
import * as supa from '../../services/supabase';
import { Pencil1Icon, TrashIcon, DownloadIcon, EyeOpenIcon, ChevronDownIcon, CheckCircledIcon, CalendarIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { colorSchemes } from '../../services/pdfGenerator';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../Toast';
import { ConfirmationModal } from '../ConfirmationModal';
import { generatePdf } from '../../services/pdfClient';
import type { PdfPayload } from '../../services/pdfClient';

interface InvoiceHistoryProps {
    currentUser: AppUser;
    onEditInvoice: (invoiceId: number) => void;
}

const formatDate = (dateString: string) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    const [year, month, day] = dateString.split('-');
    return `${day} / ${month} / ${year}`;
};

const getInvoiceStatus = (invoice: Invoice): 'Paid' | 'Unpaid' | 'Overdue' => {
    if (invoice.status === 'Paid') {
        return 'Paid';
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
        const invoiceDate = new Date(invoice.date);
        if (invoiceDate < thirtyDaysAgo) {
            return 'Overdue';
        }
    } catch (e) {
        console.error("Invalid invoice date for status check", e);
    }
    return 'Unpaid';
};

const StatusBadge: React.FC<{ status: 'Paid' | 'Unpaid' | 'Overdue' }> = ({ status }) => {
    const statusStyles = {
        Paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Unpaid: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        Overdue: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return (
        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
            {status}
        </span>
    );
};

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({ currentUser, onEditInvoice }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [invoiceThemes, setInvoiceThemes] = useState<Record<number, PdfSchemeName>>({});
    
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isBulkExporting, setIsBulkExporting] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState<{ id: number; action: 'view' | 'download' } | null>(null);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

    const { settings, pdfTheme: globalPdfTheme, loading: settingsLoading } = useSettings();
    const toast = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const allInvoices = await supa.getAllUserInvoices(currentUser.id);
            setInvoices(allInvoices);
        } catch (error) {
            console.error("Failed to load history data:", error);
            toast.addToast('Could not load invoice history.', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentUser.id, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredInvoices = useMemo(() => {
        const sortedInvoices = [...invoices].sort((a, b) => {
            try {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
            } catch {
                return 0;
            }
        });
        
        return sortedInvoices.filter(invoice => {
            if (!startDate || !endDate) return true;
            try {
                const invoiceDate = new Date(invoice.date);
                return invoiceDate >= new Date(startDate) && invoiceDate <= new Date(endDate);
            } catch {
                return false;
            }
        });
    }, [invoices, startDate, endDate]);

    const handleSelectInvoice = (invoiceId: number) => {
        const newSelection = new Set(selectedInvoiceIds);
        if (newSelection.has(invoiceId)) {
            newSelection.delete(invoiceId);
        } else {
            newSelection.add(invoiceId);
        }
        setSelectedInvoiceIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredInvoices.map(inv => inv.id!));
            setSelectedInvoiceIds(allIds);
        } else {
            setSelectedInvoiceIds(new Set());
        }
    };
    
    const handlePdfResponse = (blob: Blob, action: 'view' | 'download' | 'bulk', fileName: string) => {
        const url = URL.createObjectURL(blob);
    
        if (action === 'view') {
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
                newWindow.addEventListener('pagehide', () => URL.revokeObjectURL(url), { once: true });
            } else {
                toast.addToast('A popup blocker may be preventing the PDF from opening.', 'info');
                URL.revokeObjectURL(url);
            }
        } else { // 'download' or 'bulk'
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            if (action === 'bulk') {
                toast.addToast('Export complete!', 'success');
            }
        }
    };

    const handleSinglePdfAction = async (action: 'view' | 'download', invoice: Invoice) => {
        if (!settings) {
            toast.addToast('PDF generation requires settings to be loaded.', 'error');
            return;
        }
        if (generatingPdf || isBulkExporting) {
            toast.addToast('Another PDF operation is already in progress.', 'info');
            return;
        }
    
        setGeneratingPdf({ id: invoice.id!, action });
        
        try {
            const schemeName = invoiceThemes[invoice.id!] || globalPdfTheme;
            const payload: PdfPayload = {
                type: 'single',
                payload: { invoice, settings, schemeName },
            };
            const blob = await generatePdf(payload);
            const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;
            handlePdfResponse(blob, action, fileName);

        } catch (error) {
            console.error(`Error during single PDF action:`, error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast.addToast(`PDF Generation Failed: ${errorMessage}`, 'error');
        } finally {
            setGeneratingPdf(null);
        }
    };
    
    const handleBulkExportAction = async (selectedIds: Set<number>) => {
        if (!settings) {
            toast.addToast('PDF generation requires settings to be loaded.', 'error');
            return;
        }
        if (selectedIds.size === 0) {
            toast.addToast('Please select invoices to export.', 'info');
            return;
        }
        if (generatingPdf || isBulkExporting) {
            toast.addToast('Another PDF operation is already in progress.', 'info');
            return;
        }
        
        setIsBulkExporting(true);
        toast.addToast(`Preparing to export ${selectedIds.size} invoices...`, 'info');
        
        try {
            const invoicesToExport = invoices.filter(inv => inv.id && selectedIds.has(inv.id));
            const payload: PdfPayload = {
                type: 'bulk',
                payload: { invoices: invoicesToExport, settings, invoiceThemes, globalPdfTheme },
            };
            const blob = await generatePdf(payload);

            const fileName = `Invoice_Export_${new Date().toISOString().split('T')[0]}.pdf`;
            handlePdfResponse(blob, 'bulk', fileName);

        } catch(error) {
            console.error(`Error during bulk export:`, error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast.addToast(`Bulk Export Failed: ${errorMessage}`, 'error');
        } finally {
            setIsBulkExporting(false);
        }
    };

    const openDeleteModal = (invoice: Invoice) => {
        setInvoiceToDelete(invoice);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            const { error } = await supa.deleteInvoiceById(invoiceToDelete.id!);
            if (error) throw error;
            toast.addToast('Invoice deleted successfully.', 'success');
            fetchData();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("Failed to delete invoice:", err);
            toast.addToast(`Error deleting invoice: ${errorMessage}`, 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setInvoiceToDelete(null);
        }
    };
    
    const handleMarkAsPaid = async (invoiceId: number) => {
        try {
            await supa.updateInvoiceStatus(invoiceId, 'Paid');
            setInvoices(prevInvoices =>
                prevInvoices.map(inv =>
                    inv.id === invoiceId ? { ...inv, status: 'Paid' } : inv
                )
            );
            toast.addToast('Invoice marked as Paid!', 'success');
        } catch (error) {
            console.error("Failed to mark invoice as paid:", error);
            toast.addToast('Failed to update invoice status.', 'error');
        }
    };
    
    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if ((loading || settingsLoading) && !invoices.length) {
        return <div className="text-center p-10">Loading invoice history...</div>;
    }
    
    const ActionButton: React.FC<{
        onClick: () => void;
        invoiceId: number;
        action: 'view' | 'download';
        Icon: React.ElementType;
        title: string;
        text: string;
        className: string;
    }> = ({ onClick, invoiceId, action, Icon, title, text, className }) => {
        const isLoading = generatingPdf?.id === invoiceId && generatingPdf?.action === action;
        return (
             <button 
                onClick={onClick}
                disabled={isLoading || isBulkExporting}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${className} ${isLoading || isBulkExporting ? 'cursor-not-allowed bg-gray-300 dark:bg-gray-600' : ''}`}
                title={title}
            >
                {isLoading ? <DotsHorizontalIcon className="animate-pulse"/> : <Icon/>}
                <span>{isLoading ? '...' : text}</span>
            </button>
        );
    };
    
    const isActionInProgress = generatingPdf !== null || isBulkExporting;

    return (
        <>
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Invoice"
                message={<>Are you sure you want to permanently delete invoice <strong>{invoiceToDelete?.invoiceNumber}</strong>? This action cannot be undone.</>}
                confirmInput="DELETE"
            />
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Invoice History</h2>
                
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <CalendarIcon className="w-5 h-5 text-gray-500" />
                        <label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <button
                        onClick={() => handleBulkExportAction(selectedInvoiceIds)}
                        disabled={isActionInProgress || selectedInvoiceIds.size === 0}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                        {isBulkExporting ? 'Exporting...' : `Export Selected (${selectedInvoiceIds.size})`}
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl">
                     <div className="hidden sm:grid grid-cols-12 gap-4 items-center p-4 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                        <div className="col-span-1 flex justify-center">
                            <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={filteredInvoices.length > 0 && selectedInvoiceIds.size === filteredInvoices.length}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </div>
                        <div className="col-span-2">Invoice #</div>
                        <div className="col-span-3">Client</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-2 text-right">Total</div>
                    </div>
                    <div className="space-y-1 sm:space-y-0 p-2 sm:p-0">
                        {filteredInvoices.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                No invoices found for the selected period.
                            </div>
                        ) : (
                            filteredInvoices.map((invoice) => {
                                const isExpanded = expandedId === invoice.id;
                                const status = getInvoiceStatus(invoice);

                                return (
                                    <div key={invoice.id} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700/50">
                                        <div
                                            className="w-full grid grid-cols-2 sm:grid-cols-12 gap-x-4 gap-y-2 items-center p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150"
                                        >
                                            <div className="col-span-1 flex justify-center items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedInvoiceIds.has(invoice.id!)}
                                                    onChange={() => handleSelectInvoice(invoice.id!)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <div onClick={() => toggleExpand(invoice.id!)} className="col-span-1 sm:col-span-2 font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base cursor-pointer">{invoice.invoiceNumber}</div>
                                            <div onClick={() => toggleExpand(invoice.id!)} className="col-span-1 sm:col-span-3 text-gray-600 dark:text-gray-400 truncate text-sm cursor-pointer">{invoice.client}</div>
                                            <div onClick={() => toggleExpand(invoice.id!)} className="col-span-1 sm:col-span-2 text-gray-500 dark:text-gray-400 text-xs sm:text-sm cursor-pointer">{formatDate(invoice.date)}</div>
                                            <div onClick={() => toggleExpand(invoice.id!)} className="col-span-1 sm:col-span-2 text-center text-xs cursor-pointer"><StatusBadge status={status} /></div>
                                            <div onClick={() => toggleExpand(invoice.id!)} className="col-span-2 sm:col-span-2 text-right font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base flex justify-end items-center gap-4 cursor-pointer">
                                                <span>{invoice.currency}{invoice.total.toFixed(2)}</span>
                                                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="bg-gray-50 dark:bg-gray-900/30 p-4 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex flex-wrap justify-end items-center gap-2">
                                                     <div className="relative">
                                                        <select
                                                            id={`theme-select-${invoice.id}`}
                                                            value={invoiceThemes[invoice.id!] || globalPdfTheme}
                                                            onChange={(e) => {
                                                                const newTheme = e.target.value as PdfSchemeName;
                                                                setInvoiceThemes(prev => ({ ...prev, [invoice.id!]: newTheme }));
                                                            }}
                                                            disabled={isActionInProgress}
                                                            className="pl-3 pr-8 py-2 rounded-md text-sm font-medium border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
                                                            title="Select a theme for re-generation"
                                                        >
                                                            {Object.keys(colorSchemes).map(name => (
                                                                <option key={name} value={name}>{name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    
                                                    {status !== 'Paid' && (
                                                        <button 
                                                            onClick={() => handleMarkAsPaid(invoice.id!)}
                                                            disabled={isActionInProgress}
                                                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900 transition disabled:opacity-50"
                                                            title="Mark this invoice as paid"
                                                        >
                                                            <CheckCircledIcon/>
                                                            <span>Mark as Paid</span>
                                                        </button>
                                                    )}
                                                    
                                                    <ActionButton onClick={() => handleSinglePdfAction('view', invoice)} invoiceId={invoice.id!} action="view" Icon={EyeOpenIcon} title="View PDF" text="View" className="text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:bg-gray-200 disabled:text-gray-400 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900 dark:disabled:bg-gray-600 dark:disabled:text-gray-500" />
                                                    <ActionButton onClick={() => handleSinglePdfAction('download', invoice)} invoiceId={invoice.id!} action="download" Icon={DownloadIcon} title="Download PDF" text="Download" className="text-green-700 bg-green-100 hover:bg-green-200 disabled:bg-gray-200 disabled:text-gray-400 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 dark:disabled:bg-gray-600 dark:disabled:text-gray-500" />

                                                    <button onClick={() => onEditInvoice(invoice.id!)} disabled={isActionInProgress} className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 transition disabled:opacity-50" title="Edit Invoice">
                                                        <Pencil1Icon/>
                                                        <span>Edit</span>
                                                    </button>
                                                    <button onClick={() => openDeleteModal(invoice)} disabled={isActionInProgress} className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 transition disabled:opacity-50" title="Delete Invoice">
                                                        <TrashIcon/>
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
