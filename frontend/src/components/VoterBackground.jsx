"use client"

export default function VoterBackground({ children, className = "" }) {
  return (
    <div className={`min-h-screen relative ${className}`}>
      {/* Main gradient background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #5D9FFF 0%, #B3D1F0 100%)'
        }}
      />
      
      {/* College logo background patterns - matching your reference design */}
      <div className="fixed inset-0 z-0 overflow-hidden opacity-8">
        {/* bg1 logo - Large bottom left */}
        <div 
          className="absolute w-[600px] h-[600px] opacity-35"
          style={{
            bottom: '5%',
            left: '5%',
            backgroundImage: 'url(/bg1.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
          }}
        />
        
        {/* bg2 logo - Large upper right */}
        <div 
          className="absolute w-[550px] h-[550px] opacity-30"
          style={{
            top: '5%',
            right: '5%',
            backgroundImage: 'url(/bg2.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
          }}
        />
        
        {/* Additional smaller logos for depth */}
        <div 
          className="absolute w-72 h-72 opacity-15 transform rotate-15"
          style={{
            top: '60%',
            right: '30%',
            backgroundImage: 'url(/bg1.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
          }}
        />
        
        <div 
          className="absolute w-64 h-64 opacity-20 transform -rotate-20"
          style={{
            bottom: '40%',
            right: '10%',
            backgroundImage: 'url(/bg2.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
          }}
        />
        
        {/* Mobile responsive - adjusted for smaller screens */}
        <div className="md:hidden">
          {/* Mobile bg1 - bottom left smaller */}
          <div 
            className="absolute w-48 h-48 opacity-25"
            style={{
              bottom: '10%',
              left: '5%',
              backgroundImage: 'url(/bg1.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          />
          
          {/* Mobile bg2 - top right smaller */}
          <div 
            className="absolute w-40 h-40 opacity-20"
            style={{
              top: '10%',
              right: '5%',
              backgroundImage: 'url(/bg2.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          />
        </div>
      </div>
      
      {/* Subtle overlay for better text readability */}
      <div className="fixed inset-0 z-0 bg-black bg-opacity-10" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}