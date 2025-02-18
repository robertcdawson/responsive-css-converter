# Responsive CSS Converter

A modern web application that helps developers convert fixed CSS units (like pixels) into responsive units (rem, em, %, vw, vh). This tool streamlines the process of modernizing web designs by making them more adaptable to different screen sizes and user preferences.

## Features

- Convert pixel values to various responsive units (rem, em, %, vw, vh)
- Real-time preview of converted CSS
- Customizable base pixel size
- Adjustable precision for converted values
- Syntax highlighting for CSS code
- Copy to clipboard functionality
- Error detection and reporting

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd responsive-css-converter
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Usage

1. Enter or paste your CSS code in the input editor
2. Configure your conversion settings:
   - Base Pixel Size (default: 16px)
   - Target Unit (rem, em, %, vw, vh)
   - Precision (number of decimal places)
3. Click "Convert" to transform your CSS
4. Copy the converted code using the "Copy to Clipboard" button

## Built With

- React
- TypeScript
- Vite
- Tailwind CSS
- CodeMirror

## License

This project is licensed under the MIT License - see the LICENSE file for details.
