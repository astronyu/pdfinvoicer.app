import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Invoice, AppUser } from '../../types';
import * as supa from '../../services/supabase';
import { BarChartIcon, FileTextIcon, GroupIcon, IdCardIcon, RocketIcon, Cross2Icon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon, DownloadIcon } from '@radix-ui/react-icons';
import { useToast } from '../Toast';

interface DashboardProps {
    currentUser: AppUser;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    </div>
);

const BarChart: React.FC<{ data: { label: string; earnings: number }[]; currency: string }> = ({ data, currency }) => {
    const maxEarning = useMemo(() => Math.max(...data.map(d => d.earnings), 0), [data]);

    if (data.every(d => d.earnings === 0)) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                No earnings data to display for this period.
            </div>
        );
    }

    return (
        <div className="flex justify-around items-end h-64 space-x-2 pt-4">
            {data.map(({ label, earnings }) => {
                const barHeight = maxEarning > 0 ? (earnings / maxEarning) * 100 : 0;
                return (
                    <div key={label} className="flex flex-col items-center justify-end flex-1 group h-full">
                        <div className="relative w-full flex justify-center">
                            <div className="absolute -top-8 mb-1 px-2 py-1 bg-gray-900 text-gray-100 text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {currency}{earnings.toFixed(0)}
                            </div>
                        </div>
                        <div
                            className="w-full bg-blue-400 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-500 rounded-t-md transition-all duration-300"
                            style={{ height: `${barHeight}%`, minHeight: '1px' }}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-nowrap">{label}</p>
                    </div>
                );
            })}
        </div>
    );
};


