import React, { useState } from 'react';
import { Job, InputType, ScenePrompt } from '../types';
import { VIDEO_MODELS, ASPECT_RATIOS } from '../constants';
import { PlusIcon, SparklesIcon, TrashIcon } from './icons';
import { generateScenePrompts } from '../services/geminiService';

interface JobFormProps {
    onAddJob: (job: Omit<Job, 'id' | 'status'>) => void;
    isDisabled: boolean;
}

type CreationMode = 'single' | 'multi';

const JobForm: React.FC<JobFormProps> = ({ onAddJob, isDisabled }) => {
    // Shared state
    const [creationMode, setCreationMode] = useState<CreationMode>('single');
    const [model, setModel] = useState(VIDEO_MODELS[0]);
    const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);

    // Single job state
    const [prompt, setPrompt] = useState('');
    const [inputType, setInputType] = useState<InputType>(InputType.TextToVideo);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Multi-scene state
    const [topicPrompt, setTopicPrompt] = useState('');
    const [sceneCount, setSceneCount] = useState<number | string>(5);
    const [characters, setCharacters] = useState<(File | null)[]>(Array(4).fill(null));
    const [generatedPrompts, setGeneratedPrompts] = useState<ScenePrompt[]>([]);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    
    const isImageInput = inputType === InputType.ImageToVideo || inputType === InputType.FrameToVideo;

    const resetSingleJobForm = () => {
        setPrompt('');
        setImageFile(null);
        const fileInput = document.getElementById('imageFile') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    };

    const handleSingleJobSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isImageInput && !imageFile) {
            alert('Please select an image file for this input type.');
            return;
        }
        if (!prompt.trim()) {
            alert('Please enter a prompt.');
            return;
        }
        onAddJob({
            prompt,
            inputType,
            model,
            aspectRatio,
            outputCount: 1,
            imageFile: isImageInput ? imageFile! : undefined,
        });
        resetSingleJobForm();
    };

    const handleCharacterChange = (index: number, file: File | null) => {
        const newCharacters = [...characters];
        newCharacters[index] = file;
        setCharacters(newCharacters);
    };

    const handleGeneratePrompts = async () => {
        const count = Number(sceneCount);
        if (!topicPrompt.trim() || !count || count <= 0 || count > 50) {
            alert('Please enter a valid topic and a scene count between 1 and 50.');
            return;
        }
        setIsGeneratingPrompts(true);
        setGeneratedPrompts([]);
        try {
            const prompts = await generateScenePrompts(topicPrompt, count);
            setGeneratedPrompts(prompts);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsGeneratingPrompts(false);
        }
    };
    
    const handleUpdateGeneratedPrompt = (index: number, newText: string) => {
        const updatedPrompts = [...generatedPrompts];
        updatedPrompts[index] = { ...updatedPrompts[index], prompt: newText };
        setGeneratedPrompts(updatedPrompts);
    };

    const handleAddAllToQueue = () => {
        if (generatedPrompts.length === 0) {
            alert("No prompts generated to add.");
            return;
        }
        const characterImage = characters[0];
        generatedPrompts.forEach(p => {
            onAddJob({
                prompt: p.prompt,
                inputType: characterImage ? InputType.ImageToVideo : InputType.TextToVideo,
                model,
                aspectRatio,
                outputCount: 1,
                imageFile: characterImage || undefined,
            });
        });
        setGeneratedPrompts([]);
        setTopicPrompt('');
    };
    
    const renderCharacterInputs = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {characters.map((charFile, index) => (
                <div key={index}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Character {index + 1}</label>
                    <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            {charFile ? (
                                <div className="relative group">
                                    <img src={URL.createObjectURL(charFile)} alt={`Character ${index+1} preview`} className="mx-auto h-20 w-20 object-cover rounded-md" />
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => handleCharacterChange(index, null)} className="p-1 bg-red-600 rounded-full text-white hover:bg-red-700">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                            <div className="flex text-sm text-gray-500">
                                <label htmlFor={`char-file-${index}`} className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none">
                                    <span>Upload file</span>
                                    <input id={`char-file-${index}`} name={`char-file-${index}`} type="file" className="sr-only" accept="image/*" onChange={e => handleCharacterChange(index, e.target.files ? e.target.files[0] : null)} disabled={isDisabled} />
                                </label>
                            </div>
                            <p className="text-xs text-gray-600">PNG, JPG, GIF up to 10MB</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
    
    return (
        <div className="bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="mb-6 border-b border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setCreationMode('single')} className={`${creationMode === 'single' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>Single Job</button>
                    <button onClick={() => setCreationMode('multi')} className={`${creationMode === 'multi' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}>Multi-Scene Story</button>
                </nav>
            </div>
            
            {creationMode === 'single' ? (
                <form onSubmit={handleSingleJobSubmit} className="space-y-6">
                    {/* SINGLE JOB FORM */}
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Prompt</label>
                        <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm placeholder-gray-500" placeholder="e.g., A cinematic shot of a robot surfing on a cosmic wave" required disabled={isDisabled} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="inputType" className="block text-sm font-medium text-gray-300 mb-1">Input Type</label>
                            <select id="inputType" value={inputType} onChange={(e) => setInputType(e.target.value as InputType)} className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm" disabled={isDisabled}>
                                {Object.values(InputType).map(type => (<option key={type} value={type}>{type.replace(/-/g, ' ')}</option>))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                            <select id="model" value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm" disabled={isDisabled}>
                                {VIDEO_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
                            <select id="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm" disabled={isDisabled}>
                                {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                            </select>
                        </div>
                    </div>
                    {isImageInput && (
                        <div>
                            <label htmlFor="imageFile" className="block text-sm font-medium text-gray-300 mb-1">Upload Image</label>
                            <input type="file" id="imageFile" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 disabled:opacity-50" required disabled={isDisabled} />
                        </div>
                    )}
                    <div className="pt-2">
                        <button type="submit" disabled={isDisabled} className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            <PlusIcon /> Add Job to List
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-6">
                    {/* MULTI-SCENE FORM */}
                    <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1">Story Topic</label>
                        <textarea id="topic" value={topicPrompt} onChange={(e) => setTopicPrompt(e.target.value)} rows={2} className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm placeholder-gray-500" placeholder="e.g., A brave cat astronaut explores a planet made of cheese" required disabled={isDisabled || isGeneratingPrompts} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="sceneCount" className="block text-sm font-medium text-gray-300 mb-1">Number of Scenes</label>
                            <input type="number" id="sceneCount" value={sceneCount} onChange={e => setSceneCount(e.target.value)} min="1" max="50" className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm" disabled={isDisabled || isGeneratingPrompts} />
                        </div>
                         <div>
                            <label htmlFor="model-multi" className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                            <select id="model-multi" value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm" disabled={isDisabled || isGeneratingPrompts}>
                                {VIDEO_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aspectRatio-multi" className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
                            <select id="aspectRatio-multi" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="mt-1 block w-full bg-slate-900 border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm" disabled={isDisabled || isGeneratingPrompts}>
                                {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                            </select>
                        </div>
                    </div>
                    {renderCharacterInputs()}
                    <div>
                         <button type="button" onClick={handleGeneratePrompts} disabled={isDisabled || isGeneratingPrompts} className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            {isGeneratingPrompts ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon /> Generate Prompts
                                </>
                            )}
                        </button>
                    </div>

                    {generatedPrompts.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                             <h3 className="text-lg font-medium text-white">Review Generated Scenes</h3>
                             <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {generatedPrompts.map((p, index) => (
                                    <div key={index} className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-400">{index+1}.</span>
                                            <input type="text" value={p.prompt} onChange={e => handleUpdateGeneratedPrompt(index, e.target.value)} className="block w-full bg-slate-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm" disabled={isDisabled}/>
                                        </div>
                                        <p className="pl-6 pt-1 text-xs text-gray-400 italic">{p.translation}</p>
                                    </div>
                                ))}
                             </div>
                             <div className="pt-2">
                                <button type="button" onClick={handleAddAllToQueue} disabled={isDisabled} className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                                    <PlusIcon /> Add All {generatedPrompts.length} Jobs to List
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default JobForm;