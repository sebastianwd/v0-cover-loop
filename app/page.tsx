"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, Download, Play } from "lucide-react"

export default function CoverLoopApp() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showBackground, setShowBackground] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        setShowBackground(false)
        setShowAnimation(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateBackground = () => {
    setShowBackground(true)
    setShowAnimation(false)
  }

  const handleAnimateBackground = () => {
    setShowAnimation(true)
  }

  const handleDownload = () => {
    // Placeholder download functionality
    const link = document.createElement("a")
    link.href = "/placeholder.mp4"
    link.download = "coverloop-animation.mp4"
    link.click()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="text-center py-16 px-4 bg-gradient-to-b from-slate-900 to-slate-950">
        <h1 className="text-5xl font-bold mb-4 text-balance bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          CoverLoop
        </h1>
        <p className="text-slate-300 text-xl text-balance max-w-2xl mx-auto leading-relaxed">
          Turn your album cover into a living visualizer.
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-16">
        <div className="space-y-8">
          {/* Step 1: Upload */}
          <Card className="p-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-6 text-slate-100">Upload Album Cover</h2>
              <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-12 cursor-pointer hover:border-blue-400 hover:bg-slate-800/30 transition-all duration-300 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-4 h-16 w-16 text-slate-400 group-hover:text-blue-400 transition-colors" />
                <p className="text-slate-200 mb-2 text-lg">Click to upload your album cover</p>
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
            <Card className="p-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">Album Cover Preview</h2>
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
            <Card className="p-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">Generate Background</h2>
                <Button
                  onClick={handleGenerateBackground}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                  disabled={showBackground}
                >
                  {showBackground ? "Background Generated ✓" : "Generate Background"}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 4: Background Preview */}
          {showBackground && (
            <Card className="p-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">Background Preview</h2>
                <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 rounded-xl p-12 min-h-64 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
                  <div className="text-white/90 text-xl font-medium">Generated Background Placeholder</div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 5: Animate Background */}
          {showBackground && (
            <Card className="p-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">Animate Background</h2>
                <Button
                  onClick={handleAnimateBackground}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
                  disabled={showAnimation}
                >
                  <Play className="mr-2 h-5 w-5" />
                  {showAnimation ? "Animation Active ✓" : "Animate Background"}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 6: Final Preview with Album Cover Overlay */}
          {showAnimation && (
            <Card className="p-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">Final Preview</h2>
                <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 rounded-xl overflow-hidden min-h-80 flex items-center justify-center">
                  {/* Enhanced animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20"></div>

                  {/* Album cover overlay */}
                  <div className="relative z-10 p-4">
                    <img
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Album cover overlay"
                      className="w-48 h-48 object-cover rounded-xl shadow-2xl border-2 border-white/30 backdrop-blur-sm"
                    />
                  </div>

                  {/* Video placeholder indicator */}
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                    🎬 Animated Video Preview
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 7: Download */}
          {showAnimation && (
            <Card className="p-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-6 text-slate-100">Download Final Video</h2>
                <Button
                  onClick={handleDownload}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-8 py-3 text-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Final Video
                </Button>
                <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                  Downloads a placeholder video file for now
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
