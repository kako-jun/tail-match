#!/usr/bin/env node

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const pdfPath = 'data/html/kagawa/kagawa-pref-cats/20251115_114911_tail.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

async function extractPDFText() {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) });
  const pdf = await loadingTask.promise;

  console.log('='.repeat(60));
  console.log('PDF情報:');
  console.log('='.repeat(60));
  console.log('ページ数:', pdf.numPages);

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  console.log('テキスト長:', fullText.length);
  console.log('');
  console.log('最初の3000文字:');
  console.log('='.repeat(60));
  console.log(fullText.substring(0, 3000));
  console.log('='.repeat(60));
}

extractPDFText().catch(console.error);
