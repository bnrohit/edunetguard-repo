import React from 'react';
import { Mail, Github, Shield } from 'lucide-react';

function Footer({
  schoolName,
  productName = 'EduNetGuard',
  contactEmail,
  repositoryUrl = 'https://github.com/bnrohit/edunetguard-repo',
}) {
  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-900 font-bold">
              <Shield className="w-4 h-4 text-primary" />
              {productName} Operations Platform
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {schoolName} · Infrastructure Visibility & Service Assurance
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Network · Wireless · Systems · Security · Continuity
            </p>
          </div>

          <div className="flex items-center gap-4">
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                Technology Operations
              </a>
            )}
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
            >
              <Github className="w-4 h-4" />
              Project Repository
            </a>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} {schoolName}</span>
          <span>EduNetGuard v0.2.1 · Operational monitoring interface</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
