# 🤖 AI Integration Setup Guide

## Overview
This guide will help you set up the AI-powered content generation system for your Firefly Tiny Homes blog. The system includes:

- **Automated weekly blog generation** based on your curated topic list
- **Custom content generation** for specific topics you want to cover
- **Intelligent content scheduling** with admin approval workflow
- **High-quality AI-generated content** optimized for SEO and conversions

## 🚀 Quick Start

### 1. Choose Your AI Provider

**Option A: OpenAI (Recommended)**
- Most reliable and high-quality output
- Uses GPT-4 for content generation
- Cost: ~$0.03 per 1K tokens (approximately $0.10-0.20 per blog post)

**Option B: Anthropic Claude**
- Excellent for creative and educational content
- Strong reasoning capabilities
- Cost: Similar to OpenAI

**Option C: Local Models (Advanced)**
- Ollama, Llama, or other local models
- No API costs but requires more setup

### 2. Get Your API Key

#### For OpenAI:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new secret key
5. Copy the key (starts with `sk-`)

#### For Claude:
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new key
5. Copy the key

### 3. Configure Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# AI Configuration (Claude)
VITE_AI_API_KEY=your_claude_api_key_here
VITE_AI_API_URL=https://api.anthropic.com/v1
VITE_AI_MODEL=claude-3-5-sonnet-20241022

