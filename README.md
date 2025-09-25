# SF Pool Schedule Calendar

A living calendar showing family swim hours across San Francisco public pools. Features automated quarterly updates via GitHub Actions and OpenAI Vision API.

## ✨ Features

- **📅 Google Calendar-style weekly view** with 30-minute time slots
- **🎨 Color-coded pools** with overlapping session support
- **🤖 Automated quarterly updates** via GitHub Actions + Playwright
- **🔍 AI-powered schedule extraction** from SF Parks .pub files
- **⚡ Fast static data loading** with caching
- **📱 Responsive design** for mobile and desktop

## 🚀 Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd sf-pool-schedule

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the calendar.

## 🤖 Automated Schedule Updates

This project uses **GitHub Actions** to automatically extract pool schedules from SF Parks .pub files every quarter (January, April, July, October).

### Setup GitHub Secrets

To enable automated updates, add this secret to your GitHub repository:

Go to **Settings > Secrets and Variables > Actions** and add:

- `OPENAI_API_KEY`: Your OpenAI API key for Vision API
  - Get from: https://platform.openai.com/api-keys
  - Requires access to `gpt-4-vision-preview` model

### Manual Trigger

You can trigger schedule updates manually via the Actions tab.

## 🏊‍♀️ Pool Data

Current pools tracked:

- **Balboa Pool** - Red
- **Rossi Pool** - Teal  
- **Hamilton Pool** - Blue
- **Garfield Pool** - Green
- **Mission Pool** - Yellow
- **Sava Pool** - Pink
- **Coffman Pool** - Light Green
- **King Pool** - Orange

## 🎯 Key Benefits

- **Zero ongoing costs** (GitHub Actions free tier sufficient)
- **No server infrastructure** required
- **Automatic updates** every quarter
- **Fast loading** with static data
- **Reliable** browser automation with Playwright

## 📊 Perfect for Your Use Case

- **10 pools × 4 times/year = 40 total automations**
- **Completely free** with GitHub Actions
- **Static data approach** ideal for quarterly updates
- **Public deployment ready**

