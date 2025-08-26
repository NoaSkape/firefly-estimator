import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'
import { useState, useEffect } from 'react'

export default function Footer() {
  const year = new Date().getFullYear()
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = () => {
      if (user) {
        const adminStatus = canEditModelsClient(user)
        setIsAdmin(adminStatus)
      }
    }
    checkAdminStatus()
  }, [user])

  return (
    <footer className="border-t border-gray-800 bg-gray-900/60 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <section aria-labelledby="footer-company">
            <h3 id="footer-company" className="text-sm font-semibold text-gray-100">Firefly Tiny Homes</h3>
            <address className="not-italic mt-3 text-sm leading-relaxed">
              6150 TX-16, Pipe Creek, TX 78063
              <br/>
              Phone: <a className="underline-offset-2 hover:underline" href="tel:+18302412410" title="Call Firefly Tiny Homes">(830) 241-2410</a>
              <br/>
              Email: <a className="underline-offset-2 hover:underline" href="mailto:office@fireflytinyhomes.com">office@fireflytinyhomes.com</a>
            </address>
          </section>

          <nav aria-labelledby="footer-nav">
            <h3 id="footer-nav" className="text-sm font-semibold text-gray-100">Navigation</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a className="hover:text-white" href="/about">About Us</a></li>
              <li><a className="hover:text-white" href="#models">Models &amp; Options</a></li>
              <li><a className="hover:text-white" href="/checkout?mode=finance">Financing / Purchase Info</a></li>
              <li><a className="hover:text-white" href="#faq">FAQs</a></li>
              <li><a className="hover:text-white" href="mailto:office@fireflytinyhomes.com" title="Email Firefly Tiny Homes">Contact Us</a></li>
            </ul>
          </nav>

          <section aria-labelledby="footer-community">
            <h3 id="footer-community" className="text-sm font-semibold text-gray-100">Social</h3>
            <div className="mt-3 flex items-center gap-4">
              <a aria-label="Facebook" href="https://www.facebook.com/" target="_blank" rel="noreferrer" className="hover:text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.5l.5-4H14V7a1 1 0 0 1 1-1h3V2z"/></svg>
              </a>
              <a aria-label="Instagram" href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="hover:text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a aria-label="YouTube" href="https://www.youtube.com/" target="_blank" rel="noreferrer" className="hover:text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-300"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.7 3.5 12 3.5 12 3.5s-7.7 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.7.6 9.4.6 9.4.6s7.7 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.8.5-3.8.5-5.8s-.2-4-.5-5.8ZM9.6 15.5V8.5L15.8 12l-6.2 3.5Z"/></svg>
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-400">License and certifications available upon request.</p>
          </section>

          <section aria-labelledby="footer-legal">
            <h3 id="footer-legal" className="text-sm font-semibold text-gray-100">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a className="hover:text-white" href="/privacy-policy">Privacy Policy</a></li>
              <li><a className="hover:text-white" href="/terms-conditions">Terms &amp; Conditions</a></li>
              <li><a className="hover:text-white" href="/other-policies">Other Policies</a></li>
            </ul>
          </section>

          
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 text-xs text-gray-400 flex items-center justify-between gap-3 flex-wrap">
          <span>© {year} Firefly Tiny Homes. All Rights Reserved.</span>
          <span>Factory-direct dealership serving all of Texas.</span>
        </div>
      </div>
    </footer>
  )
}


