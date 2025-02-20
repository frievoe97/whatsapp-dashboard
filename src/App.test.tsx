//////////////////////////////
// AggregatePerTimePlot.test.tsx
//
// This file contains tests for various chart components used in the Chat Visualizer.
// Each test verifies that a specific component renders the expected SVG or DIV element
// after loading, using a dummy ChatContext for testing purposes.
//////////////////////////////

////////////////////// Imports ////////////////////////
import { render } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
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

////////////////////// Dummy Context ////////////////////////
// This dummy context provides all necessary fields for testing.
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

////////////////////// Test: AggregatePerTimePlot ////////////////////////
describe('AggregatePerTimePlot', () => {
  it('should render the SVG element after loading (and a short timeout)', async () => {
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

////////////////////// Test: SenderComparisonBarChart ////////////////////////
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

////////////////////// Test: ChordDiagram ////////////////////////
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

////////////////////// Test: EmojiPlot ////////////////////////
describe('EmojiPlot', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <EmojiPlot />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const divElement = container.querySelector('div#emoji-plot');
        expect(divElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

////////////////////// Test: Heatmap ////////////////////////
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

////////////////////// Test: SentimentAnalysis ////////////////////////
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

////////////////////// Test: SentimentWordsPlot ////////////////////////
describe('SentimentWordsPlot', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <SentimentWordsPlot />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const divElement = container.querySelector('div#sender-sentiment-word-chart');
        expect(divElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

////////////////////// Test: Stats ////////////////////////
describe('Stats', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <Stats />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const divElement = container.querySelector('div#stats-card');
        expect(divElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});

////////////////////// Test: Timeline ////////////////////////
describe('Timeline', () => {
  it('should render the SVG element after loading (and a short timeout)', async () => {
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

////////////////////// Test: WordCount ////////////////////////
describe('WordCount', () => {
  it('should render the DIV element after loading (and a short timeout)', async () => {
    const { container } = render(
      <ChatContext.Provider value={dummyContextValue}>
        <WordCount />
      </ChatContext.Provider>,
    );

    await waitFor(
      () => {
        const divElement = container.querySelector('div#word-count-chart');
        expect(divElement).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});
