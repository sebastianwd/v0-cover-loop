import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Configure Fal AI client
fal.config({
  credentials: process.env.FAL_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    console.log("🎬 Video generation request received");
    console.log("📸 Image URL:", imageUrl);

    if (!imageUrl) {
      console.log("❌ No image URL provided");
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Default prompt for music visualizer animation
    const prompt =
      "The album cover rests static at the center, steady and commanding. The background slowly comes alive, pulsing like waves of sound, creating a sense of rhythm and atmosphere. The camera subtly breathes with the scene, moving closer or slightly circling, while the album cover itself doesn't make any movements. The animation flows in a seamless cycle, with the ending aligning perfectly with the beginning, creating a hypnotic, infinite loop that feels natural and continuous, like music made visible. Avoid any dramatic flare-ups, sudden shifts in brightness, or noticeable repeating patterns that would disrupt continuous playback. The goal is a calming, subtly animated visual perfect for a continuously looping screensaver.";
    console.log("📝 Using prompt:", prompt);

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.log("❌ Fal AI API key not configured");
      return NextResponse.json(
        { error: "Fal AI API key not configured" },
        { status: 500 }
      );
    }
    console.log("🔑 Fal AI API key configured");

    // Submit the video generation request
    console.log("🚀 Starting Fal AI video generation...");
    console.log("⚙️ Parameters:", {
      prompt: prompt.substring(0, 50) + "...",
      image_url: imageUrl,
      resolution: "720p",
      aspect_ratio: "16:9",
      sync_mode: true,
    });

    const result = await fal.subscribe("fal-ai/wan-i2v", {
      input: {
        prompt,
        negative_prompt:
          "bright colors, overexposed, static, blurred details, subtitles, style, artwork, painting, picture, still, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, malformed limbs, fused fingers, still picture, cluttered background, three legs, many people in the background, walking backwards",
        image_url: imageUrl,
        num_frames: 81,
        frames_per_second: 16,
        resolution: "480p",
        aspect_ratio: "16:9",
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log("📊 Queue update:", update.status);
        if (update.status === "IN_PROGRESS") {
          console.log("⏳ Processing...");
          update.logs
            .map((log) => log.message)
            .forEach((msg) => console.log("📋 Log:", msg));
        }
      },
    });

    console.log("✅ Fal AI result received");
    console.log("📊 Result data:", result.data);
    console.log("🆔 Request ID:", result.requestId);

    if (!result.data?.video?.url) {
      console.log("❌ No video URL in response");
      console.log("🔍 Full result:", JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: "No video URL in response" },
        { status: 500 }
      );
    }

    console.log("🎥 Video URL generated:", result.data.video.url);
    console.log("✨ Video generation completed successfully");

    return NextResponse.json({
      videoUrl: result.data.video.url,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error("Error generating video:", error);
    return NextResponse.json(
      { error: "Failed to generate video" },
      { status: 500 }
    );
  }
}
