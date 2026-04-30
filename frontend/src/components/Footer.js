import React from 'react';
import { Heart, Mail, ExternalLink, Github } from 'lucide-react';

function Footer({ schoolName, contactEmail }) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} {schoolName}. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Powered by EduNetGuard &mdash; open source status monitoring for schools
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
              href="https://github.com/yourusername/edunetguard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="/admin"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Admin
            </a>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> for schools everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