# Optional: OpenAI setup
# VITE_AI_API_URL=https://api.openai.com/v1
# VITE_AI_MODEL=gpt-4
```

### 4. Set Up the AI Content Manager

1. **Access the AI Manager**: Go to your admin panel and look for "AI Content Manager"
2. **Initialize the System**: The system will automatically detect your API configuration
3. **Configure Schedule**: Set your preferred posting frequency (weekly recommended)
4. **Review Topics**: The system comes with 20 pre-curated tiny home topics

## ⚙️ Configuration Options

### Schedule Settings

- **Frequency**: Weekly, bi-weekly, or monthly
- **Day of Week**: Choose which day to generate content
- **Time**: Set the time for content generation (recommended: 9:00 AM)
- **Auto-publish**: Choose whether to auto-publish or require manual approval

### Content Settings

- **Template Rotation**: Automatically cycles through story, educational, and inspirational templates
- **Topic Rotation**: Cycles through your curated topic list
- **Quality Control**: Built-in validation ensures content meets standards

## 📝 Topic Management

### Pre-curated Topics Include:

1. Park Model Homes vs Traditional Housing: A Complete Comparison
2. Tiny Home Living in Texas: Regulations and Benefits
3. Customizing Your Tiny Home Interior: Design Tips and Ideas
4. Tiny Home Financing Options: What You Need to Know
5. Tiny Home Community Living: Building Connections
6. Tiny Home Maintenance Tips: Keeping Your Home in Top Shape
7. Tiny Home Energy Efficiency: Sustainable Living Solutions
8. Tiny Home Zoning and Regulations: Navigating the Legal Landscape
9. Tiny Home Design Trends: What's Hot in 2024
10. Tiny Home Investment Potential: Building Wealth Through Smart Choices
11. Tiny Home vs RV Living: Which is Right for You?
12. Tiny Home Storage Solutions: Maximizing Your Space
13. Tiny Home Insurance: Protecting Your Investment
14. Tiny Home Resale Value: Factors That Matter
15. Tiny Home Community Events: Building Your Network
16. Tiny Home Pet-Friendly Features: Accommodating Your Furry Friends
17. Tiny Home Winter Preparation: Staying Cozy in Cold Weather
18. Tiny Home Summer Cooling: Beat the Texas Heat
19. Tiny Home Security: Keeping Your Home Safe
20. Tiny Home Internet and Technology: Staying Connected

### Adding Custom Topics

1. Click "Add Topic" in the Topic Management section
2. Enter your topic (e.g., "Tiny Home Solar Panel Installation Guide")
3. The system will automatically include it in the rotation

## 🔄 How It Works

### Automated Generation Process

1. **Scheduled Trigger**: System runs at your specified time and day
2. **Topic Selection**: Automatically selects the next topic from your list
3. **Template Selection**: Cycles through your three templates
4. **AI Generation**: Creates high-quality content using your chosen AI provider
5. **Content Validation**: Ensures content meets quality standards
6. **Save to Blog**: Creates a draft post in your blog system
7. **Admin Review**: You review and approve before publishing

### Custom Content Generation

1. **Enter Topic**: Type any topic you want to cover
2. **Select Template**: Choose story, educational, or inspirational style
3. **Generate**: AI creates content in seconds
4. **Review & Edit**: Make any adjustments needed
5. **Save**: Save directly to your blog as a draft

## 💰 Cost Estimation

### Claude 3.5 Sonnet Pricing (Approximate)
- **Per blog post**: $0.15 - $0.30
- **Weekly cost**: $0.60 - $1.20
- **Monthly cost**: $2.40 - $4.80
- **Yearly cost**: $28.80 - $57.60

*Note: Claude pricing is slightly higher but provides more natural, engaging content*

### Cost Optimization Tips
1. **Use GPT-3.5-turbo** for less critical content (50% cheaper)
2. **Set lower token limits** for shorter posts
3. **Batch generate** multiple posts at once
4. **Use local models** for development/testing

## 🛡️ Safety & Quality Control

### Built-in Safeguards
- **Content Validation**: Ensures minimum word count and required fields
- **Template Consistency**: Maintains your brand voice and style
- **Admin Approval**: All content requires your review before publishing
- **Error Handling**: Automatic retry if generation fails

### Content Quality Features
- **SEO Optimization**: Automatically includes relevant keywords
- **Local References**: Incorporates Texas-specific information
- **Actionable Content**: Provides practical tips and advice
- **Professional Tone**: Maintains expert authority in tiny home industry

## 🚨 Troubleshooting

### Common Issues

**"API Key Missing" Error**
- Check your `.env.local` file
- Ensure the file is in the project root
- Restart your development server

**"Content Generation Failed" Error**
- Verify your API key is valid
- Check your OpenAI/Claude account balance
- Ensure you have sufficient API credits

**Scheduler Not Running**
- Check browser console for errors
- Verify the scheduler is started
- Check your schedule settings

### Getting Help

1. **Check Console Logs**: Look for error messages in browser console
2. **Verify API Status**: Check if your AI provider is experiencing issues
3. **Review Configuration**: Double-check environment variables
4. **Test API Key**: Try generating a simple custom post first

## 🔮 Advanced Features

### Custom Prompts
You can modify the AI system prompts in `src/services/ai/AIService.js` to:
- Adjust writing style
- Include specific brand guidelines
- Add industry-specific requirements
- Customize content length preferences

### Integration Options
The system can be extended to:
- **Email Notifications**: Get alerts when content is generated
- **Social Media**: Auto-post to your social accounts
- **Analytics**: Track AI-generated content performance
- **A/B Testing**: Test different AI prompts and templates

## 📊 Monitoring & Analytics

### Track Your AI Content Performance
- **Generation Success Rate**: Monitor how often content generation succeeds
- **Content Quality Scores**: Track engagement metrics
- **Cost Tracking**: Monitor API usage and costs
- **Topic Performance**: See which AI-generated topics perform best

## 🎯 Best Practices

### For Optimal Results
1. **Start with Weekly Generation**: Begin with weekly posts to test the system
2. **Review All Content**: Always review AI-generated content before publishing
3. **Customize Topics**: Add your own topics based on customer questions
4. **Monitor Performance**: Track which AI-generated posts perform best
5. **Iterate & Improve**: Adjust prompts and settings based on results

### Content Strategy Tips
1. **Mix AI and Human**: Use AI for regular content, human for special posts
2. **Local Focus**: Ensure AI includes Texas-specific information
3. **Customer Stories**: Use AI to expand on real customer experiences
4. **Seasonal Content**: Schedule relevant topics for different times of year

## 🚀 Next Steps

1. **Set up your API key** following the steps above
2. **Configure your schedule** preferences
3. **Test with a custom post** to ensure everything works
4. **Start the automated scheduler** for weekly content
5. **Monitor and adjust** based on results

## 💡 Pro Tips

- **Start Small**: Begin with weekly posts and scale up
- **Quality Over Quantity**: Focus on high-quality content rather than posting daily
- **Human Touch**: Always add your personal insights to AI-generated content
- **SEO Focus**: Use AI to create SEO-optimized content that ranks well
- **Customer Engagement**: Use AI to answer common customer questions in blog format

---

**Need Help?** Check the console logs for error messages, or review your API configuration. The system is designed to be self-healing and will retry failed operations automatically.
