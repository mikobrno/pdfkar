# Intelligent Document Processing System

A comprehensive, production-ready system for automated PDF document processing using AI, built with React, Supabase, and n8n.

## 🚀 Features

### Core Functionality
- **Intelligent Document Upload**: Drag-and-drop interface with real-time progress tracking
- **AI-Powered Classification**: Automatic document type detection using Gemini AI
- **Data Extraction**: Precise extraction of key information with confidence scores
- **Visual Highlighting**: Interactive PDF viewer with highlighted extracted data
- **Human-in-the-Loop Review**: Validation interface for quality assurance
- **Real-time Updates**: Live status updates using Supabase real-time subscriptions

### Advanced Features
- **Asynchronous Processing**: Queue-based architecture for scalability and reliability
- **Prompt Management**: Versioned AI prompt system with testing playground
- **Analytics Dashboard**: Comprehensive metrics and performance insights
- **Audit Trail**: Complete logging for compliance and debugging
- **Role-based Access Control**: Secure multi-user system with granular permissions

### Technical Excellence
- **Production Architecture**: Event-driven design with proper error handling
- **Security First**: Row-level security, malware scanning, GDPR compliance
- **Scalable Design**: Microservices-ready with horizontal scaling support
- **Modern Stack**: React 18, TypeScript, Tailwind CSS, Supabase, n8n

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │    Supabase     │    │      n8n        │
│                 │    │                 │    │                 │
│ • File Upload   │◄──►│ • Database      │◄──►│ • AI Workflows  │
│ • PDF Viewer    │    │ • Storage       │    │ • Job Processing│
│ • Review UI     │    │ • Auth          │    │ • External APIs │
│ • Admin Panel   │    │ • Real-time     │    │ • Error Handling│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Upload**: User uploads PDF → Supabase Storage
2. **Queue**: Job message created → Supabase Queue
3. **Process**: n8n worker picks up job → AI processing
4. **Extract**: Data extracted with coordinates → Database
5. **Review**: Human validation → Feedback loop
6. **Complete**: Final data stored → Audit log

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- Supabase account
- n8n instance (local or cloud)
- Gemini AI API key

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd intelligent-document-processing
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and API keys
   ```

3. **Database Setup**
   ```bash
   # Run migrations in Supabase SQL editor
   # Execute files in supabase/migrations/ in order
   ```

4. **Storage Configuration**
   - Create 'documents' bucket in Supabase Storage
   - Apply storage policies from migration files

5. **Start Development**
   ```bash
   npm run dev
   ```

## 📊 Database Schema

### Core Tables

- **documents**: Document metadata and processing status
- **job_queue**: Asynchronous job processing with retry logic
- **extracted_data**: AI-extracted data with spatial coordinates
- **prompts**: Versioned AI prompt management
- **ai_feedback_log**: Human corrections for model improvement
- **audit_log**: Complete system audit trail

### Security Model

- **Row Level Security (RLS)** enabled on all tables
- **Role-based access**: user, reviewer, admin
- **Audit logging** for all critical operations
- **Data encryption** at rest and in transit

## 🤖 AI Integration

### Prompt Management
- Versioned prompts with changelog tracking
- A/B testing capabilities
- Real-time testing playground
- Automatic rollback functionality

### Processing Pipeline
1. **Classification**: Document type identification
2. **Extraction**: Field-specific data extraction
3. **Validation**: Confidence scoring and quality checks
4. **Feedback**: Human corrections for model improvement

## 🔧 n8n Workflows

### Document Processing Workflow
1. **Trigger**: Queue message received
2. **Download**: Fetch PDF from Supabase Storage
3. **Classify**: Determine document type
4. **Route**: Send to specialized extraction workflow
5. **Extract**: AI-powered data extraction
6. **Store**: Save results to database
7. **Notify**: Update document status

### Error Handling
- Automatic retry with exponential backoff
- Dead letter queue for failed jobs
- Comprehensive error logging
- Alert notifications for critical failures

## 🎨 User Interface

### Dashboard
- Real-time document statistics
- Processing queue status
- Quick action buttons
- Recent activity feed

### Upload Interface
- Drag-and-drop file upload
- Batch processing support
- Progress tracking
- File validation

### Review Interface
- Side-by-side PDF and form view
- Interactive highlighting
- Confidence indicators
- One-click approval

### Admin Panel
- Prompt management
- User role administration
- System monitoring
- Analytics dashboard

## 📈 Analytics & Monitoring

### Key Metrics
- Processing volume and trends
- Success/failure rates
- Average processing time
- Document type distribution
- User activity patterns

### Monitoring
- Real-time status updates
- Error rate tracking
- Performance metrics
- Resource utilization

## 🔒 Security & Compliance

### Security Features
- JWT-based authentication
- Row-level security policies
- File upload validation
- Malware scanning integration
- API rate limiting

### GDPR Compliance
- Data processing consent
- Right to be forgotten
- Data portability
- Audit trail maintenance
- Privacy policy integration

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Storage buckets created
- [ ] RLS policies enabled
- [ ] n8n workflows deployed
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Scaling Considerations
- Horizontal n8n worker scaling
- Database connection pooling
- CDN for static assets
- Load balancing
- Caching strategies

## 🧪 Testing

### Test Coverage
- Unit tests for components
- Integration tests for workflows
- End-to-end user journey tests
- Performance testing
- Security testing

### Quality Assurance
- Code review process
- Automated testing pipeline
- Manual testing protocols
- User acceptance testing
- Performance benchmarking

## 📚 Documentation

### API Documentation
- Supabase schema documentation
- n8n workflow documentation
- Integration guides
- Troubleshooting guides

### User Guides
- Getting started tutorial
- Feature documentation
- Best practices
- FAQ section

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

---

Built with ❤️ using modern web technologies for intelligent document processing.