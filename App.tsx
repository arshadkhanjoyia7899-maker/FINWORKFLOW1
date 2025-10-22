import React, { useState } from 'react';
import { Stepper } from './components/Stepper';
import { Transaction, Budget, FlaggedTransaction, WorkflowStep, AiFlaggedTransaction } from './types';
import { TRANSACTIONS_CSV, BUDGET_CSV, POLICY_TEXT } from './constants';
import { geminiService } from './services/geminiService';
import { TransactionTable } from './components/TransactionTable';
import { ResultsLog } from './components/ResultsLog';
import { Spinner } from './components/Spinner';
import { ArrowRightIcon } from './components/icons/ArrowRightIcon';
import { RefreshIcon } from './components/icons/RefreshIcon';
import { FileIcon } from './components/icons/FileIcon';


const App: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.LoadData);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [policy] = useState<string>(POLICY_TEXT);
    const [flaggedTransactions, setFlaggedTransactions] = useState<Map<string, FlaggedTransaction>>(new Map());
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const parseCSV = <T,>(csvText: string): T[] => {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        const header = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return header.reduce((obj, nextKey, index) => {
                const key = nextKey as keyof T;
                let value: any = values[index];
                if (key === 'amount_SAR' || key === 'budget_SAR') {
                    value = parseFloat(value);
                }
                obj[key] = value;
                return obj;
            }, {} as T);
        });
        return data;
    };

    const handleNextStep = async () => {
        setError(null);
        setIsLoading(true);

        try {
            switch (currentStep) {
                case WorkflowStep.LoadData:
                    await handleLoadData();
                    break;
                case WorkflowStep.BudgetCheck:
                    await handleBudgetCheck();
                    break;
                case WorkflowStep.PolicyCheck:
                    await handlePolicyCheck();
                    break;
                case WorkflowStep.GenerateAlerts:
                    await handleGenerateAlerts();
                    break;
                case WorkflowStep.ReviewLog:
                    break;
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            if (currentStep < WorkflowStep.ReviewLog) {
                 setCurrentStep(currentStep + 1);
            }
        }
    };
    
    const handleLoadData = async () => {
        const parsedTransactions = parseCSV<Transaction>(TRANSACTIONS_CSV)
            .map((t, index) => ({ ...t, id: `txn_${index + 1}` }));
        const parsedBudgets = parseCSV<Budget>(BUDGET_CSV);
        setTransactions(parsedTransactions);
        setBudgets(parsedBudgets);
    };

    const handleBudgetCheck = async () => {
        const spentByCostCenter = new Map<string, number>();
        const budgetByCostCenter = new Map<string, number>(budgets.map(b => [b.cost_center, b.budget_SAR]));
        const newFlags = new Map<string, FlaggedTransaction>(flaggedTransactions);
        
        transactions.forEach(tx => {
            const period = tx.date.substring(0, 7);
            if (period !== '2025-10') return;

            const currentSpent = spentByCostCenter.get(tx.cost_center) || 0;
            const budget = budgetByCostCenter.get(tx.cost_center) || 0;
            
            if (currentSpent + tx.amount_SAR > budget) {
                const reason = `Exceeds budget for cost center ${tx.cost_center}. Budget: ${(budget).toFixed(2)} SAR, Spent before this tx: ${currentSpent.toFixed(2)} SAR.`;
                const existing = newFlags.get(tx.id!);
                if (existing) {
                    existing.reasons.push({ type: 'Budget', detail: reason });
                } else {
                    newFlags.set(tx.id!, {
                        transaction: tx,
                        reasons: [{ type: 'Budget', detail: reason }],
                    });
                }
            }
             spentByCostCenter.set(tx.cost_center, currentSpent + tx.amount_SAR);
        });

        setFlaggedTransactions(newFlags);
    };

    const handlePolicyCheck = async () => {
        const newFlags = new Map<string, FlaggedTransaction>(flaggedTransactions);
        transactions.forEach(tx => {
            const isTravelOrAccom = tx.description.toLowerCase().includes('travel') || tx.description.toLowerCase().includes('accommodation');
            if (isTravelOrAccom && tx.amount_SAR > 5000) {
                 const reason = `Requires pre-approval as travel/accommodation cost is over SAR 5,000.`;
                 const existing = newFlags.get(tx.id!);
                 if (existing) {
                    if (!existing.reasons.some(r => r.detail === reason)) {
                        existing.reasons.push({ type: 'Rule', detail: reason });
                    }
                 } else {
                    newFlags.set(tx.id!, {
                        transaction: tx,
                        reasons: [{ type: 'Rule', detail: reason }],
                    });
                 }
            }
        });

        try {
            const aiFlagged = await geminiService.analyzeTransactions(policy, transactions);
            aiFlagged.forEach((flag: AiFlaggedTransaction) => {
                const reason = `AI Flag (${flag.confidence.toLowerCase()} confidence): ${flag.reason}`;
                const existing = newFlags.get(flag.transaction_id);
                if (existing) {
                    if (!existing.reasons.some(r => r.detail.startsWith('AI Flag'))) {
                        existing.reasons.push({ type: 'AI', detail: reason });
                    }
                } else {
                    const transaction = transactions.find(t=>t.id === flag.transaction_id);
                    if (transaction) {
                        newFlags.set(flag.transaction_id, { 
                            transaction, 
                            reasons: [{ type: 'AI', detail: reason }] 
                        });
                    }
                }
            });
        } catch (e) {
            console.error("AI analysis failed:", e);
            setError("AI-based policy check failed. Proceeding with rule-based checks only.");
        }

        setFlaggedTransactions(newFlags);
    };

    const handleGenerateAlerts = async () => {
        const alertsToGenerate = Array.from(flaggedTransactions.values());
        const updatedFlags = new Map<string, FlaggedTransaction>(flaggedTransactions);

        for (const flag of alertsToGenerate as FlaggedTransaction[]) {
            try {
                const alert = await geminiService.generateBilingualAlert(flag);
                const existing = updatedFlags.get(flag.transaction.id!);
                if (existing) {
                    existing.alerts = alert;
                    updatedFlags.set(flag.transaction.id!, existing);
                }
            } catch (e) {
                console.error(`Failed to generate alert for ${flag.transaction.id!}:`, e);
                const existing = updatedFlags.get(flag.transaction.id!);
                 if (existing) {
                    existing.alerts = { english: 'Error generating alert.', arabic: 'خطأ في إنشاء التنبيه.' };
                    updatedFlags.set(flag.transaction.id!, existing);
                }
            }
        }
        setFlaggedTransactions(updatedFlags);
    };
    
    const handleReset = () => {
        setCurrentStep(WorkflowStep.LoadData);
        setTransactions([]);
        setBudgets([]);
        setFlaggedTransactions(new Map());
        setIsLoading(false);
        setError(null);
    };
    
    const getStepContent = () => {
        const stepInfo = {
            [WorkflowStep.LoadData]: { title: 'Load & Verify Data', description: 'Begin by loading and verifying the transaction and budget data sets.' },
            [WorkflowStep.BudgetCheck]: { title: 'Budget Compliance Check', description: 'Review transactions automatically checked against their cost center budgets.' },
            [WorkflowStep.PolicyCheck]: { title: 'Policy & AI Analysis', description: 'Transactions are checked against company policy rules and analyzed by AI for anomalies.' },
            [WorkflowStep.GenerateAlerts]: { title: 'Generate Bilingual Alerts', description: 'Reviewing AI-generated bilingual alerts for all flagged transactions.' },
            [WorkflowStep.ReviewLog]: { title: 'Process Complete: Review & Log', description: 'The workflow is complete. Review the final log of all flagged transactions and their alerts.' }
        };
        return stepInfo[currentStep];
    };

    const getButtonText = () => {
        switch (currentStep) {
            case WorkflowStep.LoadData: return "Load Data";
            case WorkflowStep.BudgetCheck: return "Run Budget Check";
            case WorkflowStep.PolicyCheck: return "Run Policy & AI Check";
            case WorkflowStep.GenerateAlerts: return "Generate Alerts";
            case WorkflowStep.ReviewLog: return "Process Complete";
            default: return "Next";
        }
    }

    return (
        <div className="flex h-screen font-sans text-text antialiased">
            <aside className="w-72 bg-surface border-r border-subtle-border p-8 flex flex-col">
                <header className="flex items-center gap-2 mb-12">
                     <div className="w-8 h-8 bg-accent text-white flex items-center justify-center rounded-lg font-bold text-lg">E</div>
                     <h1 className="text-lg font-semibold text-text tracking-tight">
                        Expense Processor
                    </h1>
                </header>
                <Stepper currentStep={currentStep} />
            </aside>

            <main className="flex-1 flex flex-col">
                <div className="flex-1 p-8 sm:p-12 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                        <header className="mb-8">
                            <h2 className="text-3xl font-bold text-text tracking-tight">{getStepContent().title}</h2>
                            <p className="text-text-secondary mt-2">{getStepContent().description}</p>
                        </header>

                        {error && (
                            <div className="bg-danger-light border border-danger text-danger px-4 py-3 rounded-lg mb-6" role="alert">
                                <strong className="font-bold">Error: </strong>
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}
                        
                        <div className="bg-surface rounded-xl shadow-main p-8">
                           {currentStep === WorkflowStep.LoadData && (
                               <div className="text-center py-12">
                                   <FileIcon className="w-16 h-16 mx-auto text-text-secondary opacity-50"/>
                                   <p className="mt-4 text-text-secondary">Click "Load Data" to begin the workflow.</p>
                               </div>
                           )}

                           {currentStep > WorkflowStep.LoadData && currentStep < WorkflowStep.ReviewLog && (
                               <TransactionTable 
                                 transactions={transactions} 
                                 flaggedTransactionIds={new Set(Array.from(flaggedTransactions.keys()))}
                               />
                           )}

                           {currentStep === WorkflowStep.ReviewLog && (
                               <ResultsLog flaggedTransactions={Array.from(flaggedTransactions.values())} />
                           )}
                        </div>
                    </div>
                </div>

                <footer className="bg-surface/80 backdrop-blur-sm border-t border-subtle-border p-4">
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary bg-transparent rounded-lg hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-colors"
                            disabled={isLoading}
                        >
                            <RefreshIcon className="w-4 h-4" />
                            Reset Workflow
                        </button>
                        <button
                            onClick={handleNextStep}
                            disabled={isLoading || currentStep === WorkflowStep.ReviewLog}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isLoading ? <Spinner /> : getButtonText()}
                             {!isLoading && currentStep < WorkflowStep.ReviewLog && <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default App;