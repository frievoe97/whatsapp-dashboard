// AggregatePerTimePlot.test.tsx
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatContext } from './context/ChatContext';
import type { FilterOptions } from './types/chatTypes';
import { dummyMessage, dummyMetadata } from './test-data/messages';

import AggregatePerTimePlot from './components/plots/AggregatePerTime';
import SenderComparisonBarChart from './components/plots/BarChartComp';
import ChordDiagram from './components/plots/ChordDiagram';
import EmojiPlot from './components/plots/Emoji';
import Heatmap from './components/plots/Heatmap';
import SentimentAnalysis from './components/plots/Sentiment';
import SentimentWordsPlot from './components/plots/SentimentWord';
import Stats from './components/plots/Stats';
import Timeline from './components/plots/Timeline';
import WordCount from './components/plots/WordCount';

// Dummy-Kontextwert, der alle benötigten Felder bereitstellt
const dummyContextValue = {
  darkMode: false,
  toggleDarkMode: vi.fn(),
  originalMessages: dummyMessage,
  setOriginalMessages: vi.fn(),
  filteredMessages: dummyMessage,
  setFilteredMessages: vi.fn(),
  metadata: dummyMetadata,
  setMetadata: vi.fn(),
  appliedFilters: {} as FilterOptions,
  setAppliedFilters: vi.fn(),
  tempFilters: {} as FilterOptions,
  setTempFilters: vi.fn(),
  applyFilters: vi.fn(),
  resetFilters: vi.fn(),
  senderDropdownOpen: false,
  setSenderDropdownOpen: vi.fn(),
  isPanelOpen: true,
  setIsPanelOpen: vi.fn(),
  isInfoOpen: false,
  setIsInfoOpen: vi.fn(),
  useShortNames: false,
  toggleUseShortNames: vi.fn(),
  tempUseShortNames: false,
  tempToggleUseShortNames: vi.fn(),
  setUseShortNames: vi.fn(),
  tempSetUseShortNames: vi.fn(),
};

// AggregatePerTimePlot.tsx
describe('AggregatePerTimePlot', () => {
  it('sollte nach dem Laden (und kurzem Timeout) das SVG-Element rendern', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <AggregatePerTimePlot />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('svg#aggregate_plot');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// BarChartComp.tsx
describe('SenderComparisonBarChart', () => {
  it('should render the SVG element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <SenderComparisonBarChart />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('svg#bar-chart-plot');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// ChordDiagram.tsx
describe('ChordDiagram', () => {
  it('should render the SVG element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <ChordDiagram />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('svg#chord-diagram-plot');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// EmojiPlot.tsx
describe('EmojiPlot', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <EmojiPlot />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('div#emoji-plot');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// Heatmap.tsx
describe('Heatmap', () => {
  it('should render the SVG element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <Heatmap />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('svg#heatmap-plot');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// SentimentAnalysis.tsx
describe('SentimentAnalysis', () => {
  it('should render the SVG element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <SentimentAnalysis />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('svg#sentiment-plot');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// SentimentWordsPlot.tsx
describe('SentimentWordsPlot', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <SentimentWordsPlot />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('div#sender-sentiment-word-chart');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// Stats.tsx
describe('Stats', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <Stats />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('div#stats-card');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// Timeline.tsx
describe('Timeline', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <Timeline />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('svg#timeline_plot');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

// WordCount.tsx
describe('WordCount', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <WordCount />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const svgElement = container.querySelector('div#word-count-chart');
        expect(svgElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});
