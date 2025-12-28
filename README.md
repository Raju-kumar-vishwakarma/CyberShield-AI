# 🛡️ CyberShield AI

**AI-Powered Cybersecurity Platform** - Real-time threat detection, phishing analysis, and comprehensive security monitoring.

## 📋 About

CyberShield AI is an advanced cybersecurity platform that leverages artificial intelligence to provide comprehensive protection against modern cyber threats. Built with cutting-edge technologies, it offers real-time threat detection, phishing email analysis, dark web monitoring, and security analytics in a unified dashboard.

### Key Features

- **🎯 AI Phishing Detection** - Advanced machine learning algorithms to detect phishing emails, malicious URLs, and suspicious content
- **🔍 Web Scanner** - Deep analysis of websites for security vulnerabilities, SSL certificates, and threat indicators
- **📧 Email Breach Checker** - Verify if email addresses have been compromised in known data breaches
- **🌐 DNS Security** - Real-time DNS security checks and domain reputation analysis
- **🕵️ Dark Web Monitoring** - Monitor for exposed credentials and sensitive data on the dark web
- **💬 AI Security Assistant** - Interactive AI chatbot for security queries and threat analysis
- **📊 Real-time Dashboard** - Comprehensive security analytics with interactive charts and threat trends
- **🔐 SSL/TLS Checker** - Certificate validation and security configuration analysis
- **🌐 Network Device Scanner** - Discover and analyze devices on your network
- **📝 Activity Logs** - Detailed audit trails of all security events and actions
- **🤖 AI Detection** - Detect AI-generated images and deepfake content
- **⚠️ Threat Monitoring** - Real-time threat intelligence and security alerts
- **📈 Security Score** - Dynamic security posture assessment based on detected threats

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type-safe, modern UI development
- **Vite** for lightning-fast development and optimized builds
- **TailwindCSS** for responsive, utility-first styling
- **Recharts** for interactive data visualization
- **React Router** for seamless navigation
- **Shadcn/ui** for beautiful, accessible components

### Backend
- **Supabase** - PostgreSQL database with real-time capabilities
- **Edge Functions** - Serverless functions for API integrations
- **Row Level Security (RLS)** - Fine-grained access control

### AI & Security Services
- **OpenAI GPT** - Advanced natural language processing for threat analysis
- **VirusTotal API** - File and URL reputation checks
- **Have I Been Pwned** - Breach database lookup
- **Firecrawl** - Web scraping and content analysis
- **Steel Browser** - Automated browser security testing
- **Screenshot Services** - Visual analysis of suspicious websites

## 🗄️ Database Schema

### Core Tables

**profiles**
- User profile information, avatars, and preferences
- Linked to Supabase Auth users

**threats**
- Detected security threats and incidents
- Fields: severity, threat_type, source_ip, description, status
- Timestamps for detection and resolution tracking

**phishing_scans**
- Historical phishing detection results
- URL/email content analysis
- Risk scoring and threat indicators

**activity_logs**
- Comprehensive audit trail
- User actions, security events, and system activities
- Categorized by action type and severity

**notifications**
- Real-time security alerts
- User notification preferences
- Read/unread status tracking

**security_scores**
- Historical security posture metrics
- Score trends and recommendations
- Automated calculation based on threat data

## 🔧 Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling** | TailwindCSS, Shadcn/ui Components |
| **State Management** | React Hooks, Custom Hooks |
| **Charts & Visualization** | Recharts, Custom SVG Graphics |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **Serverless Functions** | Supabase Edge Functions (Deno) |
| **AI/ML** | OpenAI GPT-4, Custom AI Models |
| **Security APIs** | VirusTotal, HIBP, Custom Integrations |
| **Routing** | React Router v6 |
| **Forms & Validation** | React Hook Form, Zod |
| **Date/Time** | date-fns |
| **Icons** | Lucide React |
| **Notifications** | Custom Toast System |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/bun
- Supabase account
- API keys for external services (optional for full functionality)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Raju-kumar-vishwakarma/CyberShield-AI.git
cd CyberShield-AI
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Environment Setup**

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

4. **Database Setup**

Run the SQL migrations in your Supabase project:
```bash
# Located in /supabase/migrations/
```

5. **Start Development Server**
```bash
npm run dev
# or
bun dev
```

Visit `http://localhost:5173`

## 📁 Project Structure

```
CyberShield/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Shadcn/ui components
│   │   ├── Layout.tsx    # Main layout wrapper
│   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   └── ...
│   ├── pages/            # Route components
│   │   ├── Dashboard.tsx
│   │   ├── PhishingDetection.tsx
│   │   ├── ThreatMonitoring.tsx
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useThreatAnalytics.ts
│   │   └── ...
│   ├── integrations/     # External service integrations
│   │   └── supabase/
│   └── lib/              # Utility functions
├── supabase/
│   ├── functions/        # Edge Functions
│   │   ├── ai-chat/
│   │   ├── analyze-phishing/
│   │   ├── check-ssl/
│   │   └── ...
│   └── migrations/       # Database migrations
├── public/               # Static assets
└── ...config files
```

## 🔐 Security Features

### Authentication & Authorization
- Supabase Auth with email/password
- Row Level Security (RLS) policies
- Secure session management
- Protected routes and API endpoints

### Threat Detection
- Real-time AI-powered threat analysis
- Behavioral pattern recognition
- Multi-source threat intelligence
- Automated risk scoring

### Data Protection
- Encrypted data storage
- Secure API communication
- Environment variable protection
- Input sanitization and validation

## 📊 Features in Detail

### Dashboard Analytics
- Real-time security metrics
- 7-day threat trends
- Threat type distribution
- Severity breakdown
- Recent threat feed
- Security score calculation

### Phishing Detection
- Email content analysis
- URL reputation checking
- Bulk URL scanning
- File attachment analysis
- VirusTotal integration
- Domain reputation lookup

### Threat Monitoring
- Live threat feed
- Filterable by severity and type
- Detailed threat information
- Source IP tracking
- Timeline visualization

## 🛠️ API Integrations

- **OpenAI GPT-4** - Intelligent threat analysis and chat
- **VirusTotal** - Malware and URL scanning
- **Have I Been Pwned** - Breach database
- **Firecrawl** - Web content extraction
- **Steel Browser** - Automated browser testing
- **Screenshot Services** - Visual website analysis

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Raju Kumar Vishwakarma** - [GitHub](https://github.com/Raju-kumar-vishwakarma)

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Supabase for the amazing backend platform
- All open-source contributors

## 📞 Support

For support, email support@cybershield.ai or open an issue in the GitHub repository.

---

**Built with ❤️ for a safer digital world**
