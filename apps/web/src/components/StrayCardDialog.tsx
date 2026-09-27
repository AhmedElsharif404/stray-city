import { Download, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Place } from '@stray-city/shared';

import { categoryMeta } from '../lib/format';

export function StrayCardDialog({ place, onClose }: { place: Place; onClose: () => void }) {
  const [image, setImage] = useState('');

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context) return;
    const meta = categoryMeta[place.category];
    context.fillStyle = '#F8FAFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = meta.color;
    context.fillRect(0, 0, canvas.width, 34);
    context.fillStyle = '#18275C';
    context.font = '700 42px Inter, sans-serif';
    context.fillText('STRAY CITY  ✦  FOUND HERE', 72, 110);

    const imageElement = new Image();
    imageElement.crossOrigin = 'anonymous';
    imageElement.onload = () => {
      const scale = Math.max(936 / imageElement.width, 660 / imageElement.height);
      const width = imageElement.width * scale;
      const height = imageElement.height * scale;
      context.save();
      context.beginPath();
      context.roundRect(72, 160, 936, 660, 36);
      context.clip();
      context.drawImage(
        imageElement,
        72 + (936 - width) / 2,
        160 + (660 - height) / 2,
        width,
        height,
      );
      context.restore();
      context.fillStyle = meta.color;
      context.font = '700 32px Inter, sans-serif';
      context.fillText(`${meta.icon}  ${meta.label.toUpperCase()}`, 72, 900);
      context.fillStyle = '#18275C';
      context.font = '700 76px Georgia, serif';
      const words = place.name.split(' ');
      let line = '';
      let y = 995;
      for (const word of words) {
        const test = `${line}${word} `;
        if (context.measureText(test).width > 900 && line) {
          context.fillText(line.trim(), 72, y);
          line = `${word} `;
          y += 86;
        } else line = test;
      }
      context.fillText(line.trim(), 72, y);
      context.fillStyle = 'rgba(22,42,43,.62)';
      context.font = '500 30px Inter, sans-serif';
      context.fillText(`${place.neighborhood} · ${place.borough}`, 72, 1250);
      context.fillStyle = '#EF6658';
      context.beginPath();
      context.arc(957, 1218, 42, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#F8FAFF';
      context.font = '700 34px Inter, sans-serif';
      context.fillText('SC', 934, 1230);
      setImage(canvas.toDataURL('image/png'));
    };
    imageElement.onerror = () => {
      context.fillStyle = meta.color;
      context.fillRect(72, 160, 936, 660);
      context.fillStyle = '#F8FAFF';
      context.font = '700 160px Georgia, serif';
      context.fillText(meta.icon, 440, 550);
      setImage(canvas.toDataURL('image/png'));
    };
    imageElement.src = place.photos[0] ?? '';
  }, [place]);

  const share = async () => {
    const shareUrl = `${window.location.origin}/?place=${place.id}`;
    if (navigator.share) {
      await navigator.share({
        title: `Stray City — ${place.name}`,
        text: `I found ${place.name} on Stray City.`,
        url: shareUrl,
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card max-w-xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button absolute right-4 top-4" onClick={onClose} aria-label="Close">
          <X size={19} />
        </button>
        <p className="eyebrow">Share the find</p>
        <h2 className="mt-2 font-display text-3xl">Your Stray Card</h2>
        <div className="mt-5 overflow-hidden rounded-3xl border border-ink/10 bg-ink/5">
          {image ? (
            <img
              src={image}
              alt={`Share card for ${place.name}`}
              className="max-h-[55vh] w-full object-contain"
            />
          ) : (
            <div className="grid h-96 place-items-center text-sm text-ink/50">
              Making your card…
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            className={`button-secondary ${!image ? 'pointer-events-none opacity-50' : ''}`}
            href={image}
            download={`stray-city-${place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
          >
            <Download size={17} />
            Download
          </a>
          <button className="button-primary" onClick={() => void share()}>
            <Send size={17} />
            Share link
          </button>
        </div>
      </section>
    </div>
  );
}
