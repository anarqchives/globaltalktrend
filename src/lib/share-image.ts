import html2canvas from "html2canvas";
import qrcode from "qrcode-generator";

interface ShareImageData {
  title: string;
  platform: string;
  volume: string;
  change: string;
  changePositive: boolean;
  category?: string;
}

export async function generateShareImage(data: ShareImageData): Promise<Blob | null> {
  const { title, platform, volume, change, changePositive, category } = data;

  // Generate QR code
  const qr = qrcode(0, "M");
  qr.addData("https://globaltalk.lovable.app");
  qr.make();
  const qrDataUrl = qr.createDataURL(4, 0);

  // Create off-screen element
  const el = document.createElement("div");
  el.style.cssText = `
    width: 600px; padding: 40px; position: fixed; left: -9999px; top: 0;
    background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 100%);
    color: white; font-family: Inter, system-ui, sans-serif; border-radius: 24px;
  `;

  const platformColors: Record<string, string> = {
    YouTube: "#FF0000", Reddit: "#FF4500", "Google Trends": "#4285F4",
    NewsAPI: "#22C55E", Bluesky: "#0085FF", Mastodon: "#6364FF",
    NewsData: "#22C55E", GNews: "#22C55E", "Bing News": "#00809D",
    "The Guardian": "#052962", "World Bank": "#009FDA", IBGE: "#009c3b",
    OpenAlex: "#8B5CF6",
  };
  const pColor = platformColors[platform] || "#4285F4";

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <div style="width:40px;height:40px;border-radius:12px;background:${pColor}22;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:18px;color:${pColor};font-weight:700;">${platform.charAt(0)}</span>
      </div>
      <div>
        <span style="font-size:13px;font-weight:600;color:${pColor};">${platform}</span>
        ${category ? `<span style="font-size:11px;color:#94a3b8;margin-left:8px;">${category}</span>` : ""}
      </div>
    </div>
    <h2 style="font-size:22px;font-weight:700;line-height:1.3;margin:0 0 20px 0;color:#f1f5f9;">${title}</h2>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
      <span style="background:${pColor}22;color:${pColor};padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700;">${volume}</span>
      <span style="color:${changePositive ? "#22c55e" : "#ef4444"};font-size:14px;font-weight:600;">${change}</span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.1);padding-top:20px;">
      <div>
        <div style="font-size:16px;font-weight:700;color:#f1f5f9;">GlobalTalk</div>
        <div style="font-size:11px;color:#64748b;">globaltalk.lovable.app</div>
      </div>
      <img src="${qrDataUrl}" width="56" height="56" style="border-radius:8px;" />
    </div>
  `;

  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  } finally {
    document.body.removeChild(el);
  }
}

export async function downloadShareImage(data: ShareImageData) {
  const blob = await generateShareImage(data);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `globaltalk-${data.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyShareImage(data: ShareImageData): Promise<boolean> {
  const blob = await generateShareImage(data);
  if (!blob) return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    // Fallback: download
    downloadShareImage(data);
    return false;
  }
}