const ListCard: React.FC<{title: string; items: {primary: string, secondary: string}[]; icon: React.ElementType; action?: React.ReactNode}> = ({title, items, icon: Icon, action}) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-full">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center">
                <Icon className="w-5 h-5 mr-3 text-gray-400"/>
                {title}
            </h3>
            {action}
        </div>
        {items.length > 0 ? (
            <ul className="space-y-3">
                {items.map((item, index) => (
                    <li key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300 truncate pr-2">{item.primary}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">{item.secondary}</span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-center py-8 text-gray-400 dark:text-gray-500">No data available.</p>
        )}
    </div>
);

const AllClientsModal: React.FC<{isOpen: boolean; onClose: () => void; clients: {primary: string, secondary: string}[];}> = ({ isOpen, onClose, clients }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">All Clients</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Cross2Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    {clients.length > 0 ? (
                        <ul className="space-y-4">
                            {clients.map((client, index) => (
                                <li key={index} className="flex justify-between items-center text-base border-b dark:border-gray-700/50 pb-2">
                                    <span className="text-gray-700 dark:text-gray-200">{client.primary}</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-50">{client.secondary}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">No clients found for this period.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const AllReferencesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    references: { clientRef: string; projectRefs: string[] }[];
}> = ({ isOpen, onClose, references }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Client & Project References</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Cross2Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">
                    {references.length > 0 ? (
                        <ul className="space-y-4">
                            {references.map((item, index) => (
                                <li key={index} className="border-b dark:border-gray-700/50 pb-3 last:border-b-0">
                                    <h4 className="font-semibold text-base text-gray-900 dark:text-gray-50">{item.clientRef}</h4>
                                    {item.projectRefs.length > 0 ? (
                                        <ul className="pl-5 mt-2 space-y-1 text-sm list-disc">
                                            {item.projectRefs.map((pRef, pIndex) => (
                                                <li key={pIndex} className="text-gray-600 dark:text-gray-300">{pRef}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="pl-5 mt-1 text-sm text-gray-500 italic">No associated project references.</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">No references found for this period.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ActivityCalendarProps {
    invoices: Invoice[];
    currencySymbol: string;
    displayCurrency: string;
    convertCurrency: (amount: number, fromCurrencySymbol: string, toCurrencyCode: string) => number;
}


const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ invoices, currencySymbol, displayCurrency, convertCurrency }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

    const { activityData, activityTooltips } = useMemo(() => {
        const activities = new Map<string, 'work' | 'travel' | 'invoice'>();
        const tooltips = new Map<string, string>();

        invoices.forEach(invoice => {
            try {
                if (invoice.date && !isNaN(new Date(invoice.date).getTime())) {
                    if (!activities.has(invoice.date)) {
                        activities.set(invoice.date, 'invoice');
                        tooltips.set(invoice.date, 'Invoice Issued');
                    }
                }
                (invoice.travelDates || []).forEach(date => {
                    if (date && !isNaN(new Date(date).getTime())) {
                        activities.set(date, 'travel');
                        tooltips.set(date, 'Travel Day');
                    }
                });
                (invoice.workDates || []).forEach(date => {
                    if (date && !isNaN(new Date(date).getTime())) {
                        activities.set(date, 'work');
                        tooltips.set(date, 'Work Day');
                    }
                });
            } catch (e) {
                console.error("Skipping invalid date found in invoice for calendar:", e);
            }
        });
        return { activityData: activities, activityTooltips: tooltips };
    }, [invoices]);
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const yearSummary = useMemo(() => {
        if (viewMode !== 'year') return { workDays: 0, earnings: 0 };

        const invoicesForYear = invoices.filter(inv => {
            try {
                return new Date(inv.date).getFullYear() === year;
            } catch {
                return false;
            }
        });

        const activityDays = new Set<string>();
        let totalEarnings = 0;

        invoicesForYear.forEach(inv => {
            (inv.workDates || []).forEach(date => activityDays.add(date));
            (inv.travelDates || []).forEach(date => activityDays.add(date));
            totalEarnings += convertCurrency(inv.total || 0, inv.currency, displayCurrency);
        });

        return { workDays: activityDays.size, earnings: totalEarnings };
    }, [year, invoices, viewMode, displayCurrency, convertCurrency]);

    const changeDate = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); 
            if (viewMode === 'month') {
                newDate.setMonth(newDate.getMonth() + amount);
            } else {
                newDate.setFullYear(newDate.getFullYear() + amount);
            }
            return newDate;
        });
    };

    const getColorForActivity = (activity?: 'work' | 'travel' | 'invoice') => {
        switch (activity) {
            case 'work': return 'bg-green-500 text-white font-bold';
            case 'travel': return 'bg-orange-500 text-white font-bold';
            case 'invoice': return 'bg-yellow-400 text-gray-800 font-bold';
            default: return '';
        }
    };
    
    const formatEarnings = (amount: number, currency: string) => {
        if (amount >= 1_000_000) {
            return `${currency}${(amount / 1_000_000).toFixed(1)} million`;
        }
        return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const renderMonthView = () => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; 
        const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const paddingDays = Array.from({ length: firstDayOfMonth });
        const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        return (
             <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 dark:text-gray-400">
                {weekDays.map(day => <div key={day} className="font-bold">{day}</div>)}
                {paddingDays.map((_, i) => <div key={`pad-${i}`}></div>)}
                {calendarDays.map(day => {
                    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    const activity = activityData.get(dateStr);
                    const tooltip = activityTooltips.get(dateStr);
                    const colorClass = getColorForActivity(activity);
                    return (
                        <div key={day} title={tooltip} className={`w-full aspect-square flex items-center justify-center rounded-full transition-colors ${colorClass}`}>
                            {day}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderYearView = () => {
        const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
                {Array.from({ length: 12 }).map((_, monthIndex) => {
                    const monthName = new Date(year, monthIndex).toLocaleString('default', { month: 'long' });
                    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                    const firstDayOfMonth = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
                    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    const paddingDays = Array.from({ length: firstDayOfMonth });

                    return (
                        <div key={monthIndex}>
                            <p className="font-bold text-center text-sm mb-2 text-gray-700 dark:text-gray-300">{monthName}</p>
                            <div className="grid grid-cols-7 gap-1">
                                {weekDays.map(day => <div key={day} className="text-[10px] text-center text-gray-400">{day}</div>)}
                                {paddingDays.map((_, i) => <div key={`pad-${i}`}></div>)}
                                {calendarDays.map(day => {
                                    const dateStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                    const activity = activityData.get(dateStr);
                                    const tooltip = activityTooltips.get(dateStr);
                                    const colorClass = activity ? getColorForActivity(activity)?.split(' ')[0] : 'bg-gray-200 dark:bg-gray-700/50';
                                    return <div key={day} title={tooltip} className={`w-full aspect-square rounded-sm ${colorClass}`}></div>;
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-3 text-gray-400"/>
                    Activity Calendar
                </h3>
                <div className="flex items-center space-x-4">
                    <div className="flex space-x-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-md">
                        <button onClick={() => setViewMode('month')} className={`px-2 py-1 text-xs font-semibold rounded ${viewMode === 'month' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Month</button>
                        <button onClick={() => setViewMode('year')} className={`px-2 py-1 text-xs font-semibold rounded ${viewMode === 'year' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Year</button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => changeDate(-1)} className="p-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeftIcon /></button>
                        <span className="text-sm font-semibold w-28 text-center text-gray-800 dark:text-gray-200">{viewMode === 'month' ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : year}</span>
                        <button onClick={() => changeDate(1)} className="p-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRightIcon /></button>
                    </div>
                </div>
            </div>
            <div className="flex-grow">
                {viewMode === 'month' ? renderMonthView() : renderYearView()}
            </div>
            {viewMode === 'year' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Summary for {year}</h4>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-0">
                        <span>Days of work: <span className="font-bold text-gray-900 dark:text-gray-100">{yearSummary.workDays} days</span></span>
                        <span>Earnings: <span className="font-bold text-gray-900 dark:text-gray-100">{formatEarnings(yearSummary.earnings, currencySymbol)}</span></span>
                    </div>
                </div>
            )}
        </div>
    );
};

const OutstandingNotice: React.FC<{ count: number; amount: number; currency: string }> = ({ count, amount, currency }) => {
    if (count === 0) return null;
    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-xl text-yellow-800 dark:text-yellow-200 flex items-center gap-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
                <p className="font-bold">You have {count} outstanding invoice(s)!</p>
                <p className="text-sm">The total amount awaiting payment is {currency}{amount.toFixed(2)}. Check the Invoice History to follow up.</p>
            </div>
        </div>
    );
};

const symbolToCode: Record<string, string> = {
    '£': 'GBP',
    '$': 'USD',
    '€': 'EUR',
    '¥': 'JPY',
    'A$': 'AUD',
    'RM': 'MYR',
};

const codeToSymbol: Record<string, string> = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'AUD': 'A$',
    'MYR': 'RM',
    'CAD': 'C$',
    'CHF': 'CHF',
    'CNY': 'CN¥',
    'INR': '₹',
};

const availableCurrenciesForDisplay = ['GBP', 'USD', 'EUR', 'JPY', 'AUD', 'MYR', 'CAD', 'CHF', 'CNY', 'INR'];


interface CachedRates {
    rates: Record<string, number>;
    timestamp: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>('last12');
    const [isAllClientsModalOpen, setIsAllClientsModalOpen] = useState(false);
    const [isAllRefsModalOpen, setIsAllRefsModalOpen] = useState(false);
    
    const [displayCurrency, setDisplayCurrency] = useState('GBP');
    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
    const [ratesLoading, setRatesLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true);
            try {
                const data = await supa.getAllUserInvoices(currentUser.id);
                setInvoices(data);
            } catch (error) {
                console.error("Failed to load invoices for dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        
        const fetchRates = async () => {
            setRatesLoading(true);
            try {
                const cachedRatesItem = localStorage.getItem('exchangeRates');
                const now = new Date().getTime();
    
                if (cachedRatesItem) {
                    const { rates, timestamp }: CachedRates = JSON.parse(cachedRatesItem);
                    // Cache for 4 hours (4 * 60 * 60 * 1000 ms)
                    if (now - timestamp < 14400000) {
                        setExchangeRates(rates);
                        setRatesLoading(false);
                        return; // Use cached rates
                    }
                }
                
                // If no cache or cache is stale, fetch new rates
                const response = await fetch('https://api.frankfurter.app/latest?from=EUR');
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                const newRates = { ...data.rates, [data.base]: 1 };
                setExchangeRates(newRates);
                localStorage.setItem('exchangeRates', JSON.stringify({ rates: newRates, timestamp: now }));
    
            } catch (error) {
                console.error("Failed to fetch exchange rates:", error);
                toast.addToast('Could not fetch exchange rates. Totals may be inaccurate.', 'error');
                localStorage.removeItem('exchangeRates');
            } finally {
                setRatesLoading(false);
            }
        };
    
        fetchInvoices();
        fetchRates();
    }, [currentUser.id, toast]);
    
    const convertCurrency = useCallback((amount: number, fromCurrencySymbol: string, toCurrencyCode: string): number => {
        if (!exchangeRates || !amount) return 0;
        
        const fromCode = symbolToCode[fromCurrencySymbol];
        if (!fromCode) {
            console.warn(`Unsupported currency symbol for conversion: ${fromCurrencySymbol}`);
            return amount; // Return original amount if source currency is unknown
        }

        const toCode = toCurrencyCode;

        // Base currency of the API is EUR
        const base = 'EUR';

        const fromRate = exchangeRates[fromCode]; // Rate to convert FROM currency to EUR
        const toRate = exchangeRates[toCode];     // Rate to convert FROM EUR to TO currency

        if (typeof fromRate !== 'number' || typeof toRate !== 'number') {
             console.warn(`Exchange rate not available or not a number for ${fromCode} or ${toCode}.`);
             return amount; // Return original amount if rates are missing or invalid
        }

        // Convert amount to base currency (EUR), then to target currency
        const amountInBase = amount / fromRate;
        return amountInBase * toRate;

    }, [exchangeRates]);
    
    const safeTotal = (inv: Invoice) => {
        const total = inv?.total;
        return typeof total === 'number' && !isNaN(total) ? total : 0;
    }

    const availableYears = useMemo(() => {
        const years = new Set(invoices.map(inv => {
            try {
                return new Date(inv.date).getFullYear();
            } catch { return 0; }
        }).filter(year => year > 0));
        return Array.from(years).sort((a,b) => b - a);
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        if (selectedYear === 'last12') {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            return invoices.filter(inv => {
                try {
                    return new Date(inv.date) >= twelveMonthsAgo;
                } catch { return false; }
            });
        }
        
        const yearNum = parseInt(selectedYear, 10);
        return invoices.filter(inv => {
            try {
                return new Date(inv.date).getFullYear() === yearNum;
            } catch { return false; }
        });
    }, [invoices, selectedYear]);
    
    const { totalEarnings, totalInvoicesCount, totalClients, currencySymbol, outstandingAmount, outstandingCount } = useMemo(() => {
        let earnings = 0;
        let oAmount = 0;
        let oCount = 0;

        filteredInvoices.forEach(inv => {
            const convertedTotal = convertCurrency(safeTotal(inv), inv.currency, displayCurrency);
            earnings += convertedTotal;
            if (inv.status !== 'Paid') {
                oCount++;
                oAmount += convertedTotal;
            }
        });
        
        const clients = new Set(filteredInvoices.map(inv => inv.client)).size;
        const symbol = codeToSymbol[displayCurrency] || displayCurrency;
        
        return {
            totalEarnings: earnings,
            totalInvoicesCount: filteredInvoices.length,
            totalClients: clients,
            currencySymbol: symbol,
            outstandingAmount: oAmount,
            outstandingCount: oCount
        };
    }, [filteredInvoices, displayCurrency, convertCurrency]);

    const { data: chartData, chartTitle } = useMemo(() => {
        if (selectedYear === 'last12') {
            const data = Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setDate(1); 
                date.setMonth(date.getMonth() - i);
                return { 
                    label: date.toLocaleString('default', { month: 'short' }), 
                    key: `${date.getFullYear()}-${date.getMonth()}`,
                    earnings: 0 
                };
            }).reverse();
            
            filteredInvoices.forEach(inv => {
                try {
                     if (!inv.date || isNaN(new Date(inv.date).getTime())) return;
                     const invDate = new Date(inv.date);
                     const key = `${invDate.getFullYear()}-${invDate.getMonth()}`;
                     const targetMonth = data.find(d => d.key === key);
                     if (targetMonth) {
                        targetMonth.earnings += convertCurrency(safeTotal(inv), inv.currency, displayCurrency);
                     }
                } catch {}
            });
            return { data, chartTitle: 'Monthly Earnings (Last 12 Months)' };
        } else {
             const yearNum = parseInt(selectedYear, 10);
             const data = Array.from({ length: 12 }, (_, i) => ({ 
                label: new Date(0, i).toLocaleString('default', { month: 'short' }), 
                earnings: 0 
            }));
             filteredInvoices.forEach(inv => {
                 try {
                    if (!inv.date || isNaN(new Date(inv.date).getTime())) return;
                    const month = new Date(inv.date).getMonth();
                    data[month].earnings += convertCurrency(safeTotal(inv), inv.currency, displayCurrency);
                } catch {}
            });
            return { data, chartTitle: `Monthly Earnings (${yearNum})` };
        }
    }, [filteredInvoices, selectedYear, displayCurrency, convertCurrency]);

    const allClientsData = useMemo(() => {
        const clientTotals = new Map<string, number>();
        filteredInvoices.forEach(inv => {
            const convertedTotal = convertCurrency(safeTotal(inv), inv.currency, displayCurrency);
            const currentTotal = clientTotals.get(inv.client) || 0;
            clientTotals.set(inv.client, currentTotal + convertedTotal);
        });
        return Array.from(clientTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, total]) => ({ primary: name, secondary: `${currencySymbol}${total.toFixed(2)}` }));
    }, [filteredInvoices, currencySymbol, displayCurrency, convertCurrency]);

    const topClients = useMemo(() => allClientsData.slice(0, 5), [allClientsData]);

    const allReferencesData = useMemo(() => {
        const refsMap = new Map<string, Set<string>>();
        filteredInvoices.forEach(inv => {
            const clientRef = inv.clientReference;
            const projectRef = inv.projectReference;
            if (clientRef) {
                if (!refsMap.has(clientRef)) refsMap.set(clientRef, new Set<string>());
                if (projectRef) refsMap.get(clientRef)!.add(projectRef);
            }
        });
        return Array.from(refsMap.entries()).map(([clientRef, projectRefsSet]) => ({
            clientRef,
            projectRefs: Array.from(projectRefsSet).sort()
        })).sort((a, b) => a.clientRef.localeCompare(b.clientRef));
    }, [filteredInvoices]);

    const clientReferencesForCard = useMemo(() => {
        return allReferencesData.map(ref => ({ primary: ref.clientRef, secondary: '' })).slice(0, 4);
    }, [allReferencesData]);

    const handleExportSummary = () => {
        const activityRows: (string | number)[][] = [];
        const uniqueActivityDays = new Map<string, string>();
    
        filteredInvoices.forEach(inv => {
            (inv.workDates || []).forEach(date => {
                if (!uniqueActivityDays.has(date)) uniqueActivityDays.set(date, 'Work');
            });
            (inv.travelDates || []).forEach(date => {
                if (!uniqueActivityDays.has(date)) uniqueActivityDays.set(date, 'Travel');
            });
        });
    
        const sortedActivities = Array.from(uniqueActivityDays.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        sortedActivities.forEach(([date, type]) => {
            activityRows.push([date, type]);
        });
    
        const escapeCsvCell = (cell: string | number) => {
            const cellStr = String(cell);
            if (cellStr.includes(',')) {
                return `"${cellStr}"`;
            }
            return cellStr;
        };
    
        let csvContent = "data:text/csv;charset=utf-8,";
    
        // Summary Section
        csvContent += "Summary Report\n";
        csvContent += `Period,${selectedYear === 'last12' ? 'Last 12 Months' : `Year ${selectedYear}`}\n`;
        csvContent += `Display Currency,${displayCurrency}\n`;
        csvContent += "Metric,Value\n";
        csvContent += `Total Earnings,${escapeCsvCell(currencySymbol + totalEarnings.toFixed(2))}\n`;
        csvContent += `Total Invoices,${totalInvoicesCount}\n`;
        csvContent += `Total Clients,${totalClients}\n`;
        csvContent += `Outstanding Invoices,${outstandingCount}\n`;
        csvContent += `Outstanding Amount,${escapeCsvCell(currencySymbol + outstandingAmount.toFixed(2))}\n`;
        csvContent += "\n";
    
        // Activity Section
        csvContent += "Activity Log\n";
        csvContent += "Date,Type\n";
        activityRows.forEach(row => {
            csvContent += row.map(escapeCsvCell).join(',') + "\n";
        });
        csvContent += "\n";
    
        // Earnings by Month Section
        csvContent += "Earnings by Month\n";
        csvContent += `Month,Earnings (${displayCurrency})\n`;
        chartData.forEach(monthData => {
            csvContent += `${monthData.label},${monthData.earnings.toFixed(2)}\n`;
        });
        csvContent += "\n";
    
        // Earnings by Client Section
        csvContent += "Earnings by Client\n";
        csvContent += `Client,Earnings (${displayCurrency})\n`;
        allClientsData.forEach(clientData => {
            // strip currency symbol from secondary string
            const earnings = clientData.secondary.replace(currencySymbol, '');
            csvContent += `${escapeCsvCell(clientData.primary)},${earnings}\n`;
        });
    
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `PDF_Invoicer_Summary_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="text-center p-10">Loading dashboard...</div>;
    }
    
    if (invoices.length === 0) {
         return (
             <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <RocketIcon className="w-24 h-24 text-blue-400 mb-6" />
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Welcome to Your Dashboard!</h2>
                <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
                    It looks like you haven't created any invoices yet.
                </p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                    Click on 'Create Invoice' in the sidebar to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AllClientsModal isOpen={isAllClientsModalOpen} onClose={() => setIsAllClientsModalOpen(false)} clients={allClientsData} />
            <AllReferencesModal isOpen={isAllRefsModalOpen} onClose={() => setIsAllRefsModalOpen(false)} references={allReferencesData} />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">My Dashboard</h2>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                        <select
                            value={displayCurrency}
                            onChange={(e) => setDisplayCurrency(e.target.value)}
                            disabled={ratesLoading}
                            className="pl-3 pr-8 py-2 rounded-lg text-sm font-semibold border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none"
                            title="Select display currency"
                        >
                            {ratesLoading ? <option>Loading...</option> : availableCurrenciesForDisplay.map(code => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="pl-3 pr-8 py-2 rounded-lg text-sm font-semibold border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none"
                            title="Select time period"
                        >
                            <option value="last12">Last 12 Months</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{`Year ${year}`}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handleExportSummary} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm" title="Export Summary">
                        <DownloadIcon />
                        Export
                    </button>
                </div>
            </div>
            
            <OutstandingNotice count={outstandingCount} amount={outstandingAmount} currency={currencySymbol} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Earnings" value={`${currencySymbol}${totalEarnings.toFixed(2)}`} icon={BarChartIcon} color="bg-blue-500" />
                <StatCard title="Total Invoices" value={totalInvoicesCount} icon={FileTextIcon} color="bg-green-500" />
                <StatCard title="Total Clients" value={totalClients} icon={GroupIcon} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{chartTitle}</h3>
                    <BarChart data={chartData} currency={currencySymbol} />
                </div>
                
                <ActivityCalendar 
                    invoices={invoices} 
                    currencySymbol={currencySymbol}
                    displayCurrency={displayCurrency}
                    convertCurrency={convertCurrency}
                />

                <ListCard 
                    title="Top Clients" 
                    items={topClients} 
                    icon={GroupIcon}
                    action={
                        <button onClick={() => setIsAllClientsModalOpen(true)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                            See All
                        </button>
                    }
                />
                
                <div className="lg:col-span-2">
                   <ListCard 
                        title="Client References" 
                        items={clientReferencesForCard} 
                        icon={IdCardIcon} 
                        action={
                            allReferencesData.length > 0 &&
                            <button onClick={() => setIsAllRefsModalOpen(true)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                See All
                            </button>
                        }
                    />
                </div>
            </div>
        </div>
    );
};
