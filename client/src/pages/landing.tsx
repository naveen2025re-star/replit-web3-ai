import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Shield, Code, Upload, ArrowRight, Github, Globe, Lock, User, Clock, AlertTriangle, CheckCircle, Users, TrendingUp, Star } from "lucide-react";
import * as THREE from "three";

// Mock community data similar to the reference
const communityAudits = [
  {
    id: 1,
    title: "TokenVault Security Incident",
    type: "Attack",
    severity: "High",
    author: "SecurityExpert",
    date: "2025-01-15",
    findings: 14,
    tags: ["Logic", "Attack"]
  },
  {
    id: 2,
    title: "Pufferverse Security Scan",
    type: "Audit",
    severity: "High",
    author: "CryptoAuditor",
    date: "2025-01-14",
    findings: 12,
    tags: ["Bronze Alpha", "Replay Attack"]
  },
  {
    id: 3,
    title: "BankrollNetwork Security Incident", 
    type: "Attack",
    severity: "High",
    author: "Web3Security",
    date: "2025-01-13",
    findings: 10,
    tags: ["Attack"]
  },
  {
    id: 4,
    title: "Kinetic Vulnerability",
    type: "Vulnerability", 
    severity: "High",
    author: "SecurityDao",
    date: "2025-01-12",
    findings: 10,
    tags: ["Medium", "Codearena"]
  },
  {
    id: 5,
    title: "SiloFinance GeneralSwapModule Vuln",
    type: "Attack",
    severity: "High", 
    author: "DeFiWatch",
    date: "2025-01-11",
    findings: 8,
    tags: ["Attack", "Logic"]
  },
  {
    id: 6,
    title: "QA Marketplace Contract",
    type: "Audit",
    severity: "Medium",
    author: "ContractAI",
    date: "2025-01-10", 
    findings: 7,
    tags: ["Logic"]
  },
  {
    id: 7,
    title: "Eth Tx Order Dependence Minimal",
    type: "Vulnerability",
    severity: "High",
    author: "EthScan",
    date: "2025-01-09",
    findings: 7,
    tags: ["SWC"]
  },
  {
    id: 8,
    title: "SWC-120 Old Blockh ash Vulnerability",
    type: "Vulnerability", 
    severity: "Critical",
    author: "BlockSec",
    date: "2025-01-08",
    findings: 7,
    tags: ["SWC"]
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [contractInput, setContractInput] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  
  // Web3 terms to cycle through
  const web3Terms = ["DeFi", "Smart Contracts", "NFTs", "Tokens", "DAOs", "Web3", "Protocols", "dApps"];

  // Typewriter effect for Web3 terms
  useEffect(() => {
    const typeSpeed = 100;
    const deleteSpeed = 50;
    const pauseTime = 2000;

    const currentWord = web3Terms[currentWordIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          setDisplayText(currentWord.slice(0, displayText.length - 1));
        } else {
          // Move to next word
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % web3Terms.length);
        }
      }
    }, isDeleting ? deleteSpeed : typeSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentWordIndex, web3Terms]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Simplified WebGL background - subtle particles only
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Subtle floating particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 500;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 100;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.5,
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.3,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 30;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      particlesMesh.rotation.y += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 relative">
      {/* Subtle WebGL Background */}
      <div 
        ref={mountRef} 
        className="fixed inset-0 z-0 opacity-30"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl">SmartAudit AI</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <button onClick={() => setLocation("/app")} className="text-gray-300 hover:text-white transition-colors">Scans</button>
              <button onClick={() => setLocation("/community")} className="text-gray-300 hover:text-white transition-colors">Community</button>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Blog</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Documentation</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Users className="h-4 w-4" />
                <span>12.5K+ audits</span>
              </div>
            </div>
            <Button 
              onClick={() => setLocation("/auth")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            >
              Connect Wallet
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="px-6 py-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Defend Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 min-w-[200px] inline-block">
                {displayText}
                <span className="animate-pulse">|</span>
              </span>
            </h1>
            
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Total funds that could have been saved by AI Smart Contract Audits: 
              <span className="text-green-400 font-semibold"> $4,249,000</span>
            </p>
            
            {/* Main Input Section */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-black/40 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter your smart contract code, contract address or GitHub repository"
                      value={contractInput}
                      onChange={(e) => setContractInput(e.target.value)}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 text-lg py-6"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 px-6 py-6"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Code
                    </Button>
                    <Button
                      onClick={() => setLocation("/auth")}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6"
                      disabled={!contractInput.trim()}
                    >
                      Start Audit
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>All scans are secure, private and results.Only you can see your results.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Community Section */}
        <div className="px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">From the Community</h2>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <Badge variant="outline" className="border-blue-400 text-blue-300 bg-blue-900/20">Popular</Badge>
                <Badge variant="outline" className="border-gray-400 text-gray-300">Recent</Badge>
                <Badge variant="outline" className="border-purple-400 text-purple-300 bg-purple-900/20">Explore</Badge>
                <Badge variant="outline" className="border-orange-400 text-orange-300">OWASP</Badge>
                <Badge variant="outline" className="border-green-400 text-green-300">Bronze Alpha</Badge>
                <Badge variant="outline" className="border-red-400 text-red-300">Codearena</Badge>
                <Badge variant="outline" className="border-yellow-400 text-yellow-300">Attack</Badge>
                <Badge variant="outline" className="border-cyan-400 text-cyan-300">Logic</Badge>
              </div>
            </div>

            {/* Community Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {communityAudits.map((audit) => (
                <Card key={audit.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">{audit.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">{audit.date}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-white font-medium text-sm mb-3 line-clamp-2 leading-tight">
                      {audit.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-3">
                      {audit.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-2 py-1 border-gray-600 text-gray-300">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(audit.severity)}`}></div>
                        <span className={`text-sm font-medium ${getSeverityTextColor(audit.severity)}`}>
                          {audit.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">{audit.findings}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/community")}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                data-testid="button-view-community"
              >
                View All Public Scans
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="px-6 py-16 border-t border-gray-800">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">25,000+</div>
                <div className="text-gray-400 text-sm">Smart Contracts Audited</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">$4.2M+</div>
                <div className="text-gray-400 text-sm">Funds Protected</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400 mb-2">1,200+</div>
                <div className="text-gray-400 text-sm">Vulnerabilities Found</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-400 mb-2">98.5%</div>
                <div className="text-gray-400 text-sm">Accuracy Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-gray-800">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span>© 2025. SmartAudit AI is built by Security AI with ❤️</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Discord</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Telegram</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}