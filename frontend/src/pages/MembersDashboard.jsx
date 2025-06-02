import React from "react";
import { Button } from "@/components/ui/button";
import { Apple, Play, Smartphone } from "lucide-react";

function MembersDashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Smartphone className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Enhance Your Experience
            </h1>
            <p className="text-gray-600 max-w-md">
              Get the full features of our platform by downloading our mobile
              app!
            </p>
          </div>

          {/* App Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { name: "Real-time Notifications", emoji: "🔔" },
              { name: "Easy Payments", emoji: "💳" },
              { name: "Member Directory", emoji: "👥" },
              { name: "Event Management", emoji: "📅" },
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <span className="text-2xl mb-2 block">{feature.emoji}</span>
                <p className="font-medium text-gray-800">{feature.name}</p>
              </div>
            ))}
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="bg-black hover:bg-gray-800 text-white h-14 px-6">
              <div className="flex items-center gap-3">
                <Apple className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-xs">Download on the</p>
                  <p className="text-lg font-semibold -mt-1">App Store</p>
                </div>
              </div>
            </Button>

            <Button className="bg-[#4285F4] hover:bg-[#3367D6] text-white h-14 px-6">
              <div className="flex items-center gap-3">
                <Play className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-xs">Get it on</p>
                  <p className="text-lg font-semibold -mt-1">Google Play</p>
                </div>
              </div>
            </Button>
          </div>

          {/* QR Code Option */}
          <div className="mt-8 border-t pt-6">
            <p className="text-gray-500 mb-3">Or scan the QR code</p>
            <div className="bg-white p-3 rounded-lg border inline-block">
              {/* Simple SVG QR code */}
              <svg
                width="128"
                height="128"
                viewBox="0 0 128 128"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-32 h-32"
              >
                <rect width="128" height="128" fill="#fff" />
                {/* Corners */}
                <rect x="8" y="8" width="28" height="28" fill="#111827" />
                <rect x="92" y="8" width="28" height="28" fill="#111827" />
                <rect x="8" y="92" width="28" height="28" fill="#111827" />
                {/* Inner squares */}
                <rect x="20" y="20" width="8" height="8" fill="#fff" />
                <rect x="104" y="20" width="8" height="8" fill="#fff" />
                <rect x="20" y="104" width="8" height="8" fill="#fff" />
                {/* Random blocks */}
                <rect x="48" y="8" width="8" height="8" fill="#111827" />
                <rect x="64" y="24" width="8" height="8" fill="#111827" />
                <rect x="80" y="8" width="8" height="8" fill="#111827" />
                <rect x="48" y="48" width="8" height="8" fill="#111827" />
                <rect x="64" y="64" width="8" height="8" fill="#111827" />
                <rect x="80" y="80" width="8" height="8" fill="#111827" />
                <rect x="24" y="64" width="8" height="8" fill="#111827" />
                <rect x="104" y="64" width="8" height="8" fill="#111827" />
                <rect x="64" y="104" width="8" height="8" fill="#111827" />
                <rect x="80" y="104" width="8" height="8" fill="#111827" />
                <rect x="104" y="104" width="8" height="8" fill="#111827" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MembersDashboard;
