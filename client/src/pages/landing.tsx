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
  const velocityArrayRef = useRef<Float32Array>();
  const sizeArrayRef = useRef<Float32Array>();

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Create beautiful floating particles with varied sizes and colors
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);
    const sizeArray = new Float32Array(particlesCount);
    const velocityArray = new Float32Array(particlesCount * 3);

    velocityArrayRef.current = velocityArray;
    sizeArrayRef.current = sizeArray;

    const colors = [
      new THREE.Color(0x3b82f6), // Blue
      new THREE.Color(0x06d6a0), // Green
      new THREE.Color(0x8b5cf6), // Purple
      new THREE.Color(0xf59e0b), // Amber
      new THREE.Color(0xef4444), // Red
    ];

    for (let i = 0; i < particlesCount; i++) {
      // Position
      posArray[i * 3] = (Math.random() - 0.5) * 120;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 120;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 120;
      
      // Velocity for floating motion
      velocityArray[i * 3] = (Math.random() - 0.5) * 0.02;
      velocityArray[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocityArray[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Random color from palette
      const color = colors[Math.floor(Math.random() * colors.length)];
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
      
      // Varied sizes
      sizeArray[i] = Math.random() * 3 + 0.5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Create dynamic neural network with pulsing nodes
    const nodeGeometry = new THREE.SphereGeometry(0.15, 12, 12);
    const nodes: Array<{mesh: THREE.Mesh, baseSize: number, pulsePhase: number}> = [];
    const nodeCount = 80;
    const maxConnectionDistance = 12;

    for (let i = 0; i < nodeCount; i++) {
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.8, 0.6),
        transparent: true,
        opacity: 0.8,
      });
      
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      const baseSize = 0.8 + Math.random() * 0.4;
      
      node.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
      
      node.scale.setScalar(baseSize);
      
      nodes.push({
        mesh: node,
        baseSize,
        pulsePhase: Math.random() * Math.PI * 2
      });
      
      scene.add(node);
    }

    // Create flowing connections with animated opacity
    const connections: Array<{line: THREE.Line, opacity: number, fadeDirection: number}> = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = nodes[i].mesh.position.distanceTo(nodes[j].mesh.position);
        if (distance < maxConnectionDistance) {
          const connectionMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.7, 0.5),
            transparent: true,
            opacity: 0.2 + (1 - distance / maxConnectionDistance) * 0.3
          });
          
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodes[i].mesh.position,
            nodes[j].mesh.position
          ]);
          
          const line = new THREE.Line(geometry, connectionMaterial);
          
          connections.push({
            line,
            opacity: Math.random(),
            fadeDirection: Math.random() > 0.5 ? 1 : -1
          });
          
          scene.add(line);
        }
      }
    }

    // Add ambient lighting for depth
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // Add dynamic point lights
    const lights: Array<{light: THREE.PointLight, angle: number, radius: number}> = [];
    const lightCount = 3;
    
    for (let i = 0; i < lightCount; i++) {
      const light = new THREE.PointLight(
        new THREE.Color().setHSL(i / lightCount, 0.8, 0.6),
        2,
        100
      );
      
      lights.push({
        light,
        angle: (i / lightCount) * Math.PI * 2,
        radius: 30
      });
      
      scene.add(light);
    }

    camera.position.z = 30;
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Enhanced animation loop with smooth transitions
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Fluid particle motion with wave patterns
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      const colors = particlesGeometry.attributes.color.array as Float32Array;
      const sizes = particlesGeometry.attributes.size.array as Float32Array;
      
      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        
        // Create wave motion
        positions[i3] += velocityArrayRef.current![i3];
        positions[i3 + 1] += velocityArrayRef.current![i3 + 1] + Math.sin(time + i * 0.1) * 0.005;
        positions[i3 + 2] += velocityArrayRef.current![i3 + 2];
        
        // Boundary wrapping
        if (Math.abs(positions[i3]) > 60) velocityArrayRef.current![i3] *= -1;
        if (Math.abs(positions[i3 + 1]) > 60) velocityArrayRef.current![i3 + 1] *= -1;
        if (Math.abs(positions[i3 + 2]) > 60) velocityArrayRef.current![i3 + 2] *= -1;
        
        // Pulsing size effect
        sizes[i] = (0.5 + Math.sin(time * 2 + i * 0.1) * 0.3) * sizeArrayRef.current![i];
        
        // Color shifting for magical effect
        const hue = (time * 0.1 + i * 0.01) % 1;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      }
      
      particlesGeometry.attributes.position.needsUpdate = true;
      particlesGeometry.attributes.color.needsUpdate = true;
      particlesGeometry.attributes.size.needsUpdate = true;

      // Smooth particle system rotation
      particlesMesh.rotation.x += 0.0005;
      particlesMesh.rotation.y += 0.0008;
      particlesMesh.rotation.z += 0.0003;

      // Organic node pulsing and floating
      nodes.forEach((nodeData, index) => {
        const { mesh, baseSize, pulsePhase } = nodeData;
        
        // Pulsing scale effect
        const pulse = 1 + Math.sin(time * 2 + pulsePhase) * 0.2;
        mesh.scale.setScalar(baseSize * pulse);
        
        // Gentle floating motion
        mesh.position.y += Math.sin(time + index * 0.3) * 0.008;
        mesh.position.x += Math.cos(time * 0.7 + index * 0.5) * 0.005;
        mesh.position.z += Math.sin(time * 0.5 + index * 0.7) * 0.006;
        
        // Subtle rotation
        mesh.rotation.x += 0.005;
        mesh.rotation.y += 0.008;
        mesh.rotation.z += 0.003;
        
        // Dynamic color shifting
        const hue = (0.6 + Math.sin(time * 0.5 + index * 0.1) * 0.2) % 1;
        (mesh.material as THREE.MeshBasicMaterial).color.setHSL(hue, 0.8, 0.6);
      });

      // Animate connection opacity for living network effect
      connections.forEach((connectionData) => {
        const { line, fadeDirection } = connectionData;
        const material = line.material as THREE.LineBasicMaterial;
        
        connectionData.opacity += fadeDirection * 0.01;
        
        if (connectionData.opacity > 0.6) {
          connectionData.fadeDirection = -1;
        } else if (connectionData.opacity < 0.1) {
          connectionData.fadeDirection = 1;
        }
        
        material.opacity = connectionData.opacity;
      });

      // Animated lighting system
      lights.forEach((lightData, index) => {
        const { light, radius } = lightData;
        
        lightData.angle += 0.003 * (index + 1);
        
        light.position.set(
          Math.cos(lightData.angle) * radius,
          Math.sin(lightData.angle * 0.7) * 20,
          Math.sin(lightData.angle) * radius
        );
        
        // Color cycling
        const hue = (time * 0.1 + index * 0.33) % 1;
        light.color.setHSL(hue, 0.8, 0.6);
      });

      // Smooth camera movement for dynamic perspective
      camera.position.x += (Math.sin(time * 0.1) * 5 - camera.position.x) * 0.02;
      camera.position.y += (Math.cos(time * 0.08) * 3 - camera.position.y) * 0.02;
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