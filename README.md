"# Fucking File Hosting

![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)
![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**A blazing-fast, privacy-first file hosting service built with Laravel 12 and React 18.**

Upload and share files instantly with zero registration, complete privacy protection, and enterprise-grade security. Optimized for shared hosting environments with support for files up to 100MB.

## ✨ Key Features

### 🚀 **Blazing Fast Performance**

- Instant file uploads with drag-and-drop interface
- Zero speed limits on downloads
- Chunked uploads for large files (>25MB)
- Memory-efficient streaming
- Sub-1-second page loads

### 🔒 **Complete Privacy Protection**

- **Zero tracking** - No IP logging, user agents, or personal identifiers
- **No registration required** - Upload files anonymously
- **Cryptographically secure URLs** - Unguessable download links
- **No cookies or analytics** - Complete user anonymity
- **Privacy-first architecture**

### 📁 **Powerful File Management**

- Upload files up to **100MB**
- Support for **all file types** with proper MIME detection
- **Flexible expiration** - 1-365 days or permanent storage
- **Automatic cleanup** of expired files
- **File deduplication** to save storage space

### 🛡️ **Enterprise-Grade Security**

- Comprehensive file validation (extension, MIME type, content scanning)
- Malware protection with advanced security checks
- Rate limiting with privacy-friendly IP hashing
- Security headers (CSRF, XSS, CSP)
- Secure file storage with protected directories

### 🔧 **Developer-Friendly API**

- **RESTful API** endpoints for programmatic access
- **curl integration** - Easy command-line uploads
- **JSON responses** with proper HTTP status codes
- **No authentication required** - Frictionless API access
- **Bulk upload support**

### 📱 **Modern User Experience**

- **Dark theme** with orange/red gradient accents
- **Fully responsive** - Works on all device sizes
- **Progressive Web App** - Install as native app
- **Accessibility compliant** - WCAG 2.1 AA standards
- **System fonts** for fast loading

## 🚀 Quick Start

### Requirements

- **PHP 8.2+** with required extensions
- **MySQL 5.7+** or **SQLite**
- **Node.js 18+** and **npm**
- **Composer**
- **Web server** (Apache/Nginx)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/PhyschicWinter9/Fucking-file-hosting.git
    cd fucking-file-hosting
    ```

2. **Install dependencies**

    ```bash
    composer install
    npm install
    ```

3. **Environment setup**

    ```bash
    cp .env.example .env
    php artisan key:generate
    ```

4. **Database setup**

    ```bash
    php artisan migrate
    ```

5. **Build assets**

    ```bash
    npm run build
    ```

6. **Start development server**
    ```bash
    composer run dev
    ```

Visit `http://localhost:8000` to access your file hosting service!

## 📚 Documentation

Our documentation is organized in a step-by-step manner for easy navigation:

1. **[Installation Guide](documentation/1.installation.md)** - Complete setup instructions
2. **[API Documentation](documentation/2.api-documentation.md)** - RESTful API reference
3. **[Project Overview](documentation/3.project-overview.md)** - Features and technical specs
4. **[Deployment Guide](documentation/4.deployment-guide.md)** - Production deployment
5. **[Environment Setup](documentation/5.environment-setup.md)** - Development environments
6. **[Maintenance Mode](documentation/6.maintenance-mode.md)** - Maintenance features
7. **[Troubleshooting](documentation/7.troubleshooting.md)** - Common issues and solutions
8. **[Advanced Configuration](documentation/8.advanced-configuration.md)** - Performance tuning
9. **[Social Media Guide](documentation/9.social-media-guide.md)** - Marketing and community
10. **[Cronjobs and Commands](documentation/10.cronjobs-and-commands.md)** - Automated tasks and monitoring

## 🛠️ Technology Stack

### Backend

- **Laravel 12** - Modern PHP framework
- **PHP 8.2+** - Latest PHP features
- **MySQL/SQLite** - Flexible database support
- **Inertia.js** - SPA without API complexity

### Frontend

- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Vite** - Fast build tool

### Features

- **Chunked uploads** - Large file support
- **File deduplication** - Storage optimization
- **Rate limiting** - Abuse prevention
- **Automated cleanup** - Cronjobs for maintenance
- **Performance monitoring** - Resource tracking
- **Custom commands** - System administration
- **CDN ready** - Global distribution

## 🔧 API Usage

### Upload a file

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@example.pdf" \
  -F "expiration_days=30"
```

### Download a file

```bash
curl -X GET http://localhost:8000/f/{file_id} \
  -o downloaded-file.pdf
```

### Get file information

```bash
curl -X GET http://localhost:8000/api/file/{file_id}/info
```

## 🚀 Deployment

### Shared Hosting (cPanel)

1. Upload files to `public_html`
2. Create MySQL database
3. Run setup wizard at `/setup`
4. Configure environment variables

### VPS/Dedicated Server

1. Install PHP 8.2+ and extensions
2. Configure web server
3. Set up database
4. Run deployment commands

### Docker

```bash
docker-compose up -d
```

See the [Deployment Guide](documentation/4.deployment-guide.md) for detailed instructions.

## 🤝 Contributing

We welcome contributions! This project was built with **Kiro AI** assistance.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `php artisan test`
5. Submit a pull request

### Code Style

- Follow PSR-12 for PHP
- Use Prettier for JavaScript/TypeScript
- Write tests for new features
- Update documentation

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Built with Kiro AI** - This project was developed with assistance from Kiro, an AI-powered development assistant
- **Laravel Community** - For the amazing framework
- **React Team** - For the excellent UI library
- **Privacy Advocates** - For inspiring privacy-first design
- **Open Source Community** - For tools and inspiration

## 🔗 Links

- **Documentation**: [/documentation](documentation/)
- **API Reference**: [API Documentation](documentation/2.api-documentation.md)
- **Issues**: [GitHub Issues](https://github.com/PhyschicWinter9/Fucking-file-hosting/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PhyschicWinter9/Fucking-file-hosting/discussions)

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/PhyschicWinter9/Fucking-file-hosting?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/PhyschicWinter9/Fucking-file-hosting?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/PhyschicWinter9/Fucking-file-hosting?style=for-the-badge)
![GitHub pull requests](https://img.shields.io/github/issues-pr/PhyschicWinter9/Fucking-file-hosting?style=for-the-badge)

---

**Made with ❤️ and Kiro AI** | **Privacy First** | **Open Source**"
