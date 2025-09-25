import React from 'react';
import { Job, JobStatus } from '../types';
import { RefreshIcon, DownloadIcon } from './icons';

interface JobItemProps {
    job: Job;
    onRetry: (jobId: number) => void;
}

const statusClasses: { [key in JobStatus]: { badge: string, text: string } } = {
    [JobStatus.Queued]: { badge: 'bg-gray-500', text: 'text-gray-100' },
    [JobStatus.Processing]: { badge: 'bg-yellow-500', text: 'text-yellow-900' },
    [JobStatus.Success]: { badge: 'bg-green-500', text: 'text-green-100' },
    [JobStatus.Failed]: { badge: 'bg-red-500', text: 'text-red-100' },
};

const JobItem: React.FC<JobItemProps> = ({ job, onRetry }) => {
    const { badge, text } = statusClasses[job.status];

    return (
        <div className="p-4 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-300 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-12 md:col-span-2">
                {job.status === JobStatus.Success && job.videoUrl ? (
                    <video
                        src={job.videoUrl}
                        controls
                        className="w-full rounded-md aspect-video bg-black"
                        preload="metadata"
                    />
                ) : (
                    <div className="w-full aspect-video bg-slate-700 rounded-md flex items-center justify-center">
                        <span className="text-xs text-gray-400">{job.status === JobStatus.Queued ? 'Waiting...' : 'Generating...'}</span>
                    </div>
                )}
            </div>
            
            <div className="col-span-12 md:col-span-6 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate" title={job.prompt}>
                    {job.prompt}
                </p>
                <div className="text-xs text-gray-400 mt-1">
                    <span>Model: {job.model}</span>
                </div>
            </div>
            
            <div className="col-span-6 md:col-span-2 text-center">
                 <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badge} ${text}`}>
                    {job.status}
                </span>
            </div>

            <div className="col-span-6 md:col-span-2 flex justify-end items-center gap-3 h-full">
                {job.status === JobStatus.Processing && (
                    <div className="w-full bg-slate-700 rounded-full h-1.5 animate-pulse">
                        <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                )}
                {job.status === JobStatus.Failed && (
                    <button onClick={() => onRetry(job.id)} title="Retry" className="p-2 rounded-full text-gray-300 hover:bg-slate-600 hover:text-white transition-colors">
                        <RefreshIcon />
                    </button>
                )}
                {job.status === JobStatus.Success && job.videoUrl && (
                     <a href={job.videoUrl} download={`video_${job.id}.mp4`} title="Download" className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30">
                        <DownloadIcon />
                    </a>
                )}
            </div>
            
            {job.status === JobStatus.Failed && job.error && (
                <p className="col-span-12 mt-2 text-xs text-red-300 bg-red-900/30 p-2 rounded">
                    Error: {job.error}
                </p>
            )}
        </div>
    );
};

export default JobItem;