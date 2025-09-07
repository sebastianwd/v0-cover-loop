import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { toBlobURL } from "@ffmpeg/util";

export const createFFmpeg = async () => {
  console.log("Creating ffmpeg");

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

  const ffmpeg = new FFmpeg();

  ffmpeg.on("log", (message) => {
    console.log("FFmpeg log:", message);
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  console.log("Loaded ffmpeg");

  return ffmpeg;
};

export const overlayAlbumCoverOnVideo = async (
  videoUrl: string,
  albumCoverDataUrl: string,
  audioDataUrl?: string,
  limitAudioTo20Seconds: boolean = true
): Promise<string> => {
  console.log("🎬 Starting video overlay process...");

  const ffmpeg = await createFFmpeg();

  try {
    // Fetch video and album cover
    const videoData = await fetchFile(videoUrl);
    const albumCoverData = await fetchFile(albumCoverDataUrl);

    // Write files to FFmpeg filesystem
    await ffmpeg.writeFile("input_video.mp4", videoData);
    await ffmpeg.writeFile("album_cover.png", albumCoverData);

    if (audioDataUrl) {
      const audioData = await fetchFile(audioDataUrl);
      await ffmpeg.writeFile("input_audio.mp3", audioData);

      console.log(
        "📐 Processing with audio sync, album cover overlay, and fade transitions..."
      );

      await ffmpeg.exec([
        "-i",
        "input_video.mp4",
        "-i",
        "album_cover.png",
        "-filter_complex",
        // Add fade transitions based on known video duration (5.0625s from Fal AI: 81 frames / 16 fps)
        "[0:v]split=2[a][b];" +
          "[a]trim=0.1:5.0625,setpts=PTS-STARTPTS,fps=16[end];" +
          "[b]trim=0:0.1,setpts=PTS-STARTPTS,fps=16[begin];" +
          "[end][begin]xfade=transition=diagtl:duration=0.5:offset=4.4625[xfaded];" +
          "[1:v]scale=300:300:force_original_aspect_ratio=decrease[overlay];" +
          "[xfaded][overlay]overlay=(W-w)/2:(H-h)/2,format=yuv420p",
        "-t",
        "5.0625",
        "-c:a",
        "copy", // Copy audio without re-encoding
        "-y", // Overwrite output file
        "output_video_temp.mp4",
      ]);

      await ffmpeg.exec([
        "-stream_loop",
        "-1", // Loop video indefinitely
        "-i",
        "output_video_temp.mp4",
        "-i",
        "input_audio.mp3",
        "-shortest", // Stop when the shortest input (audio or video) ends
        ...(limitAudioTo20Seconds ? ["-t", "20"] : []), // Limit output to 20 seconds if enabled
        "-map",
        "0:v:0", // Map the first video stream from the first input (input.mp4)
        "-map",
        "1:a:0", // Map the first audio stream from the second input (input.mp3)
        "-y", // Overwrite output file without asking
        "output_video.mp4", // Output file name
      ]);
    } else {
      console.log(
        "📐 Processing video overlay with album cover and fade transitions..."
      );

      // Just overlay album cover without audio processing
      await ffmpeg.exec([
        "-i",
        "input_video.mp4",
        "-i",
        "album_cover.png",
        "-filter_complex",
        // Add fade transitions based on known video duration (5.0625s from Fal AI: 81 frames / 16 fps)
        "[0:v]split=2[a][b];" +
          "[a]trim=0.1:5.0625,setpts=PTS-STARTPTS,fps=16[end];" +
          "[b]trim=0:0.1,setpts=PTS-STARTPTS,fps=16[begin];" +
          "[end][begin]xfade=transition=diagtl:duration=0.5:offset=4.4625[xfaded];" +
          "[1:v]scale=300:300:force_original_aspect_ratio=decrease[overlay];" +
          "[xfaded][overlay]overlay=(W-w)/2:(H-h)/2,format=yuv420p",
        "-t",
        "5.0625",
        "-c:a",
        "copy", // Copy audio without re-encoding
        "-y", // Overwrite output file
        "output_video.mp4",
      ]);
    }

    console.log("📤 Reading processed video...");
    const outputData = await ffmpeg.readFile("output_video.mp4");

    // Create blob URL for the processed video
    const blob = new Blob([outputData], { type: "video/mp4" });
    const processedVideoUrl = URL.createObjectURL(blob);

    console.log(
      "✅ Video overlay with seamless fade transitions completed successfully!"
    );
    return processedVideoUrl;
  } catch (error) {
    console.error("❌ Error overlaying album cover:", error);
    throw error;
  }
};
