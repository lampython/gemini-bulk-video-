import { GoogleGenAI, Type } from "@google/genai";
import { Job, InputType, ScenePrompt } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a mock service.");
}

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = (reader.result as string).split(',')[1];
            resolve(result);
        };
        reader.onerror = error => reject(error);
    });
};

const mockGenerateVideo = (): Promise<string> => {
    console.log("Using mock video generation service.");
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const mockVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
             fetch(mockVideoUrl)
                .then(response => response.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    resolve(url);
                })
                .catch(error => {
                    console.error("Mock video fetch failed:", error);
                    reject(new Error("Failed to fetch mock video."));
                });
        }, 5000 + Math.random() * 5000); // Simulate network delay
    });
};

const mockGenerateScenePrompts = (topic: string, sceneCount: number): Promise<ScenePrompt[]> => {
    console.log("Using mock prompt generation service.");
    return new Promise((resolve) => {
        setTimeout(() => {
            const prompts = Array.from({ length: sceneCount }, (_, i) => ({
                prompt: `Mock prompt for "${topic}", scene ${i + 1}.`,
                translation: `(Bản dịch mẫu) Lời nhắc cho "${topic}", cảnh ${i + 1}.`
            }));
            resolve(prompts);
        }, 1500);
    });
};


export const generateScenePrompts = async (topic: string, sceneCount: number): Promise<ScenePrompt[]> => {
    if (!ai) {
        return mockGenerateScenePrompts(topic, sceneCount);
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Create a compelling story with exactly ${sceneCount} scenes about "${topic}".`,
            config: {
                systemInstruction: "You are a creative scriptwriter and a helpful translator. Generate a list of distinct scene prompts for a video based on a topic. For each prompt, provide a Vietnamese translation. Respond ONLY with a valid JSON array of objects, where each object contains a 'prompt' (in English) and a 'translation' (in Vietnamese).",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        prompt: {
                          type: Type.STRING,
                          description: 'A single, concise prompt for one video scene, in English.',
                        },
                        translation: {
                          type: Type.STRING,
                          description: 'The Vietnamese translation of the prompt.',
                        },
                      },
                      required: ["prompt", "translation"],
                    },
                },
            },
        });
        
        const jsonText = response.text.trim();
        const prompts = JSON.parse(jsonText);

        if (!Array.isArray(prompts) || prompts.some(p => typeof p.prompt !== 'string' || typeof p.translation !== 'string')) {
            throw new Error("API returned an invalid prompt array structure.");
        }
        
        return prompts;

    } catch(error) {
        console.error("Error generating scene prompts:", error);
        throw new Error("Failed to generate prompts from AI.");
    }
};


export const generateVideoFromApi = async (job: Job): Promise<string> => {
    if (!ai) {
        return mockGenerateVideo();
    }

    const { prompt, inputType, imageFile, model, outputCount } = job;
    
    let imagePayload;
    if ((inputType === InputType.ImageToVideo || inputType === InputType.FrameToVideo) && imageFile) {
        const base64Image = await fileToBase64(imageFile);
        imagePayload = {
            imageBytes: base64Image,
            mimeType: imageFile.type,
        };
    }

    try {
        let operation = await ai.models.generateVideos({
            model: model.includes('(mock)') ? 'veo-2.0-generate-001' : model, // Use real model name even for mock UI
            prompt: prompt,
            image: imagePayload,
            config: {
                numberOfVideos: outputCount,
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        if (operation.error) {
            throw new Error(`API Error: ${operation.error.message}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation succeeded but no download link was provided.");
        }
        
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to download video file: ${response.statusText}`);
        }
        
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error generating video:", error);
        throw error;
    }
};