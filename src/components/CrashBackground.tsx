import React, { useEffect, useRef } from 'react';

const CrashBackground: React.FC = () => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!backgroundRef.current) return;

    // Create clouds
    const cloudsContainer = document.createElement('div');
    cloudsContainer.className = 'clouds-container absolute inset-0 overflow-hidden';
    
    // Create 3 clouds with different animations
    for (let i = 0; i < 3; i++) {
      const cloud = document.createElement('div');
      cloud.className = `cloud absolute rounded-full bg-gray-400/30`;
      cloud.style.width = `${60 + i * 20}px`;
      cloud.style.height = `${20 + i * 10}px`;
      cloud.style.top = `${20 + i * 20}%`;
      cloud.style.left = `${-100}px`;
      cloud.style.animation = `moveCloud${i + 1} ${25 + i * 5}s linear infinite`;
      
      // Add cloud details
      const before = document.createElement('div');
      before.className = 'absolute rounded-full bg-gray-400/30';
      before.style.width = `${30 + i * 10}px`;
      before.style.height = `${20 + i * 5}px`;
      before.style.top = `${-10 - i * 5}px`;
      before.style.left = `${5 + i * 5}px`;
      
      const after = document.createElement('div');
      after.className = 'absolute rounded-full bg-gray-400/30';
      after.style.width = `${35 + i * 10}px`;
      after.style.height = `${15 + i * 5}px`;
      after.style.top = `${-5 - i * 3}px`;
      after.style.right = `${5 + i * 5}px`;
      
      cloud.appendChild(before);
      cloud.appendChild(after);
      cloudsContainer.appendChild(cloud);
    }
    
    backgroundRef.current.appendChild(cloudsContainer);

    // Add styles to document head
    const style = document.createElement('style');
    style.textContent = `
      @keyframes moveCloud1 {
        from { left: -100px; }
        to { left: 110%; }
      }
      
      @keyframes moveCloud2 {
        from { left: -150px; }
        to { left: 110%; }
      }
      
      @keyframes moveCloud3 {
        from { left: -120px; }
        to { left: 110%; }
      }
      
      .clouds-bg {
        background: linear-gradient(180deg, #1a1a2e 0%, #2d2d5e 50%, #3d3d7e 100%);
      }
      
      .space-bg {
        background: linear-gradient(180deg, #0a0a1e 0%, #1a1a3e 50%, #2a2a5e 100%);
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      
      .space-bg.active {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(style);
    
    // Cleanup
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div 
      ref={backgroundRef}
      className="absolute inset-0 overflow-hidden"
    >
      <div className="clouds-bg absolute inset-0"></div>
      <div className="space-bg absolute inset-0" id="spaceBackground"></div>
    </div>
  );
};

export default CrashBackground;