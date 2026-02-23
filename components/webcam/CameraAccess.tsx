import { useEffect, useRef, type ReactNode } from "react";

function CenterCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl w-full">
        <h2 className="text-xl font-semibold mb-6 text-center">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function CameraAccess({ onGranted }: { onGranted: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => alert("Camera access is required"));
  }, []);

  return (
    <CenterCard title="Camera Permission">
      <video ref={videoRef} autoPlay className="rounded-lg mb-4" />
      <p className="text-sm text-gray-600 mb-4">
        We need camera access to analyze reading behavior.
      </p>
      <button className="btn-primary" onClick={onGranted}>
        Start Calibration
      </button>
    </CenterCard>
  );
}
