import { FC, useMemo, useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { removeStopwords, deu, eng, fra, spa } from 'stopword';
import { useChat } from '../../context/ChatContext';
import useResizeObserver from '../../hooks/useResizeObserver';
import { useTranslation } from 'react-i18next';
import '../../../i18n';

interface WordDatum {
  text: string;
  count: number;
  fontSize: number;
  x?: number;
  y?: number;
}

const rectsOverlap = (a: DOMRect, b: DOMRect): boolean => {
  return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
};

const WordCloud: FC = () => {
  const { filteredMessages, darkMode, metadata, useShortNames } = useChat();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dimensions = useResizeObserver(containerRef);

  const [selectedSender, setSelectedSender] = useState<string>('all');

  const senders = useMemo(() => Object.keys(metadata?.senders || {}), [metadata]);

  const messages = useMemo(() => {
    return filteredMessages.filter(
      (msg) => selectedSender === 'all' || msg.sender === selectedSender,
    );
  }, [filteredMessages, selectedSender]);

  const wordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    messages.forEach((msg) => {
      const words = msg.message
        .toLowerCase()
        .replace(/[^a-zA-ZäöüßÄÖÜ\s]/g, ' ')
        .split(/\s+/);
      let filtered: string[] = [];
      switch (metadata?.language) {
        case 'de':
          filtered = removeStopwords(words, deu);
          break;
        case 'en':
          filtered = removeStopwords(words, eng);
          break;
        case 'es':
          filtered = removeStopwords(words, spa);
          break;
        case 'fr':
          filtered = removeStopwords(words, fra);
          break;
        default:
          filtered = removeStopwords(words, eng);
      }
      filtered
        .filter((w) => w.length > 3)
        .forEach((w) => {
          counts[w] = (counts[w] || 0) + 1;
        });
    });
    return Object.entries(counts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }, [messages, metadata?.language]);

  useEffect(() => {
    if (!dimensions) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const width = dimensions.width;
    const height = dimensions.height;
    const maxCount = d3.max(wordCounts, (d) => d.count) || 1;
    const sizeScale = d3
      .scaleLinear()
      .domain([1, maxCount])
      .range([12, Math.min(60, height / 4)]);
    const words: WordDatum[] = wordCounts.map((d) => ({ ...d, fontSize: sizeScale(d.count) }));
    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height)
      .append('g');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const placed: DOMRect[] = [];
    const spiralStep = 4;
    const angleStep = 0.3;
    words.forEach((word) => {
      context.font = `${word.fontSize}px sans-serif`;
      const w = context.measureText(word.text).width;
      const h = word.fontSize;
      let angle = 0;
      let radius = 0;
      let placedPos: { x: number; y: number } | null = null;
      while (radius < Math.max(width, height)) {
        const x = width / 2 + radius * Math.cos(angle) - w / 2;
        const y = height / 2 + radius * Math.sin(angle) - h / 2;
        const rect = new DOMRect(x, y, w, h);
        if (!placed.some((p) => rectsOverlap(p, rect))) {
          placedPos = { x: x + w / 2, y: y + h };
          placed.push(rect);
          break;
        }
        angle += angleStep;
        radius += spiralStep * angleStep;
      }
      if (placedPos) {
        word.x = placedPos.x;
        word.y = placedPos.y;
      }
    });

    g.selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => d.fontSize)
      .attr('fill', darkMode ? 'white' : 'black')
      .attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${Math.random() < 0.3 ? 90 : 0})`)
      .text((d) => d.text);
  }, [wordCounts, dimensions, darkMode]);

  return (
    <div
      ref={containerRef}
      className={`border w-full md:min-w-[500px] md:basis-[500px] p-4 flex-grow ${darkMode ? 'border-gray-300 bg-gray-800 text-white' : 'border-black bg-white text-black'}`}
      style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    >
      <h2 className="text-sm md:text-lg font-semibold mb-3 md:mb-4">{t('WordCloud.title')}</h2>
      <div className="mb-2">
        <select
          value={selectedSender}
          onChange={(e) => setSelectedSender(e.target.value)}
          className={`border rounded-none px-2 py-1 ${darkMode ? 'bg-gray-800 text-white border-gray-300' : 'bg-white text-black border-black'}`}
        >
          <option value="all">{t('WordCloud.all')}</option>
          {senders.map((s) => (
            <option key={s} value={s}>
              {useShortNames && metadata?.sendersShort[s] ? metadata.sendersShort[s] : s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-grow flex justify-center items-center w-full h-full">
        {wordCounts.length === 0 ? (
          <span className="text-lg">{t('General.noDataAvailable')}</span>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default WordCloud;
