# Cursor AI Rules for Firefly Estimator

## **Overview**

This directory contains comprehensive rules that guide Cursor AI to understand and work effectively with the Firefly Estimator project. These rules ensure that AI assistants follow established patterns, use correct technologies, and maintain code quality standards.

## **How Cursor Rules Work**

Cursor automatically reads `.mdc` files in the `.cursor/rules/` directory and applies them to AI interactions. The rules are weighted by their position and content, with critical information at the beginning and end receiving higher priority.

### **Rule File Format**
- **`.mdc` extension**: Required for Cursor to recognize the rules
- **YAML frontmatter**: Contains metadata like description and globs
- **Markdown content**: Detailed rules and examples
- **Weighted content**: Critical information at start/end for better AI attention

## **Available Rules**

### **0. Rule Creation Meta-Rule** (`00-rule-for-creating-rules.mdc`)
**CRITICAL RULE** - Always follow this when creating or modifying rules

- **Rule Creation Framework**: Complete framework for creating high-quality rules
- **Content Structure**: Mandatory sections and formatting requirements
- **Quality Standards**: Metrics and validation checklists
- **AI Performance**: Optimization techniques for maximum AI understanding
- **Maintenance**: Review schedules and update procedures

### **1. Architecture & Structure** (`architecture-structure.mdc`)
**CRITICAL RULE** - Always apply this first

- **Project Structure**: Monorepo organization and directory patterns
- **API Architecture**: Single Express handler pattern (CRITICAL)
- **File Naming**: PascalCase for components, camelCase for utilities
- **Import Patterns**: Lazy loading, utility imports, component imports
- **Component Architecture**: Functional components with proper structure
- **Database Integration**: MongoDB connection patterns
- **Error Handling**: Error boundaries and API error handling
- **Performance**: Lazy loading and code splitting
- **Deployment**: Vercel configuration and environment management

### **2. Technology Stack** (`technology-stack.mdc`)
**CRITICAL RULE** - Technology versions and compatibility

- **Core Technologies**: React 19, Vite 7, Node.js 22.x, MongoDB 6.18
- **React 19 Patterns**: Modern hooks, error boundaries, performance optimization
- **Vite Build System**: Configuration, imports, asset handling
- **TailwindCSS**: Class organization, custom colors, responsive design
- **Express & API**: Middleware, route handlers, error handling
- **MongoDB**: Connection management, operations, indexing
- **Clerk Authentication**: Client and server-side integration
- **Stripe Payments**: Payment intents, webhooks, error handling
- **Testing**: Vitest configuration, component testing, API testing
- **Development**: Scripts, environment management, build optimization

### **3. Code Quality & Standards** (`code-quality-standards.mdc`)
**CRITICAL RULE** - Code quality and maintainability

- **ESLint Configuration**: Rules, code style, import organization
- **Error Handling**: Comprehensive error handling in components and APIs
- **Form Validation**: React Hook Form with Zod validation
- **Performance**: React optimization, bundle optimization, asset handling
- **Accessibility**: Semantic HTML, ARIA, keyboard navigation, screen readers
- **Testing**: Component testing, API testing, test organization
- **Documentation**: Component docs, function docs, code review checklist
- **Common Mistakes**: What to avoid and validation checklists

### **4. Business Logic** (`business-logic.mdc`)
**CRITICAL RULE** - Business operations and workflows

- **Quote Building**: Complete quote workflow and data structure
- **Pricing Calculations**: Tax, delivery, and total price calculations
- **Option Management**: Option selection, dependencies, and conflicts
- **Order Processing**: Order creation, status management, and validation
- **Business Rules**: Validation rules and business constraints
- **Data Integrity**: Ensuring accurate business calculations

### **5. UI/UX Design** (`ui-ux-design.mdc`)
**CRITICAL RULE** - Design consistency and user experience

- **Design System**: Color palette, typography, and spacing standards
- **Component Library**: Standardized button, form, and card components
- **Layout Systems**: Container, grid, and responsive design patterns
- **Interactive Elements**: Hover states, loading states, and animations
- **Accessibility**: Semantic HTML, ARIA labels, and screen reader support
- **Responsive Design**: Mobile-first approach and breakpoint management

### **6. Security** (`security.mdc`)
**CRITICAL RULE** - Authentication, authorization, and data protection

- **Authentication**: Clerk integration and session management
- **Authorization**: Role-based access control and permissions
- **Data Protection**: Input validation, sanitization, and encryption
- **API Security**: CORS, rate limiting, and request validation
- **Environment Security**: Secrets management and configuration
- **Vulnerability Prevention**: XSS, SQL injection, and CSRF protection

### **7. Database Design** (`database-design.mdc`)
**CRITICAL RULE** - Data integrity and database operations

- **Schema Design**: MongoDB collection structures and validation
- **Database Operations**: CRUD operations and aggregation patterns
- **Index Management**: Performance optimization and query efficiency
- **Data Migration**: Versioned migrations and rollback procedures
- **Data Seeding**: Initial data setup and testing data
- **Performance Monitoring**: Query optimization and index statistics

### **8. Marketing & SEO Optimization** (`marketing-seo-optimization.mdc`)
**CRITICAL RULE** - Search visibility and marketing optimization

