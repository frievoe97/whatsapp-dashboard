<!-- Dark Mode GIF -->
<!-- <p align="center"><img src="https://github.com/user-attachments/assets/e2b92304-8d8f-449a-98e3-925e0ce4a1cc#gh-dark-mode-only" width="500"></p> -->

<!-- Light Mode GIF -->
<!-- <p align="center"><img src="https://github.com/user-attachments/assets/0aceb04f-1748-468f-aa07-cfa27ce6814f#gh-light-mode-only" width="500"></p> -->

# WhatsApp Dashboard

![React](https://img.shields.io/badge/react-18.3.1-blue)
![D3.js](https://img.shields.io/badge/d3-7.9.0-orange)
![TypeScript](https://img.shields.io/badge/typescript-5.5.3-blue)
![Vite](https://img.shields.io/badge/vite-5.4.8-purple)
![ESLint](https://img.shields.io/badge/eslint-9.11.1-yellow)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-3.4.13-cyan)
![whatsapp-chat-parser](https://img.shields.io/badge/whatsapp--chat--parser-4.0.2-green)
![stopword](https://img.shields.io/badge/stopword-3.1.1-blue)
![sentiment](https://img.shields.io/badge/sentiment-5.0.2-yellow)
![emoji-regex](https://img.shields.io/badge/emoji--regex-10.4.0-purple)
![franc-min](https://img.shields.io/badge/franc--min-6.2.0-orange)
![lucide-react](https://img.shields.io/badge/lucide--react-0.474.0-cyan)
![License](https://img.shields.io/badge/license-MIT-yellow)

<!-- Dark Mode Bild -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/b513738d-fdcf-4ffb-afbc-33cfcef338a2#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/66e2af2c-d577-4052-afee-5405a8dbfe0b#gh-light-mode-only" width="500">
</p>

## Overview

**WhatsApp Dashboard** is a powerful, interactive web application built with React that lets you analyze and visualize your WhatsApp chat data in an intuitive and engaging way. Explore messaging patterns, sender statistics, sentiment trends, emoji usage, and more with ease. Plus, all data processing happens locally in your browser, ensuring your privacy and security.

## Live Demo

Experience it live: [WhatsApp Dashboard](https://whatsapp-dashboard.friedrichvoelkers.de/)

## Features

- **Interactive Visualizations:** Dive into detailed data representations including messaging activity, sentiment trends, and more.
- **Multi-language Support:** Available in German, English, French, and Spanish.
- **Local Data Processing:** Your data never leaves your browser. Privacy guaranteed!
- **Responsive Design:** Enjoy a seamless experience on both mobile and desktop devices.
- **Easy File Upload:** Simply upload an exported WhatsApp `.txt` file to get started.

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone the repository:

```
git clone https://github.com/frievoe97/whatsapp-dashboard.git
cd whatsapp-dashboard
```

2. Install dependencies:

```
npm install
```

3. Run the development server:

```
npm run dev
```

Open your browser and navigate to [http://localhost:5173](http://localhost:5173) to view the app.

### Building for Production

To build and run in host mode:

```
npm run dev -- --host
```

### Testing

We use [Vitest](https://vitest.dev/) for testing. Tests ensure that plots render correctly and that file uploads and filtering work as expected. Tests run on every push, so you can be confident everything is working smoothly.

> **Note:** Before pushing your changes, please run:

```
npx prettier --write .
```

to format the code according to our guidelines.

## Plot Creation Guidelines

When creating a new plot, please consider the following:

- **Container Setup:**

  - Use a main container with `ref={containerRef}` to monitor size changes using `useResizeObserver(containerRef)`.
  - Set a minimum and maximum height with overflow hidden, for example:
    ```
    style={{ minHeight: '350px', maxHeight: '550px', overflow: 'hidden' }}
    ```
  - Use responsive width classes (e.g., `w-full md:min-w-[500px] md:basis-[500px]`) to ensure proper display on mobile and desktop.

- **Data Source:**

  - The plot should utilize data from `filteredMessages` (stored in the global context) that holds the messages currently being displayed.

- **Dark Mode Support:**
  - Use the `darkMode` variable from the global context to adjust styles accordingly for dark or light themes.

## Available Plots and Their Functionality

Below is an overview of the different plots available in the WhatsApp Dashboard, along with a description of their functionality. For each plot, you can preview the appearance in both Dark Mode and Light Mode.

---

### 1. Aggregated Message Trends (AggregatePerTime)

**Location:** `src/components/plots/AggregatePerTime.tsx`  
**Description:**  
This plot displays the aggregated number of messages by hour, weekday, and month. It allows you to view data for each participant individually or as a combined total of all chat members. Additionally, you can toggle between absolute values and relative percentages.

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/8b1b87b5-ed9c-4363-bedb-e3077a91b389#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/c9a7c88d-de21-481c-a196-a38405d1f418#gh-light-mode-only" width="500">
</p>

---

### 2. Message Timeline (Timeline)

**Location:** `src/components/plots/Timeline.tsx`  
**Description:**  
This plot shows the number of messages over time. It allows you to choose whether to display values on a yearly or monthly basis. Data can be viewed for individual participants or as an aggregate for all members, and the values can be displayed as absolute numbers or percentages.

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/4d90f4f8-f072-40df-9d3b-8b1d3e43e475#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/cba4ddef-a22e-4c11-8e7c-2059087645ae#gh-light-mode-only" width="500">
</p>

---

### 3. Participant Statistics Bar Chart (BarChartComp)

**Location:** `src/components/plots/BarChartComp.tsx`  
**Description:**  
This bar chart presents various statistics for each participant. The available metrics include:

- Number of Messages
- Average Words per Message
- Median Words per Message
- Total Words Sent
- Maximum Words in a Message
- Active Days
- Unique Words Count
- Average Characters per Message

Users can select the metric to display via a dropdown in the plot's title.

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/7890453e-f40b-4e5c-aa78-9ed72edb0c1c#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/df805b95-92ae-4e4d-96b8-03da82132512#gh-light-mode-only" width="500">
</p>

---

### 4. Top Emoji Usage (Emoji)

**Location:** `src/components/plots/Emoji.tsx`  
**Description:**  
This plot displays the top 10 most frequently used emojis across all chat participants.

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/a21e4ada-fc43-4d38-9447-c9ca82bbdae2#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/4911da7a-397a-4aba-ba69-aa5353ad4c20#gh-light-mode-only" width="500">
</p>

---

### 5. Reply Network Diagram (ChordDiagram)

**Location:** `src/components/plots/ChordDiagram.tsx`  
**Description:**  
This diagram visualizes interactions between participants by showing who replies to whom and how often. A single click on a name filters the view to that individual, while a double-click resets the view to include all participants.

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/d9779aa6-74a2-476e-b542-bb809a00cfd0#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/da10b198-05ab-4d3b-8786-b9b678577bfe#gh-light-mode-only" width="500">
</p>

---

### 6. Common Word Usage (WordCount)

**Location:** `src/components/plots/WordCount.tsx`  
**Description:**  
This plot displays the top 10 most frequently used words for each participant, excluding common stopwords (using the [stopwords npm package](https://www.npmjs.com/package/stopwords)). It supports analyses in German, French, Spanish, and English (defaulting to English if the language is not identified).

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/0d123895-1245-4f1a-a87b-a59e528baa52#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/51a41615-6ea3-4240-a259-c063ca4321a4#gh-light-mode-only" width="500">
</p>

---

### 7. Detailed Participant Stats (Stats)

**Location:** `src/components/plots/Stats.tsx`  
**Description:**  
This plot provides a comprehensive overview of various statistics for each participant, including:

- Number of Messages
- Average Words per Message
- Median Words per Message
- Total Words Sent
- Maximum Words in a Message
- Active Days
- Unique Words Count
- Average Characters per Message

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/e65a704f-9d30-4791-bb3b-eb942e3e3af1#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/5affc43d-fbcf-48b3-9566-15998c2e45fa#gh-light-mode-only" width="500">
</p>

---

### 8. Chat Sentiment Analysis (Sentiment)

**Location:** `src/components/plots/Sentiment.tsx`  
**Description:**  
This line chart visualizes the overall sentiment of the chat. It allows you to switch between a single aggregated sentiment line (combining positive and negative) and two separate lines for positive and negative sentiments. The chart shows a moving average, where the window is calculated as the number of days divided by 50. It supports German, French, English, and Spanish (defaulting to English) using AFINN and the [sentiment npm package](https://www.npmjs.com/package/sentiment).

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/f8144a10-b072-437d-a156-f5d4cb0a9b15#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/d5a27931-08fa-43cd-9588-ad55b17f9505#gh-light-mode-only" width="500">
</p>

---

### 9. Sentiment Word Insights (SentimentWord)

**Location:** `src/components/plots/SentimentWord.tsx`  
**Description:**  
For each participant, this plot displays the top 10 "friendliest" and "least friendly" words based on sentiment analysis. It uses AFINN and the [sentiment npm package](https://www.npmjs.com/package/sentiment) and supports German, French, English, and Spanish (defaulting to English). A dropdown in the plot's title lets you toggle between the two lists.

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/fe8d2c26-669e-4771-b425-0d3f6a32e740#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/8ce9cc90-2304-48a9-88cf-2739ec89fa56#gh-light-mode-only" width="500">
</p>

---

### 10. Message Density Heatmap (HeatmapMonthWeekday)

**Location:** `src/components/plots/HeatmapMonthWeekday.tsx`  
**Description:**  
This heatmap compares the total number of messages across all participants. You can select different dimensions for both axes (choosing from 'Year', 'Month', 'Weekday', 'Hour', or 'Day') to customize the view.

<!-- Dark Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/613c92e7-37b3-4346-8971-2d336593dcc5#gh-dark-mode-only" width="500">
</p>

<!-- Light Mode Image -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/cf574bf7-1523-4276-87cb-1d22c7e726c4#gh-light-mode-only" width="500">
</p>

## Message Filtering Options

The WhatsApp Dashboard offers a comprehensive set of filters that allow you to refine the messages used in the analysis. Use these filters to focus on specific time periods, participants, and more, ensuring that the visualizations reflect the data most relevant to you.

- **Start Date and End Date:**  
  Specify the time period for the messages to be included in the analysis.

- **Use Abbreviations / Use Full Names:**  
  Toggle between displaying abbreviated names or full names. This is particularly useful in group chats with many participants, helping to keep the visualizations clear.

- **Select Weekdays:**  
  Choose which weekdays to include in the analysis, allowing you to observe trends on specific days.

- **Select Senders:**  
  Choose which participants' messages should be included. The list shows both full names and their abbreviations (in parentheses), making it easier to identify each sender.

- **Message Share (%):**  
  Set a threshold (default is 3%) indicating the minimum percentage of total messages a sender must contribute to be included in the analysis. Note that senders falling below this threshold cannot be manually reactivated via the "Select Senders" option.

Additionally, there are two buttons to control these filters:

- **Apply:**  
  The filters are only applied when you press the "Apply" button.
- **Reset:**  
  The "Reset" button clears the current filter selections. After resetting, you must press "Apply" again for the changes to take effect.

## Contributing

This is my first proper open-source project, and I’m excited to see it evolve! Contributions, feedback, and feature requests are all welcome. Here's how you can contribute:

1. **Fork the Repository:** Click the "Fork" button on GitHub.
2. **Create a Feature Branch:** Follow the naming convention `feature/<your-feature-name>`.
3. **Make Your Changes:** Commit with clear and concise messages.
4. **Open a Pull Request:** Submit your PR and adhere to the contribution guidelines.

All changes are automatically tested and built via our CI workflows. Only merged PRs are pushed to master to maintain a stable codebase.

## Acknowledgments

Special thanks to [Pustur](https://github.com/Pustur) for the [whatsapp-chat-parser](https://www.npmjs.com/package/whatsapp-chat-parser) npm package, which made parsing WhatsApp chats much easier! 🙏

## Workflows

- **Testing:** Automated tests run on every push.
- **Building:** Build workflows are triggered after each merged PR.
- **Branch Policy:** Direct pushes to master are restricted; use feature branches and PRs.

## Repo Activity

![Alt](https://repobeats.axiom.co/api/embed/9a02c54f5c7700208516e9afb7c9609fc568c1c3.svg "Repobeats analytics image")

## License

This project is licensed under the [MIT License](LICENSE.txt).
