"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  Download,
  Play,
  Wand2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { overlayAlbumCoverOnVideo } from "@/utils/ffmpeg";
import {
  base64ToBlobUrl,
  createCompositeAlbumImage,
} from "@/utils/image-utils";

export default function CoverLoopApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showBackground, setShowBackground] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [generatedBackground, setGeneratedBackground] = useState<string | null>(
    null
  );
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [processedVideo, setProcessedVideo] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [falError, setFalError] = useState<string | null>(null);
  const [limitAudioTo20Seconds, setLimitAudioTo20Seconds] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setShowBackground(false);
        setShowAnimation(false);
        setGeneratedVideo(null);
        setProcessedVideo(null);
        setUploadedAudio(null);
        setFinalVideo(null);
        setFalError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedAudio(e.target?.result as string);
        setFinalVideo(null); // Clear final video when new audio is uploaded
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateBackground = async () => {
    if (!uploadedImage) return;

    setIsGeneratingBackground(true);
    setGeminiError(null);

    try {
      // Convert data URL to base64
      const base64Data = uploadedImage.split(",")[1];
      const mimeType = uploadedImage.split(",")[0].split(":")[1].split(";")[0];

      // Call API to analyze image and generate background in one step
      const response = await fetch("/api/gemini/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData: base64Data, mimeType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze and generate image");
      }

      const responseData = await response.json();
      console.log("Analysis and generation complete:", responseData);

      if (!responseData.imageData) {
        throw new Error("Failed to generate background image");
      }

      // Create composite image with album cover at center
      const compositeImage = await createCompositeAlbumImage({
        albumCoverUrl: uploadedImage,
        backgroundUrl: base64ToBlobUrl(
          responseData.imageData,
          responseData.mimeType
        ),
        albumCoverScale: 0.2,
      });

      setGeneratedBackground(compositeImage);
      setShowBackground(true);
      setShowAnimation(false);
    } catch (error) {
      console.error("Error generating background:", error);
      setGeminiError(
        error instanceof Error ? error.message : "Failed to generate background"
      );
      // Fallback to showing placeholder
      setShowBackground(true);
      setShowAnimation(false);
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const handleAnimateBackground = async () => {
    if (!generatedBackground) {
      setShowAnimation(true);
      return;
    }

    setIsGeneratingVideo(true);
    setFalError(null);
    // Clear previous videos when retrying
    if (generatedVideo) {
      setGeneratedVideo(null);
    }
    if (processedVideo) {
      setProcessedVideo(null);
    }

    try {
      // Convert composite image to base64 for upload
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = generatedBackground;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const base64Data = canvas.toDataURL("image/png").split(",")[1];

      // Upload image to Fal AI storage
      const uploadResponse = await fetch("/api/fal/upload-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: base64Data,
          mimeType: "image/png",
        }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const uploadData = await uploadResponse.json();
      console.log("Image uploaded:", uploadData.imageUrl);

      // Generate video with Fal AI
      const videoResponse = await fetch("/api/fal/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: uploadData.imageUrl,
        }),
      });

      if (!videoResponse.ok) {
        const error = await videoResponse.json();
        throw new Error(error.error || "Failed to generate video");
      }

      const videoData = await videoResponse.json();
      console.log("Video generated:", videoData.videoUrl);
      setGeneratedVideo(videoData.videoUrl);

      // Process video with FFmpeg to overlay original album cover
      setIsProcessingVideo(true);
      try {
        console.log("🎨 Processing video with album cover overlay...");
        const processedVideoUrl = await overlayAlbumCoverOnVideo(
          videoData.videoUrl,
          uploadedImage || ""
        );
        setProcessedVideo(processedVideoUrl);
        console.log("✅ Video processing completed!");
      } catch (ffmpegError) {
        console.error("FFmpeg processing failed:", ffmpegError);
        setFalError(
          "Video generated but overlay processing failed. Using original video."
        );
      } finally {
        setIsProcessingVideo(false);
      }

      setShowAnimation(true);
    } catch (error) {
      console.error("Error generating video:", error);
      setFalError(
        error instanceof Error ? error.message : "Failed to generate video"
      );
      // Fallback to showing static animation
      setShowAnimation(true);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleProcessAudio = async () => {
    if (!processedVideo || !uploadedAudio) return;

    setIsProcessingAudio(true);
    setFalError(null);

    try {
      console.log("🎵 Processing final video with audio...");
      const finalVideoUrl = await overlayAlbumCoverOnVideo(
        processedVideo,
        uploadedImage || "",
        uploadedAudio,
        limitAudioTo20Seconds
      );
      setFinalVideo(finalVideoUrl);
      console.log("✅ Final video with audio completed!");
    } catch (error) {
      console.error("Audio processing failed:", error);
      setFalError(
        error instanceof Error ? error.message : "Failed to process audio"
      );
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleDownload = () => {
    if (finalVideo) {
      // Download the final video with audio
      const link = document.createElement("a");
      link.href = finalVideo;
      link.download = `coverloop-final-${Date.now()}.mp4`;
      link.click();
    } else if (processedVideo) {
      // Download the processed video with album cover overlay
      const link = document.createElement("a");
      link.href = processedVideo;
      link.download = `coverloop-enhanced-${Date.now()}.mp4`;
      link.click();
    } else if (generatedVideo) {
      // Download the original generated video
      const link = document.createElement("a");
      link.href = generatedVideo;
      link.download = `coverloop-video-${Date.now()}.mp4`;
      link.click();
    } else if (generatedBackground) {
      // Download the composite image
      const link = document.createElement("a");
      link.href = generatedBackground;
      link.download = `coverloop-composite-${Date.now()}.png`;
      link.click();
    } else {
      console.error("No video or composite image to download");
    }
  };

  return (
    <div className="min-h-screen  text-neutral-100">
      {/* Header */}
      <header className="text-center py-16 px-4 text-primary">
        <h1 className="text-5xl font-bold mb-4 text-balance">CoverLoop</h1>
        <p className="text-slate-300 text-xl text-balance max-w-2xl mx-auto leading-relaxed">
          Turn your album cover into a living visualizer.
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-16">
        <div className="space-y-8">
          {/* Step 1: Upload */}
          <Card className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                Upload Album Cover
              </h2>
              <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-12 cursor-pointer hover:border-blue-400 hover:bg-slate-800/30 transition-all duration-300 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-4 h-16 w-16 text-slate-400 group-hover:text-blue-400 transition-colors" />
                <p className="text-slate-200 mb-2 text-lg">
                  Click to upload your album cover
                </p>
                <p className="text-sm text-slate-400">JPEG or PNG files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </Card>

          {/* Step 2: Preview */}
          {uploadedImage && (
            <Card className="p-8 border-slate-700/50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                  Album Cover Preview
                </h2>
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded album cover"
                      className="max-w-xs max-h-64 object-contain rounded-xl shadow-2xl border border-slate-700"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 3: Generate Background */}
          {uploadedImage && (
            <Card className="p-8 border-slate-700/50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                  Generate Background
                </h2>
                <Button
                  onClick={handleGenerateBackground}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                  disabled={showBackground || isGeneratingBackground}
                >
                  {isGeneratingBackground ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : showBackground ? (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Background Generated ✓
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Generate Background
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 4: Background Preview */}
          {showBackground && (
            <Card className="p-8 border-slate-700/50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                  Background Preview
                </h2>
                {geminiError && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <p className="text-red-400 text-sm">{geminiError}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Showing placeholder background
                    </p>
                  </div>
                )}
                <div className="relative rounded-xl overflow-hidden min-h-64 flex items-center justify-center">
                  {generatedBackground ? (
                    <img
                      src={generatedBackground}
                      alt="Generated background"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 w-full h-full flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
                      <div className="text-white/90 text-xl font-medium">
                        Generated Background Placeholder
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Step 5: Animate Background */}
          {showBackground && (
            <Card className="p-8 border-slate-700/50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                  Animate Background
                </h2>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleAnimateBackground}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
                    disabled={isGeneratingVideo || isProcessingVideo}
                  >
                    {isGeneratingVideo ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Video...
                      </>
                    ) : isProcessingVideo ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing Video...
                      </>
                    ) : showAnimation ? (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        {generatedVideo ? "Regenerate Video" : "Generate Video"}
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Generate Video
                      </>
                    )}
                  </Button>

                  {showAnimation && (generatedVideo || falError) && (
                    <Button
                      onClick={handleAnimateBackground}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                      disabled={isGeneratingVideo || isProcessingVideo}
                    >
                      {isGeneratingVideo || isProcessingVideo ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {falError && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <p className="text-red-400 text-sm">{falError}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Falling back to static animation
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Step 6: Audio Upload */}
          {processedVideo && (
            <Card className="p-8 border-slate-700/50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                  Add Audio Track
                </h2>
                <div
                  className="border-2 border-dashed border-slate-600 rounded-xl p-8 cursor-pointer hover:border-purple-400 hover:bg-slate-800/30 transition-all duration-300 group"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400 group-hover:text-purple-400 transition-colors" />
                  <p className="text-slate-200 mb-2 text-center">
                    Click to upload your audio track
                  </p>
                  <p className="text-sm text-slate-400 text-center">
                    MP3, WAV, or other audio formats
                  </p>
                  <div className="flex items-center justify-center mt-4 p-3 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-slate-300">
                        Limit to 20 seconds
                      </span>
                      <Switch
                        checked={limitAudioTo20Seconds}
                        onCheckedChange={setLimitAudioTo20Seconds}
                        className="data-[state=checked]:bg-purple-600"
                      />
                      <span className="text-xs text-slate-400">
                        {limitAudioTo20Seconds
                          ? "Enabled for demo"
                          : "Process full audio"}
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />

                {uploadedAudio && (
                  <div className="mt-6">
                    <p className="text-slate-300 mb-4">
                      Audio uploaded successfully!
                    </p>
                    <Button
                      onClick={handleProcessAudio}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-8 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                      disabled={isProcessingAudio}
                    >
                      {isProcessingAudio ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing Audio...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          Generate Final Video
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Step 7: Final Preview with Album Cover Overlay */}
          {showAnimation && (
            <Card className="p-8 border-slate-700/50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                  Final Preview
                </h2>
                <div className="relative rounded-xl overflow-hidden min-h-80 flex items-center justify-center">
                  {finalVideo ? (
                    <video
                      src={finalVideo}
                      autoPlay
                      loop
                      muted={false} // Don't mute final video with audio
                      className="w-full h-full object-cover rounded-xl"
                      controls
                    />
                  ) : processedVideo ? (
                    <video
                      src={processedVideo}
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover rounded-xl"
                      controls
                    />
                  ) : generatedVideo ? (
                    <video
                      src={generatedVideo}
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover rounded-xl"
                      controls
                    />
                  ) : generatedBackground ? (
                    <img
                      src={generatedBackground}
                      alt="Final composite with album cover and background"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 w-full h-full flex items-center justify-center">
                      {/* Enhanced animated background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20"></div>

                      <div className="relative z-10 p-4">
                        <img
                          src={uploadedImage || "/placeholder.svg"}
                          alt="Album cover overlay"
                          className="w-48 h-48 object-cover rounded-xl shadow-2xl border-2 border-white/30 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Video indicator */}
                  <div className="absolute top-0 right-0 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                    {finalVideo
                      ? "🎵 Final Video with Audio"
                      : processedVideo
                      ? "🎬 Enhanced AI Video"
                      : generatedVideo
                      ? "🎬 AI Generated Video"
                      : "🎬 Animated Video Preview"}
                  </div>

                  {/* Processing indicators */}
                  {isProcessingVideo && (
                    <div className="absolute top-4 left-4 bg-blue-900/70 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing with FFmpeg...
                    </div>
                  )}
                  {isProcessingAudio && (
                    <div className="absolute top-4 left-4 bg-purple-900/70 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Audio Track...
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Step 7: Download */}
          {showAnimation && (
            <Card className="p-8 border-slate-700/50">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">
                  Download Final Result
                </h2>
                <Button
                  onClick={handleDownload}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-8 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                >
                  <Download className="mr-2 h-5 w-5" />
                  {finalVideo
                    ? "Download Final Video"
                    : processedVideo
                    ? "Download Enhanced Video"
                    : generatedVideo
                    ? "Download Video"
                    : generatedBackground
                    ? "Download Image"
                    : "Download Final Video"}
                </Button>
                <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                  {finalVideo
                    ? "Downloads the complete video with audio track"
                    : processedVideo
                    ? "Downloads the enhanced video with crisp album cover overlay"
                    : generatedVideo
                    ? "Downloads the AI-generated video"
                    : generatedBackground
                    ? "Downloads the composite image"
                    : "Downloads a placeholder video file for now"}
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
