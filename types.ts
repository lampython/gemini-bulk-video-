export enum JobStatus {
    Queued = 'Queued',
    Processing = 'Processing',
    Success = 'Success',
    Failed = 'Failed',
}

export enum InputType {
    TextToVideo = 'Text-to-Video',
    ImageToVideo = 'Image-to-Video',
    FrameToVideo = 'Frame-to-Video',
}

export type ScenePrompt = {
    prompt: string;
    translation: string;
};

export type Job = {
    id: number;
    prompt: string;
    inputType: InputType;
    model: string;
    aspectRatio: string;
    outputCount: number;
    imageFile?: File;
    status: JobStatus;
    videoUrl?: string;
    error?: string;
};