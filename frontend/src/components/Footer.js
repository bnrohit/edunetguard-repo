import React from 'react';
import { Heart, Mail, Github, Shield } from 'lucide-react';

function Footer({
  schoolName,
  productName = 'EduNetGuard',
  contactEmail,
  repositoryUrl = 'https://github.com/bnrohit/edunetguard-repo',
}) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-900 font-bold">
              <Shield className="w-4 h-4 text-primary" />
              {productName}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {schoolName} · Educational Infrastructure Resilience
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Network · Wireless · Systems · Security · Continuity
            </p>
          </div>

          <div className="flex items-center gap-4">
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                Contact IT
              </a>
            )}
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
            >
              <Github className="w-4 h-4" />
              Open Source
            </a>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            Built with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> for reliable digital classrooms · v0.2
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
