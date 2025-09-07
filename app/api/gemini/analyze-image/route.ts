import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const { imageData, mimeType } = await request.json();

    if (!imageData || !mimeType) {
      return NextResponse.json(
        { error: "Image data and mime type are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: imageData,
          },
        },
        {
          text: "Describe this image in a way that you extract its overall style, theme, vibe, color palette. This with the objective of creating a cool background for a music visualizer, which means i want to post on youtube the album cover at the center with an added background that relates to it but also can serve as an animated visualizer. it shouldn't include the subject itself or the main element since the album cover already has those details and we want the background to serve more like a visualizer. Respond only a direct description and keep it safe for work.",
        },
      ],
    });

    const candidate = response.text;
    if (!candidate) {
      return NextResponse.json(
        { error: "No text response from Gemini" },
        { status: 500 }
      );
    }

    console.log("📝 Generated description:", candidate);

    // Now generate the background image using the description
    console.log("🎨 Generating background image...");
    const imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: candidate,
    });

    console.log("🎨 Image response:", imageResponse);

    const imageCandidate = imageResponse.candidates?.[0];
    if (!imageCandidate?.content?.parts) {
      return NextResponse.json(
        { error: "No image response from Gemini" },
        { status: 500 }
      );
    }

    for (const part of imageCandidate.content.parts) {
      if (part.text) {
        console.log("text", part.text);
      } else if (part.inlineData) {
        console.log("✅ Background image generated successfully");
        return NextResponse.json({
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
          description: candidate,
        });
      }
    }

    return NextResponse.json(
      { error: "No valid image content found in response" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
