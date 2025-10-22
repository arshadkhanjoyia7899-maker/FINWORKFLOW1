import React from 'react';
import { WorkflowStep } from '../types';
import { FileIcon } from './icons/FileIcon';
import { CheckIcon } from './icons/CheckIcon';
import { AiIcon } from './icons/AiIcon';
import { AlertIcon } from './icons/AlertIcon';
import { LogIcon } from './icons/LogIcon';

interface StepperProps {
    currentStep: WorkflowStep;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
    const steps = [
        { id: WorkflowStep.LoadData, name: 'Load Data', icon: FileIcon },
        { id: WorkflowStep.BudgetCheck, name: 'Budget Check', icon: CheckIcon },
        { id: WorkflowStep.PolicyCheck, name: 'Policy & AI Check', icon: AiIcon },
        { id: WorkflowStep.GenerateAlerts, name: 'Generate Alerts', icon: AlertIcon },
        { id: WorkflowStep.ReviewLog, name: 'Review & Log', icon: LogIcon },
    ];

    return (
        <nav>
            <ol role="list" className="space-y-4">
                {steps.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = currentStep === step.id;
                    
                    const getStatusClasses = () => {
                       if (isCurrent) return 'bg-accent text-white';
                       if (isCompleted) return 'bg-success/10 text-success';
                       return 'bg-base text-text-secondary';
                    };

                    return (
                        <li key={step.name} className="flex items-center gap-4">
                            <span
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${getStatusClasses()}`}
                            >
                                {isCompleted ? (
                                    <CheckIcon className="h-5 w-5" />
                                ) : (
                                    <step.icon className="h-5 w-5" />
                                )}
                            </span>
                             <span className={`font-medium text-sm ${isCurrent ? 'text-accent' : isCompleted ? 'text-text' : 'text-text-secondary'}`}>{step.name}</span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};