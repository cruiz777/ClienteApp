import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

import { Gs1ParserService, Gs1Parsed } from 'src/app/services/gs1/gs1-parser.service';
import { isValidGtin, normalizeGtin } from 'src/app/util/gs1/gtin.util';

@Component({
  selector: 'app-gs1-scanner',
  templateUrl: './gs1-scanner.component.html',
  styleUrls: ['./gs1-scanner.component.css']
})
export class Gs1ScannerComponent implements OnDestroy {
  @ViewChild('video', { static: false }) video!: ElementRef<HTMLVideoElement>;
  @ViewChild('pasteTarget', { static: false }) pasteTarget!: ElementRef<HTMLDivElement>;

  private reader: BrowserMultiFormatReader;
  private imgReader: BrowserMultiFormatReader;
  private controls: IScannerControls | null = null;

  scanning = false;

  codigo = '';
  parsed: Gs1Parsed | null = null;

  gtinOk: boolean | null = null;
  gtinType: string | null = null;

  pastedImageUrl: string | null = null;
  pasteStatus: string | null = null;

  private lastText = '';

  constructor(private gs1: Gs1ParserService) {
    const hintsVideo = new Map();
    hintsVideo.set(DecodeHintType.TRY_HARDER, true);
    hintsVideo.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.QR_CODE
    ]);

    this.reader = new BrowserMultiFormatReader(hintsVideo, {
      delayBetweenScanAttempts: 80,
      delayBetweenScanSuccess: 200,
      tryPlayVideoTimeout: 8000
    });

    const hintsImg = new Map(hintsVideo);
    hintsImg.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX]);
    //hintsImg.set(DecodeHintType.PURE_BARCODE, true);
    hintsImg.set(DecodeHintType.ASSUME_GS1, true);

    this.imgReader = new BrowserMultiFormatReader(hintsImg, {
      delayBetweenScanAttempts: 80,
      delayBetweenScanSuccess: 200,
      tryPlayVideoTimeout: 8000
    });
  }

  async startCamera(): Promise<void> {
    if (this.scanning) return;

    this.scanning = true;
    this.lastText = '';
    this.pasteStatus = null;

    try {
      this.controls = await this.reader.decodeFromVideoDevice(
        undefined,
        this.video.nativeElement,
        (result) => {
          const text = result?.getText?.() ?? '';
          if (!text) return;

          if (text === this.lastText) return;
          this.lastText = text;

          this.codigo = text;
          this.process();
        }
      );
    } catch (e) {
      console.error('No se pudo iniciar cámara:', e);
      this.controls = null;
      this.scanning = false;
    }
  }

  stopCamera(): void {
    this.controls?.stop();
    this.controls = null;
    this.scanning = false;
  }

  process(): void {
    const raw = (this.codigo ?? '').trim();
    if (!raw) {
      this.parsed = null;
      this.gtinOk = null;
      this.gtinType = null;
      return;
    }

    this.parsed = this.gs1.parse(raw);

    const gtin = this.parsed?.fields?.gtin ?? '';
    const norm = normalizeGtin(gtin);

    this.gtinType = norm?.type ?? null;
    this.gtinOk = gtin ? isValidGtin(gtin) : null;
  }

  clear(): void {
    this.codigo = '';
    this.parsed = null;
    this.gtinOk = null;
    this.gtinType = null;
    this.lastText = '';

    this.pasteStatus = null;
    if (this.pastedImageUrl) URL.revokeObjectURL(this.pastedImageUrl);
    this.pastedImageUrl = null;
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.pastedImageUrl) URL.revokeObjectURL(this.pastedImageUrl);
  }

  focusPasteTarget(): void {
    this.pasteTarget?.nativeElement?.focus();
  }

  async onPasteTarget(ev: ClipboardEvent): Promise<void> {
    try {
      const cd = ev.clipboardData;
      if (!cd) return;

      const text = cd.getData('text/plain');
      if (text && text.trim().length > 0) {
        this.pasteStatus = 'Texto pegado. Procesando...';
        this.codigo = text.trim();
        this.process();
        return;
      }

      const items = Array.from(cd.items || []);
      const imgItem = items.find(i => i.type.startsWith('image/'));
      if (!imgItem) {
        this.pasteStatus = 'No se detectó una imagen en el portapapeles.';
        return;
      }

      ev.preventDefault();

      const file = imgItem.getAsFile();
      if (!file) return;

      await this.decodeImageFile(file);

    } catch (e) {
      console.error(e);
      this.pasteStatus = 'Error procesando el pegado.';
    }
  }

  async onFileSelected(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    await this.decodeImageFile(file);
    input.value = '';
  }

  private async decodeImageFile(file: File): Promise<void> {
    this.pasteStatus = 'Imagen recibida. Decodificando...';

    if (this.pastedImageUrl) URL.revokeObjectURL(this.pastedImageUrl);
    this.pastedImageUrl = URL.createObjectURL(file);

    try {
      const text = await this.tryDecodeImageSmart(this.pastedImageUrl);

      if (!text) {
        this.pasteStatus =
          'No se detectó el DataMatrix. Tip: copia con zoom (200%+) o usa una imagen más nítida.';
        return;
      }

      this.pasteStatus = 'Código detectado desde imagen. Procesando...';
      this.codigo = text.trim();
      this.process();

    } catch (e) {
      console.error(e);
      this.pasteStatus = 'Error decodificando la imagen. Tip: DataMatrix requiere imagen nítida.';
    }
  }

  private async tryDecodeImageSmart(url: string): Promise<string> {
    const img = await this.loadImage(url);
    const canvases = this.buildDecodeCanvases(img);

    const readerAny: any = this.imgReader as any;

    for (const c of canvases) {
      try {
        const res = await this.decodeFromCanvas(readerAny, c);
        const t = res?.getText?.() ?? '';
        if (t) return t;
      } catch {
        // continúa
      }
    }

    try {
      if (typeof readerAny.decodeFromImageUrl === 'function') {
        const res = await readerAny.decodeFromImageUrl(url);
        const t = res?.getText?.() ?? '';
        if (t) return t;
      }
    } catch {
      // nada
    }

    return '';
  }

  private buildDecodeCanvases(img: HTMLImageElement): HTMLCanvasElement[] {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const rects = [
      { x: 0,        y: 0,        w: w,        h: h },
      { x: w * 0.45, y: 0,        w: w * 0.55, h: h },
      { x: w * 0.55, y: h * 0.05, w: w * 0.45, h: h * 0.90 },
      { x: w * 0.62, y: h * 0.10, w: w * 0.38, h: h * 0.80 }
    ];

    const out: HTMLCanvasElement[] = [];

    for (const r of rects) {
      const base = this.drawCropToCanvas(img, r.x, r.y, r.w, r.h, 2000);
      out.push(base);
      out.push(this.binarizeCanvas(base));
    }

    return out;
  }

  private drawCropToCanvas(
    img: HTMLImageElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    minSize = 900
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const scale = Math.max(minSize / sw, minSize / sh, 1);

    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      img,
      Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh),
      0, 0, canvas.width, canvas.height
    );

    return canvas;
  }

  private binarizeCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
    const w = src.width;
    const h = src.height;

    const sctx = src.getContext('2d', { willReadFrequently: true })!;
    const imgData = sctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const hist = new Array(256).fill(0);
    const gray = new Uint8Array(w * h);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
      gray[j] = g;
      hist[g]++;
    }

    const thr = this.otsuThreshold(hist, w * h);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const v = gray[j] > thr ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;

    const octx = out.getContext('2d', { willReadFrequently: true })!;
    octx.putImageData(imgData, 0, 0);

    return out;
  }

  private otsuThreshold(hist: number[], total: number): number {
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let varMax = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;

      const wF = total - wB;
      if (wF === 0) break;

      sumB += t * hist[t];

      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const varBetween = wB * wF * (mB - mF) * (mB - mF);

      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }

    return threshold;
  }

  private async decodeFromCanvas(readerAny: any, canvas: HTMLCanvasElement): Promise<any> {
    if (typeof readerAny.decodeFromCanvas === 'function') {
      return await readerAny.decodeFromCanvas(canvas);
    }

    const dataUrl = canvas.toDataURL('image/png');

    if (typeof readerAny.decodeFromImageUrl === 'function') {
      return await readerAny.decodeFromImageUrl(dataUrl);
    }

    const img = await this.loadImage(dataUrl);

    if (typeof readerAny.decodeFromImageElement === 'function') {
      return await readerAny.decodeFromImageElement(img);
    }

    if (typeof readerAny.decodeFromImage === 'function') {
      return await readerAny.decodeFromImage(img);
    }

    throw new Error('Tu versión de @zxing/browser no soporta decode desde canvas.');
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
}
