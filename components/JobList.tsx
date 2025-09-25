import React from 'react';
import { Job } from '../types';
import JobItem from './JobItem';

interface JobListProps {
    jobs: Job[];
    onRetry: (jobId: number) => void;
}

const JobList: React.FC<JobListProps> = ({ jobs, onRetry }) => {
    if (jobs.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 border-t border-slate-700 mt-4">
                <p>Your job queue is empty.</p>
                <p>Add a new job using the form to get started.</p>
            </div>
        );
    }
    
    return (
        <div className="flow-root mt-6">
             <div className="divide-y divide-slate-700">
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-400">
                    <div className="col-span-2">Preview</div>
                    <div className="col-span-6">Prompt</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="space-y-3 pt-3">
                    {jobs.map(job => (
                        <JobItem key={job.id} job={job} onRetry={onRetry} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default JobList;