import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, PieChart, Activity, Video, Camera, Brain, Shield, ChevronRight, Github } from 'lucide-react';
import FeatureCard from '../../Shared/FeatureCard/FeatureCard';

const FEATURES = [
  {
    icon: <Video className="w-7 h-7 md:w-8 md:h-8" />,
    title: "Video Emotion Analytics",
    description: "Analyze viewer reactions to your video ads with facial emotion recognition powered by Hugging Face models."
  },
  {
    icon: <BarChart3 className="w-7 h-7 md:w-8 md:h-8" />,
    title: "Emotional Heatmaps",
    description: "Visualize emotional responses linked to specific video segments and identify which moments resonate most."
  },
  {
    icon: <PieChart className="w-7 h-7 md:w-8 md:h-8" />,
    title: "Engagement Metrics",
    description: "Move beyond views and clicks with advanced audience engagement analysis across seven emotion classes."
  },
  {
    icon: <Activity className="w-7 h-7 md:w-8 md:h-8" />,
    title: "Interactive Dashboard",
    description: "Access actionable insights through a role-based dashboard with per-video and per-viewer breakdowns."
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: <Camera className="w-10 h-10 text-blue-400" />,
    title: "Viewers Watch & Record",
    description: "Viewers watch ads with their webcam on. Recordings are stored securely on Azure Blob Storage."
  },
  {
    step: 2,
    icon: <Brain className="w-10 h-10 text-purple-400" />,
    title: "AI Emotion Analysis",
    description: "A daily batch pipeline downloads recordings, extracts frames, detects faces, and analyzes emotions via Hugging Face inference."
  },
  {
    step: 3,
    icon: <BarChart3 className="w-10 h-10 text-green-400" />,
    title: "Aggregate & Visualize",
    description: "Per-video and per-viewer emotion distributions are computed and surfaced through the analytics dashboard."
  },
  {
    step: 4,
    icon: <Shield className="w-10 h-10 text-amber-400" />,
    title: "Privacy-First Design",
    description: "Only tight face crops leave the server; raw video stays on Azure. Viewer identities are hidden by default."
  },
];

const TECH_STACK = [
  { name: "React 18 + Vite", desc: "Frontend framework with Tailwind CSS and Flowbite" },
  { name: "Django 5 + DRF", desc: "Backend API with Firebase authentication" },
  { name: "PostgreSQL", desc: "Primary database for videos, users, and analytics" },
  { name: "Firebase Auth", desc: "Identity management and token verification" },
  { name: "Azure Blob Storage", desc: "Secure video and recording storage" },
  { name: "Hugging Face", desc: "Serverless facial emotion recognition inference" },
  { name: "MediaPipe + OpenCV", desc: "Face detection and frame extraction pipeline" },
  { name: "Render", desc: "Free-tier deployment with daily cron scheduling" },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gray-900 relative overflow-hidden">
      <div className="absolute top-10 -left-40 w-96 h-96 bg-blue-700 opacity-20 rounded-full filter blur-3xl" />
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-600 opacity-10 rounded-full filter blur-3xl" />

      <div className="max-w-5xl w-full z-10 px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-6">
            <BarChart3 size={32} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            About <span className="text-blue-400">EngageAnalytics</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Video emotion analytics platform for ad effectiveness — understanding how viewers truly react to your content.
          </p>
        </div>

        {/* What is EngageAnalytics */}
        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white text-center">What is EngageAnalytics?</h2>
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 max-w-4xl mx-auto">
            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              EngageAnalytics is a video emotion analytics platform that helps content creators and marketers
              understand how viewers emotionally respond to their video ads. By combining webcam recordings with
              AI-powered facial emotion recognition, the platform provides per-video and per-viewer emotional
              breakdowns.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              Originally developed as "h3cker" for the Learnathon by Geeky Solutions, the platform is built
              with a modern stack: a React + Vite frontend, Django REST Framework backend, PostgreSQL database,
              Firebase authentication, and Azure Blob Storage for video hosting.
            </p>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="bg-gray-800 bg-opacity-50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                  {item.step}
                </div>
                <div className="mb-3 mt-2">{item.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">Technology Stack</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TECH_STACK.map((tech) => (
                <div key={tech.name} className="flex items-start gap-3 bg-gray-800 bg-opacity-30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full shrink-0" />
                  <div>
                    <span className="text-white font-medium">{tech.name}</span>
                    <p className="text-gray-400 text-sm mt-0.5">{tech.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Ready to get started?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Sign up to analyze viewer emotions in your video ads and unlock deeper audience insights.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-full shadow-lg transition-all duration-300 flex items-center"
              type="button"
            >
              Get Started <ChevronRight className="ml-2 w-5 h-5" />
            </button>
            <a
              href="https://github.com/Learnathon-By-Geeky-Solutions/h3cker"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-full border border-gray-700 transition-all duration-300 flex items-center"
            >
              <Github className="mr-2 w-5 h-5" /> View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
