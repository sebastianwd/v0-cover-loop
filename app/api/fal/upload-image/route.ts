import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Configure Fal AI client
fal.config({
  credentials: process.env.FAL_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { imageData, mimeType } = await request.json();
    console.log("📤 Image upload request received");
    console.log("🖼️ Mime type:", mimeType);
    console.log("📏 Image data length:", imageData?.length || 0);

    if (!imageData || !mimeType) {
      console.log("❌ Missing image data or mime type");
      return NextResponse.json(
        { error: "Image data and mime type are required" },
        { status: 400 }
      );
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.log("❌ Fal AI API key not configured");
      return NextResponse.json(
        { error: "Fal AI API key not configured" },
        { status: 500 }
      );
    }
    console.log("🔑 Fal AI API key configured");

    // Convert base64 to blob and create File object
    console.log("🔄 Converting base64 to file...");
    const byteCharacters = atob(imageData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Create File object
    const fileName = `composite-${Date.now()}.png`;
    const file = new File([blob], fileName, {
      type: mimeType,
    });
    console.log("📁 File created:", fileName, "Size:", file.size, "bytes");

    // Upload to Fal AI storage
    console.log("☁️ Uploading to Fal AI storage...");
    const url = await fal.storage.upload(file);
    console.log("✅ Upload successful!");
    console.log("🔗 File URL:", url);

    return NextResponse.json({
      imageUrl: url,
    });
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    console.error("🔍 Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
