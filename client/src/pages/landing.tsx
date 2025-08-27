import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Shield, Code, Zap, CheckCircle, ArrowRight, Github, Globe, Lock } from "lucide-react";
import * as THREE from "three";

export default function Landing() {
  const [, setLocation] = useLocation();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Create floating particles with varying sizes
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    const posArray = new Float32Array(particlesCount * 3);
    const sizeArray = new Float32Array(particlesCount);
    const velocityArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      // Position
      posArray[i * 3] = (Math.random() - 0.5) * 120;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 120;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 120;
      
      // Size variation
      sizeArray[i] = Math.random() * 2 + 0.5;
      
      // Velocity for smooth floating
      velocityArray[i * 3] = (Math.random() - 0.5) * 0.02;
      velocityArray[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocityArray[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 1.2,
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      vertexColors: false
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Create interconnected nodes network with glow effect
    const nodeGeometry = new THREE.SphereGeometry(0.15, 12, 12);
    const nodeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x10b981,
      transparent: true,
      opacity: 0.8
    });

    // Create glow material
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.3
    });

    const nodes: THREE.Mesh[] = [];
    const nodeGlows: THREE.Mesh[] = [];
    const nodeCount = 80;
    const nodeVelocities: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      // Main node
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      
      node.position.set(x, y, z);
      nodes.push(node);
      scene.add(node);
      
      // Glow effect
      const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(node.position);
      nodeGlows.push(glow);
      scene.add(glow);
      
      // Velocity for floating motion
      nodeVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ));
    }

    // Create dynamic connections between nodes
    const connectionMaterial = new THREE.LineBasicMaterial({ 
      color: 0x3b82f6, 
      transparent: true, 
      opacity: 0.4
    });

    const connections: { line: THREE.Line; nodeA: number; nodeB: number; opacity: number }[] = [];
    
    // Initial connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = nodes[i].position.distanceTo(nodes[j].position);
        if (distance < 12) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodes[i].position,
            nodes[j].position
          ]);
          const lineMaterial = connectionMaterial.clone();
          const line = new THREE.Line(geometry, lineMaterial);
          connections.push({ 
            line, 
            nodeA: i, 
            nodeB: j, 
            opacity: Math.random() * 0.5 + 0.2
          });
          scene.add(line);
        }
      }
    }
    
    // Add ambient lighting for better visuals
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    camera.position.z = 30;
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Smooth animation loop with time-based animations
    let time = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.005;

      // Smooth particle rotation and movement
      particlesMesh.rotation.x = Math.sin(time * 0.3) * 0.1;
      particlesMesh.rotation.y += 0.002;
      
      // Update particle positions for floating effect
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        positions[i3] += velocityArray[i3];
        positions[i3 + 1] += velocityArray[i3 + 1] + Math.sin(time + i * 0.1) * 0.005;
        positions[i3 + 2] += velocityArray[i3 + 2];
        
        // Boundary check and reset
        if (Math.abs(positions[i3]) > 60) velocityArray[i3] *= -1;
        if (Math.abs(positions[i3 + 1]) > 60) velocityArray[i3 + 1] *= -1;
        if (Math.abs(positions[i3 + 2]) > 60) velocityArray[i3 + 2] *= -1;
      }
      particlesGeometry.attributes.position.needsUpdate = true;

      // Animate nodes with smooth floating motion
      nodes.forEach((node, index) => {
        const velocity = nodeVelocities[index];
        node.position.add(velocity);
        
        // Add gentle oscillation
        node.position.y += Math.sin(time * 2 + index * 0.5) * 0.008;
        node.position.x += Math.cos(time * 1.5 + index * 0.3) * 0.005;
        
        // Rotate nodes smoothly
        node.rotation.x += 0.008;
        node.rotation.y += 0.012;
        
        // Update glow position
        nodeGlows[index].position.copy(node.position);
        nodeGlows[index].rotation.copy(node.rotation);
        
        // Pulsing glow effect
        const glowOpacity = 0.2 + Math.sin(time * 3 + index) * 0.1;
        (nodeGlows[index].material as THREE.MeshBasicMaterial).opacity = glowOpacity;
        
        // Boundary constraints with smooth bounce
        if (Math.abs(node.position.x) > 30) velocity.x *= -0.8;
        if (Math.abs(node.position.y) > 30) velocity.y *= -0.8;
        if (Math.abs(node.position.z) > 30) velocity.z *= -0.8;
      });

      // Update connections dynamically
      connections.forEach((connectionObj, index) => {
        const { line, nodeA, nodeB } = connectionObj;
        const nodeAPos = nodes[nodeA].position;
        const nodeBPos = nodes[nodeB].position;
        
        // Update line geometry
        const geometry = new THREE.BufferGeometry().setFromPoints([
          nodeAPos,
          nodeBPos
        ]);
        line.geometry.dispose();
        line.geometry = geometry;
        
        // Animate connection opacity
        const distance = nodeAPos.distanceTo(nodeBPos);
        const opacity = Math.max(0, (15 - distance) / 15) * (0.3 + Math.sin(time * 2 + index * 0.5) * 0.2);
        (line.material as THREE.LineBasicMaterial).opacity = opacity;
      });
      
      // Subtle camera movement
      camera.position.x = Math.sin(time * 0.1) * 2;
      camera.position.y = Math.cos(time * 0.15) * 1;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* WebGL Background */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 z-0"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Content Overlay */}
      <div className="relative z-10">
        {/* Enhanced Navigation */}
        <nav className="px-6 py-6 flex justify-between items-center backdrop-blur-md bg-black/20 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black text-white tracking-tight">SmartAudit AI</span>
              <div className="text-xs text-blue-300 font-medium">Security Platform</div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
            <a href="#docs" className="text-gray-300 hover:text-white transition-colors">Docs</a>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-emerald-400/50 text-emerald-300 bg-emerald-900/20 backdrop-blur-sm px-3 py-1 font-semibold">
              ✨ AI-Powered
            </Badge>
            <Button 
              onClick={() => setLocation("/auth")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold px-6 py-2 rounded-xl transition-all duration-300 hover:scale-105"
              data-testid="button-connect-wallet"
            >
              Launch App
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="px-6 py-32 text-center relative">
          {/* Floating elements for visual depth */}
          <div className="absolute top-32 left-10 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="absolute top-48 right-16 w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
          <div className="absolute bottom-40 left-20 w-5 h-5 bg-emerald-400 rounded-full animate-pulse"></div>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center mb-8">
              <Badge variant="outline" className="border-emerald-400/50 text-emerald-300 px-4 py-2 text-sm font-medium bg-emerald-900/20 backdrop-blur-sm">
                ✨ Powered by Advanced AI • Trusted by 10K+ Developers
              </Badge>
            </div>
            
            <h1 className="text-7xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tight">
              Audit Smart Contracts
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 animate-pulse">
                in Seconds
              </span>
            </h1>
            
            <p className="text-2xl text-gray-300 mb-16 max-w-4xl mx-auto leading-relaxed font-light">
              Revolutionary AI-powered security analysis that detects vulnerabilities, optimizes gas usage, 
              and ensures your smart contracts are bulletproof before deployment. 
              <span className="text-blue-400 font-medium">No more costly exploits.</span>
            </p>
            
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-center mb-12">
              <Button 
                size="lg" 
                onClick={() => setLocation("/auth")}
                className="group bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-xl px-12 py-8 h-auto rounded-2xl font-bold shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 border-2 border-blue-400/20"
                data-testid="button-start-auditing"
              >
                <Shield className="h-6 w-6 mr-3 group-hover:animate-pulse" />
                Start Free Audit Now
                <ArrowRight className="h-6 w-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <div className="text-center lg:text-left">
                <div className="text-sm text-gray-400 mb-2">✅ No signup required</div>
                <div className="text-sm text-gray-400">🚀 Get results in 30 seconds</div>
              </div>
            </div>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 text-lg px-8 py-4 h-auto rounded-xl font-semibold backdrop-blur-sm bg-black/20"
            >
              <Github className="h-5 w-5 mr-2" />
              View Documentation
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="px-6 py-24" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-6 bg-blue-500/20 text-blue-300 border-blue-400/30 px-4 py-2 text-sm font-semibold">
                🚀 Advanced Features
              </Badge>
              <h2 className="text-5xl font-black text-white mb-6">
                Built for the Future of Web3
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Experience the next generation of smart contract security with cutting-edge AI technology
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="group bg-gradient-to-br from-black/60 to-blue-900/20 border-blue-500/30 backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
                <CardHeader className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-2xl font-bold mb-4">AI-Powered Analysis</CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Revolutionary machine learning models trained on 100,000+ smart contracts, detecting vulnerabilities with superhuman accuracy.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group bg-gradient-to-br from-black/60 to-emerald-900/20 border-emerald-500/30 backdrop-blur-sm hover:border-emerald-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20">
                <CardHeader className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-2xl font-bold mb-4">Lightning Speed</CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Get comprehensive security analysis in under 30 seconds. No more waiting weeks for traditional audit firms.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group bg-gradient-to-br from-black/60 to-purple-900/20 border-purple-500/30 backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                <CardHeader className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Code className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-2xl font-bold mb-4">Universal Language Support</CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Seamlessly analyze contracts in Solidity, Vyper, Rust, Move, Cairo, and 15+ other blockchain languages.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group bg-gradient-to-br from-black/60 to-orange-900/20 border-orange-500/30 backdrop-blur-sm hover:border-orange-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20">
                <CardHeader className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-2xl font-bold mb-4">Multi-Chain Mastery</CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Native support for Ethereum, Polygon, Arbitrum, Solana, Avalanche, and 50+ blockchain networks.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group bg-gradient-to-br from-black/60 to-red-900/20 border-red-500/30 backdrop-blur-sm hover:border-red-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20">
                <CardHeader className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Lock className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-2xl font-bold mb-4">Fort Knox Security</CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Military-grade encryption, zero-knowledge architecture, and SOC2 compliance for ultimate protection.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="group bg-gradient-to-br from-black/60 to-cyan-900/20 border-cyan-500/30 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20">
                <CardHeader className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-2xl font-bold mb-4">Smart Audit Tracking</CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Advanced history tracking with AI-powered insights, version comparisons, and security trend analysis.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="px-6 py-24 border-t border-gray-800 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-purple-900/10"></div>
          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-16">
              <h3 className="text-4xl font-bold text-white mb-4">Trusted by Web3 Leaders</h3>
              <p className="text-xl text-gray-300">Join the revolution in smart contract security</p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-12">
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <div className="text-3xl font-black text-white">10K+</div>
                </div>
                <div className="text-gray-300 font-semibold text-lg">Contracts Secured</div>
                <div className="text-sm text-gray-500 mt-2">Zero successful exploits</div>
              </div>
              
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <div className="text-3xl font-black text-white">99.9%</div>
                </div>
                <div className="text-gray-300 font-semibold text-lg">Detection Rate</div>
                <div className="text-sm text-gray-500 mt-2">Industry-leading accuracy</div>
              </div>
              
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <div className="text-3xl font-black text-white">500+</div>
                </div>
                <div className="text-gray-300 font-semibold text-lg">Vulnerability Types</div>
                <div className="text-sm text-gray-500 mt-2">Comprehensive coverage</div>
              </div>
              
              <div className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <div className="text-2xl font-black text-white">24/7</div>
                </div>
                <div className="text-gray-300 font-semibold text-lg">AI Monitoring</div>
                <div className="text-sm text-gray-500 mt-2">Always protecting</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced CTA Section */}
        <div className="px-6 py-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-emerald-900/20"></div>
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="max-w-5xl mx-auto relative">
            <Badge className="mb-8 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 border-emerald-400/30 px-6 py-2 text-lg font-semibold">
              🚀 Launch Special: Free for First 1000 Users
            </Badge>
            
            <h2 className="text-6xl font-black text-white mb-8 leading-tight">
              Don't Let Bugs
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Cost You Millions</span>
            </h2>
            
            <p className="text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto">
              Every day, smart contract vulnerabilities cost the Web3 ecosystem millions. 
              <span className="text-white font-semibold">Be proactive, not reactive.</span> 
              Get enterprise-grade security analysis in seconds, not weeks.
            </p>
            
            <div className="flex flex-col lg:flex-row gap-8 justify-center items-center mb-16">
              <Button 
                size="lg"
                onClick={() => setLocation("/auth")}
                className="group bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 hover:from-emerald-700 hover:via-blue-700 hover:to-purple-700 text-2xl px-16 py-8 h-auto rounded-2xl font-black shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-110 border-2 border-emerald-400/30"
                data-testid="button-get-started"
              >
                <Shield className="h-8 w-8 mr-4 group-hover:animate-pulse" />
                Secure My Contracts Now
                <ArrowRight className="h-8 w-8 ml-4 group-hover:translate-x-2 transition-transform" />
              </Button>
              
              <div className="text-center">
                <div className="text-emerald-400 font-bold text-lg mb-2">⚡ Instant Analysis</div>
                <div className="text-gray-300">🔒 Bank-grade Security</div>
                <div className="text-gray-300">💰 Save Millions in Potential Losses</div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Setup in under 60 seconds
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Used by Fortune 500 companies
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="px-6 py-16 border-t border-gray-800 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">SmartAudit AI</span>
                </div>
                <p className="text-gray-400 leading-relaxed mb-6">
                  The world's most advanced AI-powered smart contract security platform, trusted by developers worldwide.
                </p>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                    <Github className="h-4 w-4 text-gray-300" />
                  </div>
                  <div className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                    <Globe className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-6">Platform</h4>
                <div className="space-y-3 text-gray-400">
                  <div className="hover:text-white cursor-pointer transition-colors">Features</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Pricing</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Security</div>
                  <div className="hover:text-white cursor-pointer transition-colors">API</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-6">Resources</h4>
                <div className="space-y-3 text-gray-400">
                  <div className="hover:text-white cursor-pointer transition-colors">Documentation</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Tutorials</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Blog</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Support</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-6">Company</h4>
                <div className="space-y-3 text-gray-400">
                  <div className="hover:text-white cursor-pointer transition-colors">About</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Careers</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Privacy</div>
                  <div className="hover:text-white cursor-pointer transition-colors">Terms</div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-400">
                © 2025 SmartAudit AI. All rights reserved.
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span>Powered by Advanced AI</span>
                <span>•</span>
                <span>Secured by Web3</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">99.9% Uptime</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}