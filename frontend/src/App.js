import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { Skeleton } from "./components/ui/skeleton";
import { Smartphone, Palette, Download, Sparkles, Grid3x3, Wand2 } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API = `${API_BASE}/api`;

const PhoneMockup = ({ imageUrl, phoneModel = "iPhone" }) => {
  if (phoneModel === "iPhone") {
    return (
      <div className="relative w-64 h-auto mx-auto">
        {/* iPhone Frame */}
        <div className="bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
          <div className="bg-black rounded-[2.5rem] p-1">
            <div className="relative rounded-[2rem] overflow-hidden bg-white aspect-[9/19.5]">
              {/* Dynamic Island */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10"></div>

              {/* Wallpaper */}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Generated wallpaper"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                  <Smartphone className="w-16 h-16 text-white/50" />
                </div>
              )}

              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white/80 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Samsung/Android mockup
  return (
    <div className="relative w-64 h-auto mx-auto">
      <div className="bg-gray-800 rounded-[2.5rem] p-2 shadow-2xl">
        <div className="bg-black rounded-[2rem] p-1">
          <div className="relative rounded-[1.5rem] overflow-hidden bg-white aspect-[9/19.5]">
            {/* Camera Hole */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black rounded-full z-10"></div>

            {/* Wallpaper */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Generated wallpaper"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
                <Smartphone className="w-16 h-16 text-white/50" />
              </div>
            )}

            {/* Navigation Bar */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <div className="w-1 h-6 bg-white/80 rounded"></div>
              <div className="w-6 h-6 border-2 border-white/80 rounded-full"></div>
              <div className="w-1 h-6 bg-white/80 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WallpaperCard = ({ wallpaper, onPreview }) => (
  <Card className="group cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={() => onPreview(wallpaper)}>
    <CardContent className="p-3">
      <div className="aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden mb-3">
        <img
          src={wallpaper.image_url}
          alt={wallpaper.prompt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{wallpaper.prompt}</p>
      <p className="text-xs text-gray-400 mt-1">
        {new Date(wallpaper.created_at).toLocaleDateString()}
      </p>
    </CardContent>
  </Card>
);

const Home = () => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [phoneModel, setPhoneModel] = useState("iPhone");
  const [generating, setGenerating] = useState(false);
  const [currentWallpaper, setCurrentWallpaper] = useState(null);
  const [wallpapers, setWallpapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const styleOptions = [
    "Minimalist",
    "Abstract",
    "Nature",
    "Geometric",
    "Gradient",
    "Cyberpunk",
    "Vintage",
    "Neon",
    "Watercolor",
    "Digital Art"
  ];

  const generateWallpaper = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/wallpapers/generate`, {
        prompt: prompt.trim(),
        style: style || undefined,
        aspect_ratio: "9:16",
        megapixels: "1"
      });

      if (response.data.success) {
        setCurrentWallpaper(response.data);
        await loadWallpapers(); // Refresh the gallery
      }
    } catch (error) {
      console.error("Error generating wallpaper:", error);
    }
    setGenerating(false);
  };

  const loadWallpapers = async () => {
    try {
      const response = await axios.get(`${API}/wallpapers`);
      setWallpapers(response.data || []);
    } catch (error) {
      console.error("Error loading wallpapers:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWallpapers();
  }, []);

  const downloadWallpaper = (wallpaper) => {
    const link = document.createElement('a');
    link.href = wallpaper.image_url;
    link.download = `wallpaper-${wallpaper.id}.jpg`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Wand2 className="w-8 h-8 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Wallpaper Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Create stunning phone wallpapers with AI</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Generator Section */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  Generate Wallpaper
                </CardTitle>
                <CardDescription>
                  Describe your perfect wallpaper and let AI create it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Describe your wallpaper</label>
                  <Textarea
                    placeholder="e.g., Sunset over mountains with purple sky"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Style (optional)</label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific style</SelectItem>
                      {styleOptions.map((option) => (
                        <SelectItem key={option} value={option.toLowerCase()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Phone Model Preview</label>
                  <Select value={phoneModel} onValueChange={setPhoneModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iPhone">iPhone</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateWallpaper}
                  disabled={generating || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Palette className="w-4 h-4 mr-2" />
                      Generate Wallpaper
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Smartphone className="w-5 h-5 mr-2 text-blue-600" />
                    Preview
                  </span>
                  {currentWallpaper && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadWallpaper(currentWallpaper)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <PhoneMockup
                  imageUrl={currentWallpaper?.image_url}
                  phoneModel={phoneModel}
                />

                {currentWallpaper && (
                  <div className="mt-4 text-center">
                    <Badge variant="secondary" className="mb-2">
                      Latest Generation
                    </Badge>
                    <p className="text-sm text-gray-600">{currentWallpaper.prompt}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gallery Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Grid3x3 className="w-5 h-5 mr-2 text-green-600" />
                  Gallery
                </CardTitle>
                <CardDescription>
                  Your generated wallpapers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded" />
                      ))}
                    </div>
                  ) : wallpapers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {wallpapers.map((wallpaper) => (
                        <WallpaperCard
                          key={wallpaper.id}
                          wallpaper={wallpaper}
                          onPreview={(w) => setCurrentWallpaper(w)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No wallpapers generated yet</p>
                      <p className="text-sm">Create your first one!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
