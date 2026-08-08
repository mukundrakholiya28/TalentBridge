"use client";

import { useNavigate } from "@/lib/router-compat";
import { ArrowLeft, Shield } from "lucide-react";
import logo from "../../assets/logo.png";

export function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "1. Information We Collect",
      content: [
        {
          subtitle: "1.1 Information You Provide",
          body: "When you register, we collect your name, email address, password, phone number, and professional details such as work experience, education, skills, and resume content. Recruiters may also provide company name, description, and website information.",
        },
        {
          subtitle: "1.2 Information from Third-Party Sign-In",
          body: "If you sign in using Google OAuth, we collect your name, email address, and profile picture from Google. With your explicit consent, we also request access to your Google Calendar to enable interview and assessment scheduling.",
        },
        {
          subtitle: "1.3 Resume and Profile Data",
          body: "When you upload a resume, we parse and store its contents including work experience, education, skills, projects, and contact details. This data is used to match you with relevant opportunities and generate AI-powered evaluations.",
        },
        {
          subtitle: "1.4 Usage and Technical Data",
          body: "We automatically collect log data, IP address, browser type, device information, pages visited, and timestamps to improve the platform and troubleshoot issues.",
        },
        {
          subtitle: "1.5 Communications",
          body: "Messages exchanged between candidates and recruiters through our platform are stored to provide the messaging feature and maintain a communication history.",
        },
      ],
    },
    {
      title: "2. How We Use Your Information",
      content: [
        {
          subtitle: "2.1 Platform Functionality",
          body: "We use your information to operate TalentBridge, including creating and managing your account, matching candidates with jobs, processing applications, scheduling interviews, and facilitating offer management.",
        },
        {
          subtitle: "2.2 AI-Powered Features",
          body: "Your resume and profile data is used with our AI systems (powered by Google Gemini) to generate candidate evaluations, semantic job matching, resume analysis, and skill-based scoring.",
        },
        {
          subtitle: "2.3 Google Calendar Integration",
          body: "If you connect your Google Calendar, we use that access solely to create and manage calendar events for interviews and assessments you are involved in. We do not read, modify, or delete any of your existing calendar events.",
        },
        {
          subtitle: "2.4 Service Communications",
          body: "We send service-related notifications such as application status updates, interview invitations, assessment reminders, and offer letters. We will not send unsolicited marketing emails without your opt-in consent.",
        },
        {
          subtitle: "2.5 Security and Compliance",
          body: "We use your information to verify identities, detect fraud, enforce our Terms of Service, and comply with applicable legal obligations.",
        },
      ],
    },
    {
      title: "3. Information Sharing and Disclosure",
      content: [
        {
          subtitle: "3.1 Between Candidates and Recruiters",
          body: "When you apply for a job, your profile, resume, cover letter, and application materials are shared with the recruiter who posted that position.",
        },
        {
          subtitle: "3.2 Service Providers",
          body: "We share data with trusted third-party providers including Supabase (database), Google (AI and calendar), and Pusher (real-time messaging). These providers are contractually bound to protect your data and use it only as directed by us.",
        },
        {
          subtitle: "3.3 Legal Requirements",
          body: "We may disclose your information if required by law, court order, or governmental authority, or when necessary to protect rights, safety, or security.",
        },
        {
          subtitle: "3.4 No Sale of Personal Data",
          body: "We do not sell, rent, or trade your personal information to third parties for their marketing purposes.",
        },
      ],
    },
    {
      title: "4. Data Storage and Security",
      content: [
        {
          subtitle: "4.1 Storage",
          body: "Your data is stored in Supabase-managed PostgreSQL databases on secure cloud infrastructure.",
        },
        {
          subtitle: "4.2 Security Measures",
          body: "We implement industry-standard security practices including encrypted HTTPS/TLS transmission, bcrypt-hashed passwords, JWT-based authentication with expiry, and role-based access controls.",
        },
        {
          subtitle: "4.3 Retention",
          body: "We retain your data for as long as your account is active. You may request deletion at any time by contacting us. Some data may be retained for legal compliance after account deletion.",
        },
      ],
    },
    {
      title: "5. Your Rights and Choices",
      content: [
        {
          subtitle: "5.1 Access and Correction",
          body: "You may access and update your profile information at any time through your account settings.",
        },
        {
          subtitle: "5.2 Data Deletion",
          body: "You have the right to request deletion of your personal data. Deleting your account removes all your applications, messages, and offers.",
        },
        {
          subtitle: "5.3 Google Calendar Revocation",
          body: "You can revoke TalentBridge's calendar access at any time at myaccount.google.com/permissions. This disables calendar features but does not affect other functionality.",
        },
        {
          subtitle: "5.4 Cookies",
          body: "We use essential cookies and local storage for authentication. These are required for sign-in and cannot be disabled without impacting platform access.",
        },
      ],
    },
    {
      title: "6. Third-Party Services",
      content: [
        {
          subtitle: "6.1 Google Services",
          body: "TalentBridge integrates with Google OAuth and Google Calendar. Your use of these services is also governed by Google's Privacy Policy at policies.google.com/privacy.",
        },
        {
          subtitle: "6.2 AI Processing",
          body: "Resume and job data is processed by Google Gemini AI models to provide matching and evaluation features, governed by Google's data processing agreements.",
        },
        {
          subtitle: "6.3 External Links",
          body: "TalentBridge may contain links to external websites. We are not responsible for the privacy practices of those sites.",
        },
      ],
    },
    {
      title: "7. Children's Privacy",
      content: [
        {
          subtitle: "",
          body: "TalentBridge is intended for users 18 years of age or older. We do not knowingly collect personal information from anyone under 18. If we learn a minor has provided data, we will delete it promptly. Please contact us if you believe we have inadvertently collected information from a minor.",
        },
      ],
    },
    {
      title: "8. Changes to This Policy",
      content: [
        {
          subtitle: "",
          body: "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the platform or by email. Continued use of TalentBridge after changes take effect constitutes acceptance of the updated policy.",
        },
      ],
    },
    {
      title: "9. Contact Us",
      content: [
        {
          subtitle: "",
          body: "Questions about this Privacy Policy?\n\nEmail: console.committee@gmail.com\nPhone: +91 82009 15780\nAddress: Jaipur, Rajasthan, India",
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
                  alt="CONSOLE | TalentBridge"
                  className="w-8 h-8"
                />
                <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
                  CONSOLE | TalentBridge
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-5">
            <Shield className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Last updated: August 8, 2026</p>
          <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your privacy matters to us. This policy explains what data we collect, how we use it,
            and the choices you have — in plain language.
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
          <span>&copy; 2026 CONSOLE | TalentBridge. All rights reserved.</span>
          <div className="flex gap-6">
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms of Service
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
