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
    mountRef.current.appendChild(renderer.domElement);

    // Create floating particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 100;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.8,
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.8,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Create interconnected nodes network
    const nodeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x06d6a0,
      transparent: true,
      opacity: 0.9
    });

    const nodes: THREE.Mesh[] = [];
    const nodeCount = 50;

    for (let i = 0; i < nodeCount; i++) {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      );
      nodes.push(node);
      scene.add(node);
    }

    // Create connections between nodes
    const connectionMaterial = new THREE.LineBasicMaterial({ 
      color: 0x3b82f6, 
      transparent: true, 
      opacity: 0.3 
    });

    const connections: THREE.Line[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].position.distanceTo(nodes[j].position) < 8) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodes[i].position,
            nodes[j].position
          ]);
          const line = new THREE.Line(geometry, connectionMaterial);
          connections.push(line);
          scene.add(line);
        }
      }
    }

    camera.position.z = 30;
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // Rotate particles
      particlesMesh.rotation.x += 0.001;
      particlesMesh.rotation.y += 0.002;

      // Animate nodes
      nodes.forEach((node, index) => {
        node.rotation.x += 0.01;
        node.rotation.y += 0.02;
        node.position.y += Math.sin(Date.now() * 0.001 + index) * 0.01;
      });

      // Update connections
      connections.forEach((connection, index) => {
        const nodeA = nodes[Math.floor(index / 2)];
        const nodeB = nodes[Math.floor(index / 2) + 1];
        if (nodeA && nodeB) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodeA.position,
            nodeB.position
          ]);
          connection.geometry.dispose();
          connection.geometry = geometry;
        }
      });

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
        {/* Navigation */}
        <nav className="px-6 py-4 flex justify-between items-center backdrop-blur-sm bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SmartAudit AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-blue-400/50 text-blue-300">
              Web3 Security Platform
            </Badge>
            <Button 
              onClick={() => setLocation("/auth")}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-connect-wallet"
            >
              Connect Wallet
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="outline" className="border-green-400/50 text-green-300 mb-6">
              🛡️ AI-Powered Security Auditing
            </Badge>
            
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Smart Contracts</span> with AI
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Professional-grade security auditing powered by advanced AI. Detect vulnerabilities, 
              optimize gas usage, and ensure your smart contracts meet industry standards before deployment.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => setLocation("/auth")}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8 py-6 h-auto"
                data-testid="button-start-auditing"
              >
                <Shield className="h-5 w-5 mr-2" />
                Start Auditing
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 py-6 h-auto"
              >
                <Github className="h-5 w-5 mr-2" />
                View on GitHub
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Why Choose SmartAudit AI?
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-blue-400" />
                  </div>
                  <CardTitle className="text-white">AI-Powered Analysis</CardTitle>
                  <CardDescription className="text-gray-400">
                    Advanced machine learning models trained on thousands of smart contracts to identify security vulnerabilities.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-green-400" />
                  </div>
                  <CardTitle className="text-white">Real-time Results</CardTitle>
                  <CardDescription className="text-gray-400">
                    Get instant feedback with streaming analysis results and comprehensive security reports.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Code className="h-6 w-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-white">Multi-Language Support</CardTitle>
                  <CardDescription className="text-gray-400">
                    Support for Solidity, Vyper, Rust, Move, Cairo, and other smart contract languages.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Globe className="h-6 w-6 text-orange-400" />
                  </div>
                  <CardTitle className="text-white">Cross-Chain Compatible</CardTitle>
                  <CardDescription className="text-gray-400">
                    Audit contracts across Ethereum, Polygon, Arbitrum, Optimism, and other EVM chains.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-red-400" />
                  </div>
                  <CardTitle className="text-white">Enterprise Security</CardTitle>
                  <CardDescription className="text-gray-400">
                    Bank-grade security with encrypted data transmission and zero data retention policy.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-cyan-400" />
                  </div>
                  <CardTitle className="text-white">Audit History</CardTitle>
                  <CardDescription className="text-gray-400">
                    Track all your audits with detailed history and comparison tools for contract iterations.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="px-6 py-20 border-t border-gray-800">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">10K+</div>
                <div className="text-gray-400">Contracts Audited</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-400 mb-2">99.9%</div>
                <div className="text-gray-400">Accuracy Rate</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-400 mb-2">500+</div>
                <div className="text-gray-400">Vulnerability Types</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-orange-400 mb-2">24/7</div>
                <div className="text-gray-400">AI Monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-6 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Secure Your Smart Contracts?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of developers who trust SmartAudit AI to secure their Web3 applications.
            </p>
            <Button 
              size="lg"
              onClick={() => setLocation("/auth")}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-lg px-12 py-6 h-auto"
              data-testid="button-get-started"
            >
              <Shield className="h-5 w-5 mr-2" />
              Get Started Free
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-gray-800">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                <Shield className="h-3 w-3 text-white" />
              </div>
              <span className="text-gray-400">© 2025 SmartAudit AI</span>
            </div>
            <div className="text-gray-400 text-sm">
              Powered by AI • Secured by Web3
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}