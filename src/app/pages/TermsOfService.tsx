"use client";

import { useNavigate } from "@/lib/router-compat";
import { ArrowLeft, FileText } from "lucide-react";
import logo from "../../assets/logo.png";

export function TermsOfService() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: [
        {
          subtitle: "",
          body: "By accessing or using TalentBridge (\"TalentBridge\", \"we\", \"our\", or \"us\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, please do not use our platform.\n\nThese Terms apply to all visitors, users, candidates, and recruiters who access or use TalentBridge. By creating an account or using any feature of the platform, you represent that you have read, understood, and agree to these Terms, as well as our Privacy Policy.",
        },
      ],
    },
    {
      title: "2. Description of Service",
      content: [
        {
          subtitle: "",
          body: "TalentBridge is an AI-powered recruitment platform that connects job seekers (\"Candidates\") with employers (\"Recruiters\"). The platform provides features including but not limited to: job posting and discovery, application management, resume upload and parsing, AI-based candidate evaluation and scoring, semantic search and matching, online assessments, offer letter management, real-time messaging, and Google Calendar integration for interview scheduling.",
        },
      ],
    },
    {
      title: "3. Eligibility",
      content: [
        {
          subtitle: "3.1 Age Requirement",
          body: "You must be at least 18 years of age to use TalentBridge. By using the platform, you represent and warrant that you meet this requirement.",
        },
        {
          subtitle: "3.2 Account Accuracy",
          body: "You agree to provide accurate, complete, and current information when creating your account and to keep it updated. Providing false information, including impersonating another person or organization, is prohibited and may result in immediate account termination.",
        },
        {
          subtitle: "3.3 One Account Per Person",
          body: "Each individual may maintain only one account. Creating multiple accounts to circumvent restrictions or bans is prohibited.",
        },
      ],
    },
    {
      title: "4. User Accounts",
      content: [
        {
          subtitle: "4.1 Account Security",
          body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.",
        },
        {
          subtitle: "4.2 Account Types",
          body: "TalentBridge offers two account types: Candidate accounts for job seekers, and Recruiter accounts for employers and hiring managers. Each account type has different features and permissions. You may not use a Recruiter account for personal job searching or a Candidate account for posting jobs.",
        },
        {
          subtitle: "4.3 Google Sign-In",
          body: "If you register or sign in using Google OAuth, you authorize us to access and use the Google account information we request, subject to Google's terms and your account permissions. You remain responsible for all activity on your TalentBridge account.",
        },
      ],
    },
    {
      title: "5. Candidate Responsibilities",
      content: [
        {
          subtitle: "5.1 Accurate Information",
          body: "Candidates must provide accurate and truthful information in their profiles, resumes, and applications. Misrepresenting qualifications, experience, education, or any other information is strictly prohibited and may result in account termination and notification to affected recruiters.",
        },
        {
          subtitle: "5.2 Professional Conduct",
          body: "Candidates agree to engage professionally with recruiters and other platform users. Harassment, discrimination, inappropriate language, or any form of abusive behaviour is prohibited.",
        },
        {
          subtitle: "5.3 Application Integrity",
          body: "Candidates may only apply for positions they are genuinely interested in and qualified for. Mass applying to positions without regard for requirements or using automated scripts to submit applications is prohibited.",
        },
        {
          subtitle: "5.4 Assessment Conduct",
          body: "When taking online assessments, candidates must complete them independently without outside assistance, sharing questions, or using automated tools unless expressly permitted. Cheating in assessments may result in immediate disqualification and account suspension.",
        },
      ],
    },
    {
      title: "6. Recruiter Responsibilities",
      content: [
        {
          subtitle: "6.1 Accurate Job Postings",
          body: "Recruiters must post accurate, truthful, and legitimate job opportunities. Job postings must represent genuine positions at real organizations. Misleading, fraudulent, or deceptive job postings are strictly prohibited.",
        },
        {
          subtitle: "6.2 Lawful Hiring Practices",
          body: "Recruiters agree to conduct hiring in compliance with all applicable employment laws, including laws prohibiting discrimination based on race, colour, religion, sex, national origin, age, disability, or any other protected characteristic.",
        },
        {
          subtitle: "6.3 Candidate Data Use",
          body: "Candidate information accessed through TalentBridge may only be used for legitimate hiring purposes related to open positions. Recruiters may not use candidate data for marketing, unsolicited contact unrelated to the application, or share it with unauthorized third parties.",
        },
        {
          subtitle: "6.4 Offer Commitments",
          body: "Offer letters sent through the platform should represent genuine employment offers. Sending false or misleading offers is prohibited.",
        },
      ],
    },
    {
      title: "7. Prohibited Conduct",
      content: [
        {
          subtitle: "",
          body: "You agree not to:\n\n• Use TalentBridge for any unlawful purpose or in violation of any regulations\n• Post content that is defamatory, obscene, hateful, or discriminatory\n• Attempt to gain unauthorized access to any part of the platform or other users' accounts\n• Use bots, scrapers, or automated tools to extract data from the platform\n• Interfere with or disrupt the platform's infrastructure, servers, or networks\n• Reverse-engineer, decompile, or attempt to extract the source code of TalentBridge\n• Upload malware, viruses, or any other malicious code\n• Spam other users with unsolicited messages\n• Sell, transfer, or sublicense your account to any other person\n• Use the platform to conduct competitor research or intelligence gathering",
        },
      ],
    },
    {
      title: "8. Content and Intellectual Property",
      content: [
        {
          subtitle: "8.1 Your Content",
          body: "You retain ownership of the content you submit to TalentBridge, such as your resume, profile information, and messages. By submitting content, you grant us a non-exclusive, worldwide, royalty-free licence to use, display, and process that content for the purpose of operating and improving the platform.",
        },
        {
          subtitle: "8.2 Our Intellectual Property",
          body: "TalentBridge, including its design, features, AI models, algorithms, and software, is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our platform without express written permission.",
        },
        {
          subtitle: "8.3 Feedback",
          body: "Any feedback or suggestions you provide about TalentBridge may be used by us without any obligation to compensate you.",
        },
      ],
    },
    {
      title: "9. AI-Generated Content and Evaluations",
      content: [
        {
          subtitle: "9.1 Nature of AI Evaluations",
          body: "TalentBridge uses AI to generate candidate evaluations, matching scores, and resume analyses. These are advisory tools only and do not constitute final hiring decisions. Recruiters are solely responsible for their hiring decisions, and candidates should not rely solely on AI-generated scores.",
        },
        {
          subtitle: "9.2 Accuracy Limitations",
          body: "AI-generated content may contain errors or inaccuracies. We do not warrant the accuracy, completeness, or suitability of any AI-generated output. Users should exercise independent judgment when acting on AI-generated information.",
        },
      ],
    },
    {
      title: "10. Privacy",
      content: [
        {
          subtitle: "",
          body: "Your use of TalentBridge is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices.",
        },
      ],
    },
    {
      title: "11. Termination",
      content: [
        {
          subtitle: "11.1 Termination by You",
          body: "You may terminate your account at any time by contacting us or using the account deletion feature. Upon termination, your access to the platform will cease and your data will be handled in accordance with our Privacy Policy.",
        },
        {
          subtitle: "11.2 Termination by Us",
          body: "We reserve the right to suspend or terminate your account at any time, with or without notice, for violation of these Terms, fraudulent activity, harmful behaviour, or any other reason at our sole discretion. We may also discontinue or modify the platform at any time.",
        },
        {
          subtitle: "11.3 Effect of Termination",
          body: "Upon termination, all rights granted to you under these Terms will cease immediately. Provisions that by their nature should survive termination will do so.",
        },
      ],
    },
    {
      title: "12. Disclaimers",
      content: [
        {
          subtitle: "12.1 No Guarantee of Employment",
          body: "TalentBridge does not guarantee that candidates will receive job offers or that recruiters will find suitable candidates. We are a platform facilitating connections, not an employment agency.",
        },
        {
          subtitle: "12.2 Platform Availability",
          body: "We strive for high availability but do not warrant that TalentBridge will be uninterrupted, error-free, or secure at all times. The platform is provided on an \"as is\" and \"as available\" basis.",
        },
        {
          subtitle: "12.3 Third-Party Services",
          body: "We are not responsible for the availability, accuracy, or conduct of third-party services integrated with TalentBridge, including Google services.",
        },
      ],
    },
    {
      title: "13. Limitation of Liability",
      content: [
        {
          subtitle: "",
          body: "To the fullest extent permitted by applicable law, TalentBridge and its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the platform, regardless of the cause of action or the theory of liability, even if we have been advised of the possibility of such damages.\n\nOur total liability to you for any claims arising from these Terms or your use of the platform shall not exceed the amount you paid us, if any, in the twelve months preceding the claim.",
        },
      ],
    },
    {
      title: "14. Changes to These Terms",
      content: [
        {
          subtitle: "",
          body: "We may update these Terms from time to time. We will notify you of significant changes by posting a notice on the platform or via email. Your continued use of TalentBridge after the effective date of changes constitutes acceptance of the updated Terms. If you do not agree with the revised Terms, you must stop using the platform.",
        },
      ],
    },
    {
      title: "15. Governing Law",
      content: [
        {
          subtitle: "",
          body: "These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Jaipur, Rajasthan, India.",
        },
      ],
    },
    {
      title: "16. Contact Us",
      content: [
        {
          subtitle: "",
          body: "If you have any questions about these Terms of Service, please contact us:\n\nEmail: console.committee@gmail.com\nPhone: +91 82009 15780\nAddress: Jaipur, Rajasthan, India",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <img
                  src={typeof logo === "string" ? logo : (logo as any).src}
                  alt="TalentBridge"
                  className="w-8 h-8"
                />
                <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
                  TalentBridge
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mb-5">
            <FileText className="w-7 h-7 text-gray-700 dark:text-gray-300" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Last updated: August 8, 2026</p>
          <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Please read these Terms carefully before using TalentBridge. They explain your rights
            and responsibilities when using our platform.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10">
          {sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                {section.title}
              </h2>
              <div className="space-y-5">
                {section.content.map((item, itemIdx) => (
                  <div key={itemIdx}>
                    {item.subtitle && (
                      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        {item.subtitle}
                      </h3>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>&copy; 2026 TalentBridge. All rights reserved.</span>
          <div className="flex gap-6">
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigate("/")}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
