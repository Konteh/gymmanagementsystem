"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QrPoster({ gymName, token }: { gymName: string; token: string }) {
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const next = `${window.location.origin}/g/${token}`;
    setUrl(next);
    void QRCode.toDataURL(next, {
      width: 640,
      margin: 1,
      color: { dark: "#172b4d", light: "#ffffff" },
    }).then(setImage);
  }, [token]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Check-in link copied");
    } catch {
      toast.error("Could not copy. Select the link yourself.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => void copyUrl()}>
          Copy link
        </Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Scan to check in</p>
          <h2 className="text-3xl font-semibold tracking-tight">{gymName}</h2>
          {image ? (
            <img
              src={image}
              alt={`QR code for ${gymName} check-in`}
              className="size-64 rounded-xl bg-white p-2 ring-1 ring-border sm:size-80"
            />
          ) : (
            <div className="size-64 animate-pulse rounded-xl bg-muted sm:size-80" />
          )}
          <p className="max-w-sm text-sm text-muted-foreground">
            Open the camera app, point at the code, then enter the phone number the desk saved for you.
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">{url}</p>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground print:hidden">
        Phones must reach this address. On your own Wi-Fi, open GymFlow with your computer’s LAN IP before
        printing so the QR uses that address instead of localhost.
      </p>
    </div>
  );
}
