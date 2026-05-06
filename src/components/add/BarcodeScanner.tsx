"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onError?: (error: any) => void;
}

export default function BarcodeScanner({ onResult, onError }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    // Wrapper function to prevent double initialization in React StrictMode
    const startScanning = () => {
      if (!document.getElementById("reader")) return;

      scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      );

      const onScanSuccess = (decodedText: string) => {
        if (isScanning) {
          setIsScanning(false);
          if (scanner) {
            scanner.clear();
          }
          onResult(decodedText);
        }
      };

      const onScanFailure = (error: any) => {
        if (onError) onError(error);
      };

      scanner.render(onScanSuccess, onScanFailure);
    };

    // Minor timeout helps with React 18 strict mode unmount/remount
    const timeoutId = setTimeout(startScanning, 100);

    return () => {
      clearTimeout(timeoutId);
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [onResult, onError, isScanning]);

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden shadow-inner">
      <div id="reader" className="w-full min-h-[250px]"></div>
    </div>
  );
}