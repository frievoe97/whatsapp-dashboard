# WhatsApp Dashboard

A React application that visually represents WhatsApp chats. Upload your `.txt` chat files and explore interactive plots—all processed locally without any data being uploaded to external servers.

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Local Processing**: All data is processed locally in your browser. No data is sent to any server.
- **File Upload**: Easily upload `.txt` files exported from WhatsApp chats.
- **Interactive Visualizations**:
  - **Timeline**: View message counts over time.
  - **Heatmap**: Analyze message activity across different days and months.
  - **Message Ratio**: Understand the distribution of messages among participants.
  - **Word Count**: Explore the most frequently used words by each sender.
  - **Emoji Usage**: Discover the top emojis used by each participant.
  - **Statistics**: Gain insights into various message metrics per sender.
- **Dark Mode**: Toggle between light and dark themes for a comfortable viewing experience.
- **Responsive Design**: Optimized for various screen sizes and devices.

## Demo

<div align="center">
  <img width="600" alt="screenshot_01" src="https://github.com/user-attachments/assets/845c072e-4c38-4f49-83ca-c2ed3500f32a">
</div>
<div align="center">
  <img width="600" alt="screenshot_02" src="https://github.com/user-attachments/assets/ebba500d-2382-4959-ad46-a64ebeeae931">
</div>
<div align="center">
  <img width="600" alt="screenshot_03" src="https://github.com/user-attachments/assets/b2cce540-0757-4bd5-a57c-bbf396120496">
</div>
<div align="center">
  <img width="600" alt="screenshot_04" src="https://github.com/user-attachments/assets/d25dac69-886f-4edb-ad3a-73bc5fe1a189">
</div>




## Installation

1. **Clone the Repository**

```bash
git clone git@github.com:frievoe97/whatsapp-dashboard.git
cd whatsapp-dashboard
```

2. **Install Dependencies**

Ensure you have [Node.js](https://nodejs.org/) installed. Then, install the required dependencies:

```bash
npm install
```

3. **Run the Development Server**

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173` to view the application.

4. **Build for Production**

To build the application for production:

```bash
npm run build
```

The optimized build will be available in the `dist` folder.

## Usage

1. **Upload a WhatsApp Chat File**

   - Click on the "Select File" button.
   - Choose a `.txt` file exported from WhatsApp.

2. **Explore the Dashboard**

   - **Filters**: Use the filter options to select specific senders, date ranges, and weekdays.
   - **Visualizations**: Navigate through different plots to analyze your chat data.
   - **Dark Mode**: Toggle between light and dark themes using the switch provided.

3. **Reset or Delete Data**

   - Use the "Reset" button to clear filters.
   - Click on "Delete File" to remove the uploaded chat and start fresh.

## Project Structure

```plaintext
whatsapp-dashboard/
├── node_modules/
├── public/
├── src/
│   ├── components/
│   │   ├── AggregatePerTime.tsx
│   │   ├── Emoji.tsx
│   │   ├── FileUpload.tsx
│   │   ├── Heatmap.tsx
│   │   ├── MessageRatio.tsx
│   │   ├── Stats.tsx
│   │   ├── Timeline.tsx
│   │   └── WordCount.tsx
│   ├── context/
│   │   └── ChatContext.tsx
│   ├── hooks/
│   │   └── useResizeObserver.ts
│   ├── workers/
│   │   └── fileParser.worker.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Technologies Used

- **React**: Frontend library for building user interfaces.
- **TypeScript**: Superset of JavaScript for type safety.
- **Vite**: Fast frontend build tool.
- **D3.js**: Powerful library for creating dynamic and interactive data visualizations.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **React Context**: State management for handling chat data and theme settings.
- **Web Workers**: Background thread for parsing large chat files without blocking the UI.
- **Additional Libraries**:
  - `react-datepicker`
  - `react-spinners`
  - `react-switch`
  - `stopword`
  - `emoji-regex`

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**

2. **Create a Feature Branch**

```bash
git checkout -b feature/YourFeature
```

3. **Commit Your Changes**

```bash
git commit -m "Add some feature"
```

4. **Push to the Branch**

```bash
git push origin feature/YourFeature
```

5. **Open a Pull Request**

## License

This project is licensed under the [MIT License](LICENSE).