- **Core Web Vitals**: Performance optimization and page speed
- **Structured Data**: JSON-LD schema markup and rich snippets
- **Content Optimization**: Keyword strategy and SEO best practices
- **Technical SEO**: Sitemaps, robots.txt, and internal linking
- **Voice Search**: Conversational AI and natural language optimization
- **Local SEO**: Google My Business and location-based optimization
- **Analytics**: Performance monitoring and conversion tracking

### **9. Compliance, Accessibility & Security** (`compliance-accessibility-security.mdc`)
**CRITICAL RULE** - Legal compliance and user protection

- **Accessibility Standards**: WCAG 2.2 AA compliance and semantic HTML
- **Security Implementation**: CSP headers, input validation, and PCI DSS v4.0
- **Privacy Compliance**: GDPR/CPRA compliance and data protection
- **Legal Requirements**: ADA, Section 508, and international standards
- **Testing & Validation**: Automated accessibility and security testing
- **Documentation**: Legal pages and accessibility statements

## **How to Use These Rules**

### **For AI Assistants**
1. **Always follow the Meta-Rule** - Use the rule creation framework for any rule work
2. **Start with Architecture & Structure** - This is the foundation
3. **Check Technology Stack** - Ensure correct versions and patterns
4. **Apply Code Quality Standards** - Maintain high code quality
5. **Reference specific examples** - Use the provided code patterns
6. **Follow validation checklists** - Verify compliance before proceeding

### **For Developers**
1. **Read the Meta-Rule first** - Understand how to create and maintain rules
2. **Read all rules thoroughly** - Understand the complete system
3. **Follow established patterns** - Don't create new patterns without justification
4. **Use validation checklists** - Verify your code meets standards
5. **Reference examples** - Use the provided code as templates
6. **Ask for clarification** - When in doubt, ask rather than guess

## **Rule Priority and Weighting**

### **High Priority (Start of Rules)**
- **CRITICAL** warnings and requirements
- **Project structure** and architecture
- **Technology versions** and compatibility
- **Core patterns** that must not be violated

### **Medium Priority (Middle of Rules)**
- **Implementation details** and examples
- **Best practices** and guidelines
- **Common patterns** and solutions
- **Testing and validation** requirements

### **High Priority (End of Rules)**
- **Validation checklists** and verification steps
- **Common mistakes** to avoid
- **Related files** and references
- **When in doubt** guidance

## **Adding New Rules**

### **Rule Creation Guidelines**
1. **Use `.mdc` extension** for Cursor compatibility
2. **Include YAML frontmatter** with description and metadata
3. **Weight critical information** at beginning and end
4. **Provide concrete examples** and code patterns
5. **Include validation checklists** for verification
6. **Reference related files** and existing patterns
7. **Use clear formatting** with proper markdown structure

### **Rule Template Structure**
```markdown
---
description: Brief description of the rule's purpose
---

# Rule Title

## **CRITICAL: Key Requirements**

## **1. Main Section**
### **Subsection**
- **Key points**
- **Requirements**

### **Code Examples**
```javascript
// CORRECT: Proper implementation
```

## **Common Mistakes**
### **❌ DON'T Do This**
```javascript
// WRONG: What not to do
```

## **Validation Checklist**
- [ ] Check item 1
- [ ] Check item 2

## **Related Files**
- **`file.js`**: Description

## **When in Doubt**
1. **Action 1**
2. **Action 2**
```

## **Rule Maintenance**

### **Regular Updates**
- **Review rules quarterly** for accuracy and completeness
- **Update technology versions** when dependencies change
- **Add new patterns** as they become established
- **Remove outdated information** to prevent confusion
- **Validate examples** against current codebase

### **Rule Validation**
- **Test rules with AI** to ensure they're working correctly
- **Verify examples** compile and run properly
- **Check references** to ensure files still exist
- **Update checklists** based on new requirements
- **Gather feedback** from team members using the rules

## **Troubleshooting**

### **Common Issues**
1. **Rules not being applied**: Check file extensions and location
2. **Conflicting information**: Ensure rules are consistent
3. **Outdated examples**: Update code examples regularly
4. **Missing patterns**: Add rules for new established patterns
5. **AI confusion**: Simplify complex rules and add more examples

### **Getting Help**
- **Review existing rules** for similar patterns
- **Check the codebase** for working examples
- **Ask team members** for clarification
- **Update rules** based on new learnings
- **Document solutions** for future reference

## **Best Practices**

### **For Rule Writers**
1. **Be specific** - Avoid vague language and generalizations
2. **Provide examples** - Code examples are more valuable than descriptions
3. **Use consistent formatting** - Maintain uniform structure across rules
4. **Include checklists** - Make verification easy and systematic
5. **Reference files** - Point to specific files and code sections
6. **Explain why** - Help AI understand the reasoning behind rules

### **For Rule Users**
1. **Read rules completely** - Don't skip sections
2. **Follow examples exactly** - Use provided code as templates
3. **Verify compliance** - Use checklists before proceeding
4. **Ask questions** - When rules aren't clear, ask for clarification
5. **Suggest improvements** - Help make rules better over time

## **Conclusion**

These rules create a comprehensive framework that ensures Cursor AI understands your project deeply and can provide accurate, helpful assistance. By following these rules consistently, you'll get much better AI support and maintain high code quality across your project.

**Remember**: The rules are living documents. Update them as your project evolves and new patterns emerge.
