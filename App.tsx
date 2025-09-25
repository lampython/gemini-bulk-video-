import React, { useState, useEffect } from 'react';
import { Job, JobStatus } from './types';
import { generateVideoFromApi } from './services/geminiService';
import { MAX_JOBS_PER_MINUTE } from './constants';
import JobForm from './components/JobForm';
import JobList from './components/JobList';
import { DownloadIcon } from './components/icons';

const App: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [jobStartTimestamps, setJobStartTimestamps] = useState<number[]>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
    const [maxConcurrentJobs, setMaxConcurrentJobs] = useState<number>(4);

    const addJob = (jobDetails: Omit<Job, 'id' | 'status'>) => {
        const newJob: Job = {
            id: Date.now() + Math.random(),
            status: JobStatus.Queued,
            ...jobDetails,
        };
        setJobs(prevJobs => [...prevJobs, newJob]);
    };

    const handleJobRetry = (jobId: number) => {
        setJobs(prevJobs =>
            prevJobs.map(job =>
                job.id === jobId
                    ? { ...job, status: JobStatus.Queued, error: undefined, videoUrl: undefined }
                    : job
            )
        );
    };

    const handleDownloadAll = () => {
        const successfulJobs = jobs.filter(j => j.status === JobStatus.Success && j.videoUrl);
        if (successfulJobs.length === 0) {
            alert("No successful videos to download.");
            return;
        }
        successfulJobs.forEach((job, index) => {
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = job.videoUrl!;
                a.download = `video_${job.id}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, index * 300); // Stagger downloads to avoid browser blocking
        });
    };

    const processJob = async (job: Job) => {
        try {
            const videoUrl = await generateVideoFromApi(job);
            setJobs(currentJobs =>
                currentJobs.map(j =>
                    j.id === job.id ? { ...j, status: JobStatus.Success, videoUrl, error: undefined } : j
                )
            );
        } catch (error) {
            setJobs(currentJobs =>
                currentJobs.map(j =>
                    j.id === job.id ? { ...j, status: JobStatus.Failed, error: (error as Error).message } : j
                )
            );
        }
    };
    
    useEffect(() => {
        if (jobs.some(j => j.status === JobStatus.Queued) && !isProcessingQueue) {
            setIsProcessingQueue(true);
        }
    }, [jobs, isProcessingQueue]);

    useEffect(() => {
        if (!isProcessingQueue) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;

            const recentTimestamps = jobStartTimestamps.filter(ts => ts > oneMinuteAgo);
            const processingCount = jobs.filter(j => j.status === JobStatus.Processing).length;
            
            const availableSlots = maxConcurrentJobs - processingCount;
            const availableRateLimit = MAX_JOBS_PER_MINUTE - recentTimestamps.length;
            
            const slotsToFill = Math.min(availableSlots, availableRateLimit);

            if (slotsToFill > 0) {
                const jobsToStart = jobs.filter(j => j.status === JobStatus.Queued).slice(0, slotsToFill);

                if (jobsToStart.length > 0) {
                    const newTimestamps = Array(jobsToStart.length).fill(Date.now());
                    setJobStartTimestamps(prev => [...prev.filter(ts => ts > oneMinuteAgo), ...newTimestamps]);
                    
                    setJobs(currentJobs =>
                        currentJobs.map(j =>
                            jobsToStart.find(js => js.id === j.id) ? { ...j, status: JobStatus.Processing } : j
                        )
                    );

                    jobsToStart.forEach(job => processJob(job));
                } else {
                     const isStillProcessing = jobs.some(j => j.status === JobStatus.Processing);
                     if (!isStillProcessing) {
                         setIsProcessingQueue(false);
                     }
                }
            }
        }, 1000); // Check every second

        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobs, isProcessingQueue, jobStartTimestamps, maxConcurrentJobs]);


    const successfulJobsCount = jobs.filter(j => j.status === JobStatus.Success).length;

    return (
        <div className="min-h-screen container mx-auto p-4 md:p-8 font-sans">
            <header className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                    Gemini Bulk Video Generator
                </h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Create multiple video generation jobs, customize their parameters, and let the system process them automatically.
                </p>
            </header>

            <main className="flex flex-col gap-8">
                <JobForm onAddJob={addJob} isDisabled={isProcessingQueue} />
                
                <div className="bg-slate-800 rounded-lg shadow-lg p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 flex-wrap">
                        <h2 className="text-2xl font-semibold text-white">Processing Queue</h2>
                        <div className="flex gap-4 items-center flex-wrap justify-end">
                            <div className="flex items-center">
                                <label htmlFor="concurrency" className="text-sm font-medium text-gray-300 mr-2 whitespace-nowrap">Concurrent Jobs:</label>
                                <input 
                                    type="number" 
                                    id="concurrency" 
                                    value={maxConcurrentJobs} 
                                    onChange={e => {
                                        const value = parseInt(e.target.value, 10);
                                        setMaxConcurrentJobs(Math.max(1, isNaN(value) ? 1 : value));
                                    }}
                                    min="1" 
                                    max="10"
                                    className="w-20 bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm disabled:opacity-50"
                                    disabled={isProcessingQueue}
                                />
                            </div>
                             <span className="text-sm text-gray-400">{jobs.length} total jobs</span>
                             <button
                                onClick={handleDownloadAll}
                                disabled={isProcessingQueue || successfulJobsCount === 0}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-colors"
                            >
                                <DownloadIcon /> Download All ({successfulJobsCount})
                            </button>
                        </div>
                    </div>
                    <JobList jobs={jobs} onRetry={handleJobRetry} />
                </div>
            </main>
        </div>
    );
};

export default App;